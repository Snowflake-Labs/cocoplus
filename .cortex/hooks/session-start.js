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
const { loadConfig, setFlag, initPilotSession } = require('./_v2-state.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SPAWN_QUEUE  = path.join(COCOPLUS_DIR, 'subagent-spawn-requests.jsonl');
const V2_QUEUE     = path.join(COCOPLUS_DIR, 'v2-runtime-requests.jsonl');
const STATUS_RANK = {
  idle: 0,
  running: 1,
  paused: 2,
  exited: 3,
  failed: 4,
  completed: 5,
  retired: 6,
};

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function normalizeStatus(value) {
  const status = String(value || '').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(STATUS_RANK, status)) return status;
  if (['complete', 'done', 'success', 'succeeded'].includes(status)) return 'completed';
  if (['error', 'errored', 'failure'].includes(status)) return 'failed';
  if (['stopped', 'timeout', 'timed_out', 'budget_exhausted'].includes(status)) return 'exited';
  if (['active', 'started', 'in_progress'].includes(status)) return 'running';
  return 'exited';
}

function moreTerminal(left, right) {
  const a = normalizeStatus(left);
  const b = normalizeStatus(right);
  return STATUS_RANK[b] > STATUS_RANK[a] ? b : a;
}

function healStatusFile(filePath, fallbackStatus, staleMs, now) {
  const state = readJsonFile(filePath, null);
  if (!state || typeof state !== 'object') return null;
  let status = normalizeStatus(state.status || fallbackStatus || 'idle');
  const updatedAt = Date.parse(state.updated_at || state.last_seen_at || state.started_at || 0);
  if (status === 'running' && updatedAt && now - updatedAt > staleMs) status = 'exited';
  if (state.status !== status) {
    state.previous_status = state.status || null;
    state.status = status;
    state.healed_at = new Date(now).toISOString();
    writeJsonFile(filePath, state);
  }
  return status;
}

function healSessionStatuses(config, ts) {
  const staleHours = Number(config.session && config.session.status_stale_hours) || 6;
  const staleMs = staleHours * 60 * 60 * 1000;
  const now = Date.now();
  const files = [
    path.join(COCOPLUS_DIR, 'pod-state.json'),
    path.join(COCOPLUS_DIR, 'session', 'status.json'),
    path.join(COCOPLUS_DIR, 'lifecycle', 'console-session.json'),
  ];
  const statuses = files
    .map((filePath) => healStatusFile(filePath, 'idle', staleMs, now))
    .filter(Boolean);
  if (!statuses.length) return;
  const terminal = statuses.reduce((acc, status) => moreTerminal(acc, status), 'idle');
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const state = readJsonFile(filePath, {});
    if (normalizeStatus(state.status) !== terminal) {
      state.previous_status = state.status || null;
      state.status = terminal;
      state.healed_at = ts;
      writeJsonFile(filePath, state);
    }
  }
  appendJsonLine(HOOK_LOG, { hook: 'session-start', action: 'status_healer_ran', status: terminal, ts });
}

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
  const config = loadConfig();
  healSessionStatuses(config, ts);

  if (config.cocopilot && config.cocopilot.auto_activate === true) {
    setFlag('cocopilot.on', true);
    initPilotSession('auto-activated at session start', sessionId);
    appendJsonLine(HOOK_LOG, { hook: 'session-start', action: 'pilot_auto_activated', session: sessionId, ts });
  }

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

  // 5. CocoTrace — Tier 2 async staleness advisory through the V2 runtime queue.
  appendJsonLine(V2_QUEUE, {
    skill: 'cocotrace/trace-check',
    requested_at: ts,
    session_id: sessionId,
    source: 'hook.session-start',
  });
  appendJsonLine(HOOK_LOG, { hook: 'session-start', action: 'trace_check_requested', session: sessionId, ts });
}

try {
  main();
} catch (err) {
  logError('session-start', err.message);
}
