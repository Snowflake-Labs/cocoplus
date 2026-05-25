#!/usr/bin/env node
/**
 * CocoPlus PreCompact hook — cross-platform (Node.js)
 * Fires before Coco compacts conversation context.
 * Features: flush memory buffer, update AGENTS.md hot layer, persist CocoFlow state.
 * This is the insurance policy against context loss during long sessions.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, atomicWrite, logError, readJsonString } = require('./_common.js');
const { updateAgentsMd, readActiveModes, readRecentDecisions } = require('./lib/agents-update.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts        = isoUtc();
  const sessionId = process.env.COCO_SESSION_ID || 'unknown';

  appendJsonLine(HOOK_LOG, { hook: 'pre-compact', ts });

  // Step 26.4: Evaluation block — check for active locks before compaction
  const sentinelLock   = path.join(COCOPLUS_DIR, 'sentinel', 'active-evaluation.lock');
  const wisdomLock     = path.join(COCOPLUS_DIR, 'wisdom', 'pending-write.lock');
  const flowStatePath  = path.join(COCOPLUS_DIR, 'flow-state.json');

  let blockReason = null;
  let releaseCondition = null;

  if (fs.existsSync(sentinelLock)) {
    blockReason      = 'CocoSentinel evaluation in progress';
    releaseCondition = 'Wait for $sentinel evaluation to complete (active-evaluation.lock removed)';
  } else if (fs.existsSync(wisdomLock)) {
    blockReason      = 'CocoWisdom write in progress';
    releaseCondition = 'wisdom-writer.js will remove the lock on completion';
  } else {
    try {
      const flowState = JSON.parse(fs.readFileSync(flowStatePath, 'utf8'));
      if (flowState.pipeline_active === true) {
        blockReason      = 'CocoFlow pipeline active';
        releaseCondition = 'Wait for current pipeline stage to complete or run $flow pause';
      }
    } catch (_) { /* flow-state.json may not exist */ }
  }

  if (blockReason) {
    process.stdout.write(JSON.stringify({
      action:            'BLOCK',
      reason:            blockReason,
      release_condition: releaseCondition,
    }) + '\n');
    appendJsonLine(path.join(COCOPLUS_DIR, 'ui-notifications.jsonl'), {
      event_type: 'compaction_blocked',
      message:    `Context compaction blocked: ${blockReason}. ${releaseCondition}.`,
      timestamp:  ts,
      source:     'hook.PreCompact',
    });
    appendJsonLine(HOOK_LOG, { hook: 'pre-compact', action: 'blocked', reason: blockReason, ts });
    process.exit(1);
  }

  // 1. Flush memory decision buffer before context is compacted
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'memory.on'))) {
    const bufferFile    = path.join(COCOPLUS_DIR, '.decision-buffer');
    const decisionsFile = path.join(COCOPLUS_DIR, 'memory', 'decisions.md');

    if (fs.existsSync(bufferFile)) {
      const buf = fs.readFileSync(bufferFile, 'utf8').trim();
      if (buf) {
        fs.appendFileSync(decisionsFile, `\n## Session ${sessionId} - ${ts}\n${buf}\n`);
        try { fs.unlinkSync(bufferFile); } catch (_) { }
        appendJsonLine(HOOK_LOG, { hook: 'pre-compact', action: 'memory_flushed', ts });
      }
    }
  }

  // 2. Update AGENTS.md hot layer — critical: Coco re-reads this after compaction
  const phase = readJsonString(path.join(COCOPLUS_DIR, 'lifecycle', 'meta.json'), 'current_phase') || 'unknown';
  try {
    updateAgentsMd(COCOPLUS_DIR, {
      phase,
      sessionId,
      ts,
      activeModes:     readActiveModes(COCOPLUS_DIR),
      recentDecisions: readRecentDecisions(COCOPLUS_DIR),
      event:           'pre-compact',
    });
    appendJsonLine(HOOK_LOG, { hook: 'pre-compact', action: 'agents_md_flushed', ts });
  } catch (err) {
    logError('pre-compact', `AGENTS.md update failed: ${err.message}`);
  }

  // 3. Persist CocoFlow stage state atomically
  const flowPath = path.join(COCOPLUS_DIR, 'flow.json');
  if (fs.existsSync(flowPath)) {
    try {
      // Re-write flow.json atomically (ensures no partial write from an interrupted previous write)
      const flowContent = fs.readFileSync(flowPath, 'utf8');
      JSON.parse(flowContent); // validate — only re-write if parseable
      atomicWrite(flowPath, flowContent);
      appendJsonLine(HOOK_LOG, { hook: 'pre-compact', action: 'flow_state_persisted', ts });
    } catch (_) { /* flow.json may not exist or be invalid — non-fatal */ }
  }
}

try {
  main();
} catch (err) {
  logError('pre-compact', err.message);
}
