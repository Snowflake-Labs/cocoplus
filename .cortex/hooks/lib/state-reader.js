'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_STATE = Object.freeze({
  active_stage_id: null,
  active_persona: null,
  session_id: null,
  phase: null,
});

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return {};
  }
}

function normalizeState(raw) {
  return {
    active_stage_id: raw.active_stage_id || null,
    active_persona: raw.active_persona || null,
    session_id: raw.session_id || null,
    phase: raw.phase || null,
  };
}

function readState(cocoplusDir = '.cocoplus') {
  const statePath = path.join(cocoplusDir, 'state.json');
  if (!fs.existsSync(statePath)) return { ...DEFAULT_STATE };
  return normalizeState(readJson(statePath));
}

module.exports = {
  readState,
};
