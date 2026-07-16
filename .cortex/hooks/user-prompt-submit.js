#!/usr/bin/env node
/**
 * CocoPlus UserPromptSubmit hook — cross-platform (Node.js)
 *
 * Stdin JSON format from Coco:
 *   { "message": "$de Review this SQL", "session_id": "sess-..." }
 *
 * Three-Tier Latency Contract (CocoScout):
 *   Tier 1 — Deterministic, no LLM, <50ms: persona routing, command passthrough,
 *             context-mode flag check. Runs inline, blocks the hook return.
 *   Tier 2 — Async, no hard deadline: CocoScout context injection (subagent,
 *             Haiku, target <5s). Spawned via fire-and-forget; hook returns immediately.
 *   Tier 3 — Batch/off-cycle: audit flush, dream promotion, grove reindex.
 *             Never runs in UserPromptSubmit — deferred to SessionEnd or cron.
 *
 * Tier 1 operations in this file: sections 1, 2, 3 (command passthrough,
 *   persona routing, context-mode overlay). All run before any I/O-bound work.
 * Tier 2 operations: CocoScout subagent spawn (fire-and-forget after Tier 1).
 * Tier 3: not present here — handled in session-end.js.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { isoUtc, appendJsonLine, logError, readStdinJson, readJsonString } = require('./_common.js');
const {
  checkpointForge,
  checkpointLeviathan,
  flagExists,
  initPilotSession,
  lifecyclePath,
  readJson,
  setFlag,
  writeJson,
} = require('./_v2-state.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SKILL_QUEUE  = path.join(COCOPLUS_DIR, 'skill-native-requests.jsonl');

/** Default persona shorthand map (overridden by .cocoplus/personas.json if present) */
const DEFAULT_PERSONAS = {
  '$de':  'data-engineer',
  '$ae':  'analytics-engineer',
  '$ds':  'data-scientist',
  '$da':  'data-analyst',
  '$bi':  'bi-analyst',
  '$dpm': 'data-product-manager',
  '$dst': 'data-steward',
  '$cdo': 'chief-data-officer',
};

function loadPersonaMap() {
  const personasPath = path.join(COCOPLUS_DIR, 'personas.json');
  try {
    return JSON.parse(fs.readFileSync(personasPath, 'utf8'));
  } catch (_) {
    return DEFAULT_PERSONAS;
  }
}

function spawnCocoScout(message, ts) {
  // Tier 2: fire-and-forget CocoScout subagent. Hook returns immediately; scout
  // completes async within its 5s budget and injects context via hook-log.
  const scoutScript = path.join('.cortex', 'scripts', 'cocoscout-invoke.js');
  if (!fs.existsSync(scoutScript)) return;
  execFile(process.execPath, [scoutScript, '--message', message.slice(0, 200)], {
    timeout: 6000,
    windowsHide: true,
  }, (err) => {
    if (err && err.killed) {
      appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'scout_timeout', ts });
    }
  });
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const tier1Start = Date.now();
  const ts         = isoUtc();
  const event      = readStdinJson();

  const message   = event.message   || process.env.COCO_USER_MESSAGE || '';
  const sessionId = event.session_id || process.env.COCO_SESSION_ID  || 'unknown';

  appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', ts });

  // --- Tier 1 start (deterministic, <50ms target) ---

  // 0. CocoPlus 2.0 mode commands and intercept priority.
  if (message === '$pilot on') {
    setFlag('cocopilot.on', true);
    initPilotSession(message, sessionId);
    appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'pilot_activated', tier: 1, ts });
    return;
  }
  if (message === '$pilot off') {
    setFlag('cocopilot.on', false);
    const pilotPath = lifecyclePath('pilot-session.json');
    const pilot = readJson(pilotPath, {});
    pilot.active = false;
    pilot.deactivated_at = ts;
    pilot.session_id = sessionId;
    writeJson(pilotPath, pilot);
    appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'pilot_deactivated', tier: 1, ts });
    return;
  }
  if (message.startsWith('$forge')) {
    const goalMode = message.startsWith('$forge goal ');
    const statusMode = message === '$forge status';
    const stopMode = message === '$forge stop';
    if (statusMode) {
      appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'forge_status_requested', tier: 1, ts });
      return;
    }
    if (stopMode) {
      setFlag('cocoforge.on', false);
      checkpointForge({ active: false, phase: 'gate', event_type: 'forge_stop_requested', message: 'Forge stop requested; stop after current phase.' });
      appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'forge_stop_requested', tier: 1, ts });
      return;
    }
    const goal = message.replace(/^\$forge\s+(goal\s+)?/, '').trim().replace(/^"|"$/g, '');
    if (goal) {
      setFlag('cocoforge.on', true);
      checkpointForge({
        active: true,
        mode: goalMode ? 'goal' : 'task',
        goal,
        iteration: 1,
        phase: 'plan',
        pilot_superseded: flagExists('cocopilot.on'),
        event_type: 'forge_started',
        message: `Forge started for goal: ${goal.slice(0, 160)}`,
      });
      appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'forge_started', tier: 1, mode: goalMode ? 'goal' : 'task', ts });
      return;
    }
  }
  if (message.startsWith('$leviathan')) {
    if (message === '$leviathan on') {
      setFlag('leviathan.on', true);
      checkpointLeviathan({ active: true, activated_at: ts, covenant_required: true });
      appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'leviathan_activation_requested', tier: 1, ts });
      return;
    }
    if (message === '$leviathan off') {
      setFlag('leviathan.on', false);
      checkpointLeviathan({ active: false, deactivated_at: ts });
      appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'leviathan_deactivated', tier: 1, ts });
      return;
    }
    if (message === '$leviathan learn') {
      checkpointLeviathan({ active: flagExists('leviathan.on'), ingestion_requested_at: ts });
      appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'leviathan_learn_requested', tier: 1, ts });
      return;
    }
  }

  // Forge Team Lead has priority over CocoPilot while active.
  if (flagExists('cocoforge.on')) {
    checkpointForge({
      phase: 'input',
      event_type: 'forge_input_observed',
      message: `Developer input recorded for forge context: ${message.slice(0, 160)}`,
    });
    appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'forge_team_lead_intercept', tier: 1, ts });
  } else if (flagExists('cocopilot.on')) {
    initPilotSession(message, sessionId);
    appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'pilot_intercept_observed', tier: 1, ts });
  }

  // 1. Command passthrough — do not intercept /commands
  if (message.startsWith('/')) {
    appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'command_passthrough', tier: 1, ts });
    return;
  }

  // 1b. CocoContract gate — Tier 1, <50ms: block $spec/$build/$ship without a
  // committed outcome contract / fresh e2e-or-reference evidence (Feature 44).
  const CONTRACT_COMMANDS = { '$spec': 'spec', '$build': 'build', '$ship': 'ship' };
  for (const [cmd, gateCommand] of Object.entries(CONTRACT_COMMANDS)) {
    if (message.startsWith(cmd + ' ') || message === cmd) {
      const fnArg = message.slice(cmd.length).trim().split(/\s+/)[0] || '';
      if (fnArg || gateCommand === 'ship') {
        appendJsonLine(SKILL_QUEUE, {
          skill: 'skill-native/contract-gate',
          command: gateCommand,
          function: fnArg || null,
          requested_at: ts,
          source: 'hook.user-prompt-submit',
        });
        appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'contract_gate_requested', tier: 1, command: gateCommand, function: fnArg, ts });
      }
      break;
    }
  }

  // 2. Persona routing — detect $ shorthand prefix
  const personaMap = loadPersonaMap();
  let routed = false;
  let routedPersona = null;
  for (const [shorthand, personaName] of Object.entries(personaMap)) {
    if (message.startsWith(shorthand + ' ') || message === shorthand) {
      const taskText = message.slice(shorthand.length).trim();
      appendJsonLine(HOOK_LOG, {
        hook: 'user-prompt-submit',
        action: 'persona_routed',
        tier: 1,
        shorthand,
        persona: personaName,
        task: taskText.slice(0, 100),
        ts,
      });
      // Register the routing in subagents.json for SubagentStop tracking
      const subagentsPath = path.join(COCOPLUS_DIR, 'subagents.json');
      let registry = {};
      try { registry = JSON.parse(fs.readFileSync(subagentsPath, 'utf8')); } catch (_) { }
      const agentKey = `persona-${personaName}-${Date.now()}`;
      registry[agentKey] = { type: 'persona', persona: personaName, started_at: ts, status: 'running' };
      try {
        fs.writeFileSync(subagentsPath, JSON.stringify(registry, null, 2));
      } catch (_) { /* non-fatal */ }
      routed = true;
      routedPersona = personaName;
      break;
    }
  }

  // 2b. CocoCupper auto-capture (Feature 8 enhancement) — fire-and-forget so
  // its <200ms budget never risks the surrounding Tier 1 <50ms SLA for the
  // rest of this hook. Silent: writes to auto-captured.json only, no output.
  appendJsonLine(SKILL_QUEUE, {
    skill: 'skill-native/cupper-capture',
    message: message.slice(0, 500),
    skill_context: routedPersona,
    requested_at: ts,
    source: 'hook.user-prompt-submit',
  });
  appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'cupper_capture_requested', tier: 1, ts });

  // 3. Context Mode overlay — prepend phase context to normal messages
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'context-mode.on'))) {
    let phase = 'unknown';
    const metaPath = path.join(COCOPLUS_DIR, 'lifecycle', 'meta.json');
    if (fs.existsSync(metaPath)) {
      phase = readJsonString(metaPath, 'current_phase') || 'unknown';
    }

    const modesDir = path.join(COCOPLUS_DIR, 'modes');
    let activeModes = '';
    try {
      activeModes = fs.readdirSync(modesDir)
        .filter(f => fs.statSync(path.join(modesDir, f)).isFile())
        .join(', ');
    } catch (_) { }

    appendJsonLine(HOOK_LOG, {
      hook: 'user-prompt-submit',
      action: 'context_prepended',
      tier: 1,
      phase,
      active_modes: activeModes,
      ts,
    });
  }

  const tier1Ms = Date.now() - tier1Start;
  if (tier1Ms > 50) {
    appendJsonLine(HOOK_LOG, {
      hook: 'user-prompt-submit',
      action: 'tier1_sla_breach',
      tier: 1,
      elapsed_ms: tier1Ms,
      ts,
    });
  }

  // --- Tier 2 start (async, fire-and-forget) ---
  // CocoScout context injection: spawned only for non-command, non-routed messages.
  if (!routed) {
    spawnCocoScout(message, ts);
  }
}

try {
  main();
} catch (err) {
  logError('user-prompt-submit', err.message);
}
