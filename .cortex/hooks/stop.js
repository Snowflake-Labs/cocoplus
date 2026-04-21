#!/usr/bin/env node
/**
 * CocoPlus Stop hook — cross-platform (Node.js)
 * Fires when the main Coco agent stops.
 * Responsibilities: schedule CocoCupper analysis, checkpoint CocoMeter.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { isoUtc, appendJsonLine, logError } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SPAWN_QUEUE  = path.join(COCOPLUS_DIR, 'subagent-spawn-requests.jsonl');

function queueAndAttemptBackgroundSpawn(request, ts) {
  appendJsonLine(SPAWN_QUEUE, request);
  appendJsonLine(HOOK_LOG, {
    hook: 'stop',
    action: 'background_spawn_queued',
    agent: request.agent,
    ts,
  });

  // Best-effort runtime trigger. If `coco` is unavailable in PATH, fallback queue remains.
  try {
    const child = spawn('coco', ['agent', 'run', request.agent, '--background'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', (err) => logError('stop', `background spawn failed: ${err.message}`));
    child.unref();
    appendJsonLine(HOOK_LOG, {
      hook: 'stop',
      action: 'background_spawn_attempted',
      agent: request.agent,
      ts,
    });
  } catch (err) {
    logError('stop', `background spawn setup failed: ${err.message}`);
  }
}

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

  queueAndAttemptBackgroundSpawn({
    source: 'hook.stop',
    requested_at: ts,
    session_id: sessionId,
    agent: 'coco-cupper',
    reason: 'session-stop',
  }, ts);
}

try {
  main();
} catch (err) {
  logError('stop', err.message);
}
