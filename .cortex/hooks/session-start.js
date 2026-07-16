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
const { spawn } = require('child_process');
const { isoUtc, appendJsonLine, atomicWrite, logError, readJsonString } = require('./_common.js');
<<<<<<< HEAD
=======
const { loadConfig, setFlag, initPilotSession } = require('./_v2-state.js');
>>>>>>> feature/cocoplus-v2.0.0

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SPAWN_QUEUE  = path.join(COCOPLUS_DIR, 'subagent-spawn-requests.jsonl');
<<<<<<< HEAD
=======
const V2_QUEUE     = path.join(COCOPLUS_DIR, 'v2-runtime-requests.jsonl');
>>>>>>> feature/cocoplus-v2.0.0

function queueAndAttemptBackgroundSpawn(request, ts) {
  appendJsonLine(SPAWN_QUEUE, request);
  appendJsonLine(HOOK_LOG, {
    hook: 'session-start',
    action: 'background_spawn_queued',
    agent: request.agent,
    ts,
  });

  try {
    const child = spawn('coco', ['agent', 'run', request.agent, '--background'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', (err) => logError('session-start', `background spawn failed: ${err.message}`));
    child.unref();
    appendJsonLine(HOOK_LOG, {
      hook: 'session-start',
      action: 'background_spawn_attempted',
      agent: request.agent,
      ts,
    });
  } catch (err) {
    logError('session-start', `background spawn setup failed: ${err.message}`);
  }
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts        = isoUtc();
  const sessionId = process.env.COCO_SESSION_ID || ('sess-' + new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '').replace('T', '-'));

  appendJsonLine(HOOK_LOG, { hook: 'session-start', session: sessionId, ts });
<<<<<<< HEAD
=======
  const config = loadConfig();

  if (config.cocopilot && config.cocopilot.auto_activate === true) {
    setFlag('cocopilot.on', true);
    initPilotSession('auto-activated at session start', sessionId);
    appendJsonLine(HOOK_LOG, { hook: 'session-start', action: 'pilot_auto_activated', session: sessionId, ts });
  }
>>>>>>> feature/cocoplus-v2.0.0

  // 1. Detect current lifecycle phase
  let phase = 'unknown';
  const metaPath = path.join(COCOPLUS_DIR, 'lifecycle', 'meta.json');
  if (fs.existsSync(metaPath)) {
    phase = readJsonString(metaPath, 'current_phase') || 'unknown';
  }

  // 2. Flag inspector trigger (non-blocking — skill handles actual inspection)
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'inspector.on'))) {
    appendJsonLine(HOOK_LOG, { hook: 'session-start', action: 'inspector_triggered', session: sessionId, ts });
    queueAndAttemptBackgroundSpawn({
      source: 'hook.session-start',
      requested_at: ts,
      session_id: sessionId,
      agent: 'environment-inspector',
      reason: 'session-start-inspector-on',
    }, ts);
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

<<<<<<< HEAD
  // 5. CocoTrace — Tier 2 async staleness advisory (Feature 41)
  // Fire-and-forget: spawn detaches immediately; hook return is never blocked.
  // Advisory is written to stderr by the child process if STALE artifacts detected.
  const traceScriptPath = 'scripts/trace-check.js';
  if (fs.existsSync(traceScriptPath) && fs.existsSync(COCOPLUS_DIR)) {
    try {
      const traceChild = spawn(process.execPath, [traceScriptPath], {
        stdio:    ['ignore', 'ignore', 'inherit'],
        detached: false,
      });
      traceChild.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          appendJsonLine(HOOK_LOG, { hook: 'session-start', action: 'trace_exit_nonzero', code, ts });
        }
      });
      traceChild.unref();
    } catch { /* non-fatal — trace advisory must never block session start */ }
  }
=======
  // 5. CocoTrace — Tier 2 async staleness advisory through the V2 runtime queue.
  appendJsonLine(V2_QUEUE, {
    skill: 'cocotrace/trace-check',
    requested_at: ts,
    session_id: sessionId,
    source: 'hook.session-start',
  });
  appendJsonLine(HOOK_LOG, { hook: 'session-start', action: 'trace_check_requested', session: sessionId, ts });
>>>>>>> feature/cocoplus-v2.0.0
}

try {
  main();
} catch (err) {
  logError('session-start', err.message);
}
