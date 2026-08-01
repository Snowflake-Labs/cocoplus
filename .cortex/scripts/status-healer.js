#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const COCOPLUS_DIR = process.argv[2] || '.cocoplus';
const TERMINAL_RANK = {
  idle: 0,
  running: 1,
  paused: 2,
  exited: 3,
  failed: 4,
  completed: 5,
  retired: 6,
};
const CANONICAL = new Set(Object.keys(TERMINAL_RANK));

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function normalizeStatus(value) {
  const status = String(value || '').toLowerCase();
  if (CANONICAL.has(status)) return status;
  if (['complete', 'done', 'success', 'succeeded'].includes(status)) return 'completed';
  if (['error', 'errored', 'failure'].includes(status)) return 'failed';
  if (['stopped', 'timeout', 'timed_out', 'budget_exhausted'].includes(status)) return 'exited';
  if (['active', 'started', 'in_progress'].includes(status)) return 'running';
  return 'exited';
}

function moreTerminal(left, right) {
  const a = normalizeStatus(left);
  const b = normalizeStatus(right);
  return (TERMINAL_RANK[b] > TERMINAL_RANK[a]) ? b : a;
}

function healFile(filePath, fallbackStatus, staleMs, now) {
  const state = readJson(filePath, null);
  if (!state || typeof state !== 'object') return null;
  let status = normalizeStatus(state.status || fallbackStatus || 'idle');
  const updatedAt = Date.parse(state.updated_at || state.last_seen_at || state.started_at || 0);
  if (status === 'running' && updatedAt && now - updatedAt > staleMs) {
    status = 'exited';
  }
  if (state.status !== status) {
    state.previous_status = state.status || null;
    state.status = status;
    state.healed_at = new Date(now).toISOString();
    writeJson(filePath, state);
  }
  return status;
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;
  const now = Date.now();
  const staleMs = Number(process.env.COCOPLUS_STATUS_STALE_MS) || 6 * 60 * 60 * 1000;
  const files = [
    path.join(COCOPLUS_DIR, 'pod-state.json'),
    path.join(COCOPLUS_DIR, 'session', 'status.json'),
    path.join(COCOPLUS_DIR, 'lifecycle', 'console-session.json'),
  ];
  const statuses = files
    .map((filePath) => healFile(filePath, 'idle', staleMs, now))
    .filter(Boolean);
  if (!statuses.length) return;
  const terminal = statuses.reduce((acc, status) => moreTerminal(acc, status), 'idle');
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const state = readJson(filePath, {});
    if (normalizeStatus(state.status) !== terminal) {
      state.previous_status = state.status || null;
      state.status = terminal;
      state.healed_at = new Date(now).toISOString();
      writeJson(filePath, state);
    }
  }
}

main();
