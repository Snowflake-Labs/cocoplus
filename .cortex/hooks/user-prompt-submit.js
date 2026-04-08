#!/usr/bin/env node
/**
 * CocoPlus UserPromptSubmit hook — cross-platform (Node.js)
 *
 * Stdin JSON format from Coco:
 *   { "message": "$de Review this SQL", "session_id": "sess-..." }
 *
 * Features:
 *   - Context Mode: prepend phase/mode summary to incoming message (≤100 tokens)
 *   - Persona routing: `$de`, `$ae`, etc. shorthand triggers from personas.json
 *   - Command passthrough: `/` prefixed messages are not intercepted
 */

'use strict';

const fs   = require('fs');
const path = require('path');
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

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts    = isoUtc();
  const event = readStdinJson();

  const message   = event.message   || process.env.COCO_USER_MESSAGE || '';
  const sessionId = event.session_id || process.env.COCO_SESSION_ID  || 'unknown';

  appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', ts });

  // 1. Command passthrough — do not intercept /commands
  if (message.startsWith('/')) {
    appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'command_passthrough', ts });
    return;
  }

  // 2. Persona routing — detect $ shorthand prefix
  const personaMap = loadPersonaMap();
  for (const [shorthand, personaName] of Object.entries(personaMap)) {
    if (message.startsWith(shorthand + ' ') || message === shorthand) {
      const taskText = message.slice(shorthand.length).trim();
      appendJsonLine(HOOK_LOG, {
        hook: 'user-prompt-submit',
        action: 'persona_routed',
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
      return;
    }
  }

  // 3. Context Mode overlay — prepend phase context to normal messages
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'context-mode.on'))) {
    let phase = 'unknown';
    const metaPath = path.join(COCOPLUS_DIR, 'lifecycle', 'meta.json');
    if (fs.existsSync(metaPath)) {
      phase = readJsonString(metaPath, 'current_phase') || 'unknown';
    }

    // Read active modes for context summary
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
      phase,
      active_modes: activeModes,
      ts,
    });
  }
}

try {
  main();
} catch (err) {
  logError('user-prompt-submit', err.message);
}
