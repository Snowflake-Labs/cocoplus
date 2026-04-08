#!/usr/bin/env node
/**
 * CocoPlus Stop hook — cross-platform (Node.js)
 * Fires when the main Coco agent stops.
 * Responsibilities: schedule CocoCupper analysis, checkpoint CocoMeter.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, logError } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts        = isoUtc();
  const sessionId = process.env.COCO_SESSION_ID || 'unknown';

  appendJsonLine(HOOK_LOG, { hook: 'stop', session: sessionId, ts, action: 'cupper_triggered' });

  // Checkpoint CocoMeter: record a mid-session stop event in history
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocometer.on'))) {
    const meterFile   = path.join(COCOPLUS_DIR, 'meter', 'current-session.json');
    const historyFile = path.join(COCOPLUS_DIR, 'meter', 'history.jsonl');
    if (fs.existsSync(meterFile)) {
      appendJsonLine(historyFile, { session_id: sessionId, stopped_at: ts, source: 'stop-hook' });
    }
  }

  // Signal CocoCupper is scheduled (actual invocation via Coco's native subagent trigger)
  appendJsonLine(HOOK_LOG, { hook: 'stop', cupper: 'scheduled', session: sessionId, ts });
}

try {
  main();
} catch (err) {
  logError('stop', err.message);
}
