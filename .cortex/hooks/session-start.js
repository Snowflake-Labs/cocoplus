#!/usr/bin/env node
/**
 * CocoPlus SessionStart hook — cross-platform (Node.js)
 * Fires when Coco starts a session.
 * Responsibilities: detect CocoPod, log session start, trigger inspector flag,
 * load warm memory count, initialize CocoMeter if enabled.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, atomicWrite, logError, readJsonString } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts        = isoUtc();
  const sessionId = process.env.COCO_SESSION_ID || ('sess-' + new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '').replace('T', '-'));

  appendJsonLine(HOOK_LOG, { hook: 'session-start', session: sessionId, ts });

  // 1. Detect current lifecycle phase
  let phase = 'unknown';
  const metaPath = path.join(COCOPLUS_DIR, 'lifecycle', 'meta.json');
  if (fs.existsSync(metaPath)) {
    phase = readJsonString(metaPath, 'current_phase') || 'unknown';
  }

  // 2. Flag inspector trigger (non-blocking — skill handles actual inspection)
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'inspector.on'))) {
    appendJsonLine(HOOK_LOG, { hook: 'session-start', action: 'inspector_triggered', session: sessionId, ts });
  }

  // 3. Log warm memory count if memory is enabled
  const decisionsPath = path.join(COCOPLUS_DIR, 'memory', 'decisions.md');
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'memory.on')) && fs.existsSync(decisionsPath)) {
    const content = fs.readFileSync(decisionsPath, 'utf8');
    const count   = (content.match(/^##/gm) || []).length;
    appendJsonLine(HOOK_LOG, { hook: 'session-start', action: 'memory_loaded', decisions: count, ts });
  }

  // 4. Initialize CocoMeter session if enabled
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocometer.on'))) {
    const meterFile = path.join(COCOPLUS_DIR, 'meter', 'current-session.json');
    atomicWrite(meterFile, JSON.stringify({
      session_id:       sessionId,
      started_at:       ts,
      phase:            phase,
      tools_called:     0,
      tokens_consumed:  0,
      sql_statements:   0,
      writes_performed: 0,
    }, null, 2));
  }
}

try {
  main();
} catch (err) {
  logError('session-start', err.message);
}
