#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const COCOPLUS_DIR = '.cocoplus';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function isoUtc() {
  return new Date().toISOString();
}

function lifecyclePath(fileName) {
  return path.join(COCOPLUS_DIR, 'lifecycle', fileName);
}

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function appendJsonLine(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

function flagExists(flagName) {
  return fs.existsSync(path.join(COCOPLUS_DIR, 'modes', flagName));
}

function modePath(flagName) {
  return path.join(COCOPLUS_DIR, 'modes', flagName);
}

function setFlag(flagName, enabled) {
  const filePath = modePath(flagName);
  ensureDir(path.dirname(filePath));
  if (enabled) {
    fs.writeFileSync(filePath, '', 'utf8');
  } else if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function loadConfig() {
  const tomlPath = path.join(COCOPLUS_DIR, 'cocoplus.toml');
  const config = {};
  if (!fs.existsSync(tomlPath)) return config;
  let section = null;
  for (const rawLine of fs.readFileSync(tomlPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      if (!config[section]) config[section] = {};
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (kv && section) {
      const rawValue = kv[2].trim();
      let value = rawValue.replace(/^"|"$/g, '');
      if (rawValue === 'true') value = true;
      else if (rawValue === 'false') value = false;
      else if (/^\d+$/.test(rawValue)) value = Number(rawValue);
      config[section][kv[1]] = value;
    }
  }
  return config;
}

function initPilotSession(message, sessionId) {
  const now = isoUtc();
  const filePath = lifecyclePath('pilot-session.json');
  const state = readJson(filePath, {
    active: true,
    activated_at: now,
    session_id: sessionId || 'unknown',
    suggestions: [],
    routed_inputs: [],
    silent_actions: [],
  });
  state.active = true;
  state.last_seen_at = now;
  if (message) {
    state.routed_inputs.push({ ts: now, message: String(message).slice(0, 300), mode: 'observed' });
  }
  writeJson(filePath, state);
  return state;
}

function checkpointForge(update) {
  const now = isoUtc();
  const filePath = lifecyclePath('forge-state.json');
  const state = readJson(filePath, {
    active: false,
    mode: null,
    goal: null,
    iteration: 0,
    phase: 'idle',
    quality_score_trend: [],
    team: [],
    history: [],
  });
  Object.assign(state, update, { updated_at: now });
  writeJson(filePath, state);
  appendJsonLine(lifecyclePath('forge-activity.jsonl'), {
    ts: now,
    event_type: update.event_type || 'forge_checkpoint',
    phase: state.phase,
    message: update.message || 'Forge state checkpointed.',
  });
  return state;
}

function checkpointLeviathan(update) {
  const now = isoUtc();
  const filePath = lifecyclePath('leviathan-state.json');
  const state = readJson(filePath, {
    active: false,
    ronin_voice: 'calibrating',
    history_context: { ingested: false, sessions: 0, patterns: 0 },
    hard_stops: [],
  });
  Object.assign(state, update, { updated_at: now });
  writeJson(filePath, state);
  return state;
}

module.exports = {
  COCOPLUS_DIR,
  appendJsonLine,
  checkpointForge,
  checkpointLeviathan,
  ensureDir,
  flagExists,
  initPilotSession,
  isoUtc,
  lifecyclePath,
  loadConfig,
  readJson,
  setFlag,
  writeJson,
};

