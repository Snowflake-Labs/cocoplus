#!/usr/bin/env node
/**
 * CocoPlus Stop hook — cross-platform (Node.js)
 * Fires when the main Coco agent stops.
 * Responsibilities: schedule CocoCupper analysis, checkpoint CocoMeter.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { isoUtc, appendJsonLine, logError } = require('./_common.js');
const {
  checkpointForge,
  checkpointLeviathan,
  flagExists,
  lifecyclePath,
  readJson,
  writeJson,
} = require('../scripts/v2-state.js');

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

  // CocoPlus 2.0: checkpoint active autonomous modes.
  if (flagExists('cocopilot.on')) {
    const pilotPath = lifecyclePath('pilot-session.json');
    const pilot = readJson(pilotPath, {});
    pilot.last_checkpoint_at = ts;
    pilot.session_id = sessionId;
    writeJson(pilotPath, pilot);
    appendJsonLine(HOOK_LOG, { hook: 'stop', action: 'pilot_checkpointed', session: sessionId, ts });
  }

  if (flagExists('cocoforge.on')) {
    checkpointForge({
      active: true,
      phase: 'checkpoint',
      event_type: 'forge_session_checkpoint',
      message: 'Session ended with forge active; state checkpointed for resume.',
    });
    appendJsonLine(HOOK_LOG, { hook: 'stop', action: 'forge_checkpointed', session: sessionId, ts });
  }

  if (flagExists('leviathan.on')) {
    checkpointLeviathan({
      active: true,
      last_session_checkpoint_at: ts,
      context_snapshot: {
        session_id: sessionId,
        active_forge: flagExists('cocoforge.on'),
        active_pilot: flagExists('cocopilot.on'),
      },
    });
    appendJsonLine(HOOK_LOG, { hook: 'stop', action: 'leviathan_snapshot_checkpointed', session: sessionId, ts });
  }

  // CocoRecall Dream Cycle cadence: record a maintenance request once per 24h.
  const lastConsolidationPath = path.join(COCOPLUS_DIR, '.last-consolidation');
  let shouldConsolidate = true;
  try {
    const last = Number(fs.readFileSync(lastConsolidationPath, 'utf8'));
    shouldConsolidate = Number.isNaN(last) || (Date.now() - last) > 24 * 60 * 60 * 1000;
  } catch (_) { /* absent => consolidate */ }
  if (shouldConsolidate) {
    fs.writeFileSync(lastConsolidationPath, String(Date.now()), 'utf8');
    appendJsonLine(lifecyclePath('consolidation-log.json'), {
      ts,
      session_id: sessionId,
      phases: ['orient', 'gather_signal', 'consolidate', 'prune_and_index'],
      status: 'requested',
      trigger: 'stop-hook-24h-cadence',
    });
    appendJsonLine(HOOK_LOG, { hook: 'stop', action: 'recall_dream_cycle_requested', session: sessionId, ts });
  }

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

  const pivotRequested = fs.existsSync(path.join(COCOPLUS_DIR, 'pivot-run-requested'));
  let convergePending = false;
  try {
    const flow = JSON.parse(fs.readFileSync(path.join(COCOPLUS_DIR, 'flow.json'), 'utf8'));
    convergePending = (flow.stages || []).some(stage =>
      (stage.type === 'converge' || stage.converge) &&
      (stage.handler === 'cococonverge' || (stage.converge && stage.converge.handler === 'cococonverge')) &&
      !['completed', 'skipped'].includes(String(stage.status || '').toLowerCase())
    );
  } catch (_) { /* no flow */ }

  if (pivotRequested || convergePending) {
    const pivotScript = path.join('scripts', 'pivot-merge.js');
    if (fs.existsSync(pivotScript)) {
      const child = execFile(process.execPath, [pivotScript], { windowsHide: true }, (err) => {
        if (err) logError('stop', `pivot-merge failed: ${err.message}`);
        else appendJsonLine(path.join(COCOPLUS_DIR, 'ui-notifications.jsonl'), {
          event_type: 'pivot_findings_ready',
          message: 'CocoPivot convergence complete. Findings written to .cocoplus/lifecycle/FINDINGS.md',
          timestamp: isoUtc(),
          source: 'hook.Stop',
        });
      });
      child.on('error', (err) => logError('stop', `pivot-merge spawn failed: ${err.message}`));
      appendJsonLine(HOOK_LOG, { hook: 'stop', action: 'pivot_merge_triggered', reason: pivotRequested ? 'pivot-requested' : 'converge-pending', ts });
      try { fs.unlinkSync(path.join(COCOPLUS_DIR, 'pivot-run-requested')); } catch (_) { /* absent */ }
    }
  }
}

try {
  main();
} catch (err) {
  logError('stop', err.message);
}
