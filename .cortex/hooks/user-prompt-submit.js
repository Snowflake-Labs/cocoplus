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
const { execFile, execFileSync } = require('child_process');
const { isoUtc, appendJsonLine, logError, readStdinJson, readJsonString } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

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
      if (fnArg) {
        const gateScript = path.join('scripts', 'contract-gate.js');
        if (fs.existsSync(gateScript)) {
          try {
            const out = execFileSync(process.execPath, [gateScript, '--command', gateCommand, '--function', fnArg], { encoding: 'utf8', timeout: 2000 });
            const result = JSON.parse(out);
            if (result.action === 'BLOCK') {
              appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'contract_gate_blocked', tier: 1, command: gateCommand, function: fnArg, reason: result.reason, ts });
              console.error(result.reason);
              process.exit(1);
            }
          } catch (err) {
            // Gate failing to run is non-fatal — CocoContract is advisory-safe,
            // never a hard dependency for the hook itself to stay alive.
            logError('user-prompt-submit', `contract-gate failed: ${err.message}`);
          }
        }
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
  const cupperScript = path.join('scripts', 'cupper-capture.js');
  if (fs.existsSync(cupperScript)) {
    const skillContext = routedPersona;
    const cupperArgs = [cupperScript, '--message', message.slice(0, 500)];
    if (skillContext) cupperArgs.push('--skill-context', skillContext);
    execFile(process.execPath, cupperArgs, { timeout: 200, windowsHide: true }, (err) => {
      if (err && err.killed) {
        appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'cupper_capture_timeout', ts });
      }
    });
  }

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
