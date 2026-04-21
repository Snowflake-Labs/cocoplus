#!/usr/bin/env node
/**
 * CocoPlus SessionEnd hook — cross-platform (Node.js)
 * Features: finalize CocoMeter, flush memory buffer, update AGENTS.md hot layer.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, logError, readJsonString, readJsonNumber } = require('./_common.js');
const { updateAgentsMd, readActiveModes, readRecentDecisions } = require('./lib/agents-update.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts        = isoUtc();
  const sessionId = process.env.COCO_SESSION_ID || 'unknown';

  appendJsonLine(HOOK_LOG, { hook: 'session-end', session: sessionId, ts });

  // 1. Finalize CocoMeter
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocometer.on'))) {
    const meterFile   = path.join(COCOPLUS_DIR, 'meter', 'current-session.json');
    const historyFile = path.join(COCOPLUS_DIR, 'meter', 'history.jsonl');

    if (fs.existsSync(meterFile)) {
      const startedAt = readJsonString(meterFile, 'started_at');
      const phase     = readJsonString(meterFile, 'phase');
      const tools     = readJsonNumber(meterFile, 'tools_called');
      const tokens    = readJsonNumber(meterFile, 'tokens_consumed');
      const sql       = readJsonNumber(meterFile, 'sql_statements');
      const writes    = readJsonNumber(meterFile, 'writes_performed');

      // Calculate duration in seconds
      let durationSeconds = 0;
      if (startedAt) {
        try { durationSeconds = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000); } catch (_) { }
      }

      const record = {
        session_id: sessionId, started_at: startedAt, ended_at: ts,
        duration_seconds: durationSeconds,
        phase, tools_called: tools, tokens_consumed: tokens,
        sql_statements: sql, writes_performed: writes,
      };

      // Deduplicate before appending
      let alreadyLogged = false;
      if (fs.existsSync(historyFile)) {
        const lines = fs.readFileSync(historyFile, 'utf8').split('\n').filter(Boolean);
        alreadyLogged = lines.some(l => {
          try { return JSON.parse(l).session_id === sessionId; } catch (_) { return false; }
        });
      }
      if (!alreadyLogged) appendJsonLine(historyFile, record);
      try { fs.unlinkSync(meterFile); } catch (_) { }

      appendJsonLine(HOOK_LOG, { hook: 'session-end', action: 'meter_finalized', session: sessionId, ts });
    }
  }

  // 2. Flush memory decision buffer
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'memory.on'))) {
    const bufferFile    = path.join(COCOPLUS_DIR, '.decision-buffer');
    const decisionsFile = path.join(COCOPLUS_DIR, 'memory', 'decisions.md');
    if (fs.existsSync(bufferFile)) {
      const buf = fs.readFileSync(bufferFile, 'utf8').trim();
      if (buf) {
        fs.appendFileSync(decisionsFile, `\n## Session ${sessionId} - ${ts}\n${buf}\n`);
        try { fs.unlinkSync(bufferFile); } catch (_) { }
        appendJsonLine(HOOK_LOG, { hook: 'session-end', action: 'memory_flushed', session: sessionId, ts });
      }
    }
  }

  // 3. Update .cocoplus/AGENTS.md hot layer (with 200-line enforcement)
  const phase = readJsonString(path.join(COCOPLUS_DIR, 'lifecycle', 'meta.json'), 'current_phase') || 'unknown';
  try {
    updateAgentsMd(COCOPLUS_DIR, {
      phase,
      sessionId,
      ts,
      activeModes:     readActiveModes(COCOPLUS_DIR),
      recentDecisions: readRecentDecisions(COCOPLUS_DIR),
      event:           'session-end',
    });
  } catch (err) {
    logError('session-end', `AGENTS.md update failed: ${err.message}`);
  }
}

try {
  main();
} catch (err) {
  logError('session-end', err.message);
}
