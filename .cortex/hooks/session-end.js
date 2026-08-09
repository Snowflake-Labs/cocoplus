#!/usr/bin/env node
/**
 * CocoPlus SessionEnd hook — cross-platform (Node.js)
 * Features: finalize CocoMeter, flush memory buffer, update AGENTS.md hot layer.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, stableQueueKey, logError, readJsonString, readJsonNumber, readStdinJson } = require('./_common.js');
const { updateAgentsMd, readActiveModes, readRecentDecisions } = require('./lib/agents-update.js');
const { loadConfig } = require('./_v2-state.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const V2_QUEUE     = path.join(COCOPLUS_DIR, 'v2-runtime-requests.jsonl');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function reconcileMeterIfAvailable(config, sessionId, meterFile, ts, event) {
  const meterConfig = config.meter || {};
  const enabled = meterConfig.meter_reconciliation_enabled === undefined ||
    meterConfig.meter_reconciliation_enabled === true ||
    meterConfig.meter_reconciliation_enabled === 'true';
  if (!enabled) return null;

  const transcriptPath = event.transcript_path || event.transcriptPath ||
    process.env.COCO_TRANSCRIPT_PATH || process.env.CLAUDE_TRANSCRIPT_PATH || '';
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;

  const outPath = path.join(COCOPLUS_DIR, 'meter', `reconciliation-${sessionId}.json`);
  try {
    appendJsonLine(V2_QUEUE, {
      skill: 'cocometer/meter-reconcile',
      operation: 'reconcile',
      idempotency_key: stableQueueKey('cocometer/meter-reconcile', [sessionId, transcriptPath, meterFile, outPath]),
      requested_at: ts,
      source: 'hook.session-end',
      session_id: sessionId,
      transcript_path: transcriptPath,
      session_file: meterFile,
      out: outPath,
      threshold: meterConfig.meter_reconciliation_threshold === undefined ? 0.05 : meterConfig.meter_reconciliation_threshold,
    });
    appendJsonLine(HOOK_LOG, {
      hook: 'session-end',
      action: 'meter_reconciliation_requested',
      session: sessionId,
      ts,
    });
  } catch (err) {
    logError('session-end', `meter reconciliation request failed: ${err.message}`);
  }

  return readJson(outPath, null);
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts        = isoUtc();
  const event     = readStdinJson();
  const sessionId = process.env.COCO_SESSION_ID || 'unknown';
  const config    = loadConfig();

  appendJsonLine(HOOK_LOG, { hook: 'session-end', session: sessionId, ts });

  // 1. Finalize CocoMeter — capture data before deletion for use in step 3
  let meterStartedAt = null;
  let meterToolsCalled = 0;
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
      const reconciliation = reconcileMeterIfAvailable(config, sessionId, meterFile, ts, event);
      const authoritativeTokens = reconciliation && Number(reconciliation.authoritative_tokens) ||
        reconciliation && Number(reconciliation.transcript_derived_tokens) ||
        tokens;

      // Capture for step 3 before file is deleted
      meterStartedAt   = startedAt;
      meterToolsCalled = tools;

      // Calculate duration in seconds
      let durationSeconds = 0;
      if (startedAt) {
        try { durationSeconds = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000); } catch (_) { }
      }

      const record = {
        session_id: sessionId, started_at: startedAt, ended_at: ts,
        duration_seconds: durationSeconds,
        phase, tools_called: tools, tokens_consumed: authoritativeTokens,
        sql_statements: sql, writes_performed: writes,
        reconciliation_status: reconciliation && reconciliation.reconciliation_status || 'not_run',
        metering_gap_fraction: reconciliation && reconciliation.gap_fraction || 0,
        model_tier_configured: reconciliation && reconciliation.model_tier_configured || null,
        model_tier_actual: reconciliation && reconciliation.model_tier_actual || null,
        model_drift: Boolean(reconciliation && reconciliation.model_drift),
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

  // 3. CocoPull session indexer — use meter data captured in step 1 (file may be deleted by now)
  try {
    const startedAtMs = meterStartedAt ? new Date(meterStartedAt).getTime() : Date.now();
    const durationMinutes = Math.max(0, Math.round((Date.now() - startedAtMs) / 60000));
    const sessionRecord = JSON.stringify({
      session_id: sessionId,
      timestamp: ts,
      duration_minutes: durationMinutes,
      turn_count: meterToolsCalled,
      archetype: 'exploration',
      summary: '',
      features_used: [],
    });
    appendJsonLine(V2_QUEUE, {
      skill: 'cocopull/session-indexer',
      operation: 'append',
      idempotency_key: stableQueueKey('cocopull/session-indexer', [sessionRecord.session_id, sessionRecord.started_at, sessionRecord.ended_at]),
      session_record: sessionRecord,
      requested_at: ts,
      source: 'hook.session-end',
    });
    appendJsonLine(HOOK_LOG, { hook: 'session-end', action: 'session_index_requested', session: sessionId, ts });
  } catch (_) { /* non-fatal */ }

  // 3b. CocoAudit — commit audit.md if enabled (Feature 40)
  try {
    const auditOnPath = path.join(COCOPLUS_DIR, 'modes', 'cocoaudit.on');
    const auditPath   = path.join(COCOPLUS_DIR, 'lifecycle', 'audit.md');
    if (fs.existsSync(auditOnPath) && fs.existsSync(auditPath)) {
      const auditTs = ts.replace(/[:.]/g, '-').slice(0, 19) + 'Z';
      const { execSync } = require('child_process');
      try {
        execSync(`git add "${auditPath.replace(/\\/g, '/')}"`, { stdio: 'pipe' });
        execSync(`git diff --quiet --staged -- "${auditPath.replace(/\\/g, '/')}" || git commit -m "chore(cocoaudit): append session audit record ${auditTs}"`, { stdio: 'pipe' });
        appendJsonLine(HOOK_LOG, { hook: 'session-end', action: 'audit_committed', ts });
      } catch (_) { /* non-fatal — git may not be available or no changes */ }
    }
  } catch (_) { /* non-fatal */ }

  // 4a. CocoRecall — Tier 2 async index update (Feature 46). Fire-and-forget;
  // failure here (including an old Node runtime lacking node:sqlite) must
  // never block session end.
  try {
    appendJsonLine(V2_QUEUE, {
      skill: 'cocorecall/recall-import',
      operation: 'import',
      idempotency_key: stableQueueKey('cocorecall/recall-import', [sessionId, meterStartedAt || ts]),
      since: meterStartedAt || ts,
      requested_at: ts,
      source: 'hook.session-end',
    });
    appendJsonLine(HOOK_LOG, { hook: 'session-end', action: 'recall_import_requested', ts });
  } catch (err) {
    logError('session-end', `recall-import request failed: ${err.message}`);
  }

  // 4. Update .cocoplus/AGENTS.md hot layer (with 200-line enforcement)
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
