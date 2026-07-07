#!/usr/bin/env node
/**
 * CocoPlus SubagentStop hook — cross-platform (Node.js)
 *
 * Stdin JSON format from Coco:
 *   { "subagent_id": "cupper-session-abc", "status": "completed", "worktree_branch": "..." }
 *
 * Features: CocoCupper findings notification, CocoHarvest persona integration,
 *           pipeline stage status update, subagent registry maintenance.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { isoUtc, appendJsonLine, logError, readStdinJson } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SPAWN_QUEUE  = path.join(COCOPLUS_DIR, 'subagent-spawn-requests.jsonl');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function atomicWriteJson(filePath, value) {
  const tmp = filePath + '.tmp.' + process.pid;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, filePath);
}

function queueAndAttemptBackgroundSpawn(request, ts) {
  appendJsonLine(SPAWN_QUEUE, request);
  appendJsonLine(HOOK_LOG, {
    hook: 'subagent-stop',
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
    child.on('error', (err) => logError('subagent-stop', `background spawn failed: ${err.message}`));
    child.unref();
    appendJsonLine(HOOK_LOG, {
      hook: 'subagent-stop',
      action: 'background_spawn_attempted',
      agent: request.agent,
      ts,
    });
  } catch (err) {
    logError('subagent-stop', `background spawn setup failed: ${err.message}`);
  }
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts    = isoUtc();
  const event = readStdinJson();

  const subagentId   = event.subagent_id     || process.env.COCO_SUBAGENT_ID   || 'unknown';
  const status       = event.status          || 'unknown';
  const worktreeBranch = event.worktree_branch || '';

  appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', subagent_id: subagentId, status, ts });

  // 0. CocoPivot status envelope validation (Feature 47, Tier 1, <200ms) —
  // runs for every subagent completion, independent of type. Never blocks:
  // a malformed envelope is logged as a quality warning, not a hard failure.
  if (event.status_envelope || event.output_path || event.output || event.artifact) {
    try {
      const envelopeScript = path.join('scripts', 'status-envelope-check.js');
      if (fs.existsSync(envelopeScript)) {
        const envelopeArgs = [envelopeScript];
        if (event.status_envelope) envelopeArgs.push('--envelope', JSON.stringify(event.status_envelope));
        else if (event.output_path || event.artifact) envelopeArgs.push('--output-file', event.output_path || event.artifact);
        else envelopeArgs.push('--output', String(event.output || ''));
        execFileSync(process.execPath, envelopeArgs, {
          timeout: 2000, windowsHide: true,
        });
      }
    } catch (err) {
      logError('subagent-stop', `status-envelope-check failed: ${err.message}`);
    }
  }

  // 1. Identify subagent type by ID prefix
  const isCupper    = subagentId.startsWith('cupper-');
  const isPersona   = subagentId.startsWith('persona-');
  const isInspector = subagentId.startsWith('inspector-');
  const isQuality   = subagentId.startsWith('quality-');
  const isKlatchParticipant = subagentId.startsWith('klatch-participant-');
  const isKlatchSynthesis = subagentId.startsWith('klatch-synthesis-');
  const isPull = subagentId.startsWith('pull-');

  // 2. Update subagent registry
  const subagentsPath = path.join(COCOPLUS_DIR, 'subagents.json');
  let registry = {};
  try { registry = JSON.parse(fs.readFileSync(subagentsPath, 'utf8')); } catch (_) { }
  if (registry[subagentId]) {
    registry[subagentId].status       = status;
    registry[subagentId].completed_at = ts;
    if (worktreeBranch) registry[subagentId].worktree_branch = worktreeBranch;
  }
  try { fs.writeFileSync(subagentsPath, JSON.stringify(registry, null, 2)); } catch (_) { }

  // 3. CocoCupper completion
  if (isCupper) {
    if (status === 'completed') {
      const findingsPath = path.join(COCOPLUS_DIR, 'grove', 'cupper-findings.md');
      const hasFinding = fs.existsSync(findingsPath);
      appendJsonLine(HOOK_LOG, {
        hook: 'subagent-stop', type: 'cupper', status, findings_ready: hasFinding, ts,
      });
      // Raise notification event
      appendJsonLine(path.join(COCOPLUS_DIR, 'ui-notifications.jsonl'), {
        event_type: 'cupper_findings_ready',
        message:    'CocoCupper analysis complete. Findings in .cocoplus/grove/cupper-findings.md',
        timestamp:  ts,
        source:     'hook.SubagentStop',
      });
    } else {
      appendJsonLine(path.join(COCOPLUS_DIR, 'hook-errors.log'), {
        ts, hook: 'subagent-stop', error: `CocoCupper failed: ${subagentId}`,
      });
      appendJsonLine(path.join(COCOPLUS_DIR, 'ui-notifications.jsonl'), {
        event_type: 'cupper_failed',
        message:    `CocoCupper encountered an error (${subagentId})`,
        timestamp:  ts,
        source:     'hook.SubagentStop',
      });
    }
    return;
  }

  // 4. CocoHarvest persona completion
  if (isPersona) {
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'persona', subagent: subagentId, status, worktree_branch: worktreeBranch, ts });

    // Update flow.json stage status if this persona was tied to a CocoFlow stage
    const flowPath = path.join(COCOPLUS_DIR, 'flow.json');
    if (fs.existsSync(flowPath)) {
      try {
        const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
        // Find stage matching this subagent_id
        const stages = flow.stages || [];
        let updated = false;
        for (const stage of stages) {
          if (stage.assigned_subagent === subagentId || stage.id === subagentId) {
            stage.status       = status === 'completed' ? 'completed' : 'failed';
            stage.completed_at = ts;
            if (worktreeBranch) stage.worktree_branch = worktreeBranch;
            updated = true;
          }
        }
        if (updated) {
          const tmp = flowPath + '.tmp.' + process.pid;
          fs.writeFileSync(tmp, JSON.stringify(flow, null, 2));
          fs.renameSync(tmp, flowPath);
        }
      } catch (_) { /* flow.json may not exist or be invalid */ }
    }

    // Raise agent_complete notification
    appendJsonLine(path.join(COCOPLUS_DIR, 'ui-notifications.jsonl'), {
      event_type: 'agent_complete',
      persona:    subagentId.replace('persona-', ''),
      status,
      timestamp:  ts,
      source:     'hook.SubagentStop',
    });

    queueAndAttemptBackgroundSpawn({
      source: 'hook.subagent-stop',
      requested_at: ts,
      completed_subagent: subagentId,
      agent: 'coco-cupper',
      reason: 'persona-complete',
    }, ts);
    return;
  }

  // 5. CocoKlatch participant completion
  if (isKlatchParticipant) {
    const klatchDir = path.join(COCOPLUS_DIR, 'lifecycle', 'klatch');
    const runId = event.klatch_run_id || event.run_id || subagentId.replace(/^klatch-participant-/, '').split('-').slice(0, 2).join('-') || 'unknown';
    const manifestPath = path.join(klatchDir, `${runId}-manifest.json`);
    const manifest = readJson(manifestPath, {
      run_id: runId,
      participants: {},
      synthesis_requested: false,
    });
    manifest.participants = manifest.participants || {};
    manifest.participants[subagentId] = {
      status,
      completed_at: ts,
      output: event.output_path || event.artifact || null,
    };
    const participants = Object.values(manifest.participants);
    const expected = Number(manifest.expected_participants || event.expected_participants || participants.length || 0);
    const completeCount = participants.filter((item) => item.status === 'completed' || item.status === 'failed').length;
    if (expected > 0 && completeCount >= expected && !manifest.synthesis_requested) {
      manifest.synthesis_requested = true;
      manifest.synthesis_requested_at = ts;
      queueAndAttemptBackgroundSpawn({
        source: 'hook.subagent-stop',
        requested_at: ts,
        completed_subagent: subagentId,
        agent: 'coco-klatch',
        subagent_id: `klatch-synthesis-${runId}`,
        reason: 'klatch-participants-complete',
        manifest: manifestPath,
      }, ts);
    }
    atomicWriteJson(manifestPath, manifest);
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'klatch-participant', run_id: runId, status, complete: completeCount, expected, ts });
    return;
  }

  // 6. CocoKlatch synthesis completion
  if (isKlatchSynthesis) {
    appendJsonLine(path.join(COCOPLUS_DIR, 'ui-notifications.jsonl'), {
      event_type: status === 'completed' ? 'klatch_synthesis_ready' : 'klatch_synthesis_failed',
      message: status === 'completed'
        ? 'CocoKlatch synthesis complete. Review lifecycle/klatch synthesis artifacts.'
        : `CocoKlatch synthesis failed (${subagentId}). Review participant artifacts.`,
      timestamp: ts,
      source: 'hook.SubagentStop',
    });
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'klatch-synthesis', status, subagent_id: subagentId, ts });
    return;
  }

  // 7. CocoPull structure/distillation/validation completion
  if (isPull) {
    const pullDir = path.join(COCOPLUS_DIR, 'pull');
    const manifestPath = path.join(pullDir, 'manifest.json');
    const manifest = readJson(manifestPath, { artifacts: [] });
    manifest.artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
    const source = event.source || event.source_path || event.target || null;
    const pull = event.pull || event.pull_path || event.output_path || null;
    const existing = manifest.artifacts.find((item) => item.source === source && source);
    const record = existing || {};
    record.source = source || record.source || subagentId;
    record.pull = pull || record.pull || null;
    record.timestamp = ts;
    record.status = status;
    record.reliability = event.reliability || record.reliability || (subagentId.includes('validate') && status === 'completed' ? 'high' : 'pending');
    record.compression_ratio = event.compression_ratio || record.compression_ratio || null;
    record.distillation_outcome = event.distillation_outcome || record.distillation_outcome || 'pending';
    if (!existing) manifest.artifacts.push(record);
    atomicWriteJson(manifestPath, manifest);
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'pull', subagent_id: subagentId, status, source: record.source, pull: record.pull, ts });
    return;
  }

  // 8. Inspector completion
  if (isInspector) {
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'inspector', status, ts });
    return;
  }

  // 9. Quality advisor completion
  if (isQuality) {
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'quality', status, ts });
    return;
  }

  // 10. CocoSentinel dimension completion — safety-net stale lock cleanup
  // Primary lock deletion is performed by sentinel.skill.md Step 8 directly.
  // This hook only cleans up a stale lock if sentinel crashed mid-evaluation.
  const isSentinelDimension = subagentId.startsWith('sentinel-');
  if (isSentinelDimension) {
    const lockPath = path.join(COCOPLUS_DIR, 'sentinel', 'active-evaluation.lock');
    if (fs.existsSync(lockPath)) {
      try {
        const lockAge = Date.now() - fs.statSync(lockPath).mtimeMs;
        // Stale if lock is older than 10 minutes — skill must have crashed
        if (lockAge > 10 * 60 * 1000) {
          fs.unlinkSync(lockPath);
          appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'sentinel-stale-lock-cleanup', age_ms: lockAge, ts });
        }
      } catch (_) { }
    }
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'sentinel-dimension', subagent_id: subagentId, status, ts });
    if (status === 'completed') queueRefineReflection(event, ts);
    return;
  }

  // 11. SecondEye / Devil's Advocate BLOCKING — write to CocoWisdom
  const isSecondEye = subagentId.startsWith('secondeye-') || subagentId.startsWith('da-critic-');
  if (isSecondEye && status === 'completed') {
    const verdict = event.verdict || event.outcome || '';
    const dimension = event.dimension || event.scoring_dimension || null;
    const evidence = event.evidence || event.rejection_reason || '';
    const daRebuttalScore = event.da_rebuttal_score || null;

    const isBlocked = verdict === 'BLOCKING' || verdict === 'FAIL' ||
      (daRebuttalScore !== null && Number(daRebuttalScore) < 4);

    if (isBlocked && dimension) {
      try {
        const { execFileSync } = require('child_process');
        const record = JSON.stringify({
          gate: subagentId.startsWith('da-critic-') ? 'da_critic' : 'secondeye',
          phase: event.phase || null,
          dimension,
          severity: 'BLOCKING',
          rejection_reason: evidence,
          artifact_reference: event.artifact_path || event.artifact_reference || null,
          da_rebuttal_score: daRebuttalScore,
        });
        execFileSync(process.execPath, ['.cortex/scripts/wisdom-writer.js', '--record', record], {
          timeout: 3000, windowsHide: true,
        });
        appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'wisdom_written', gate: 'secondeye', dimension, ts });
      } catch (err) {
        logError('subagent-stop', `wisdom-writer failed: ${err.message}`);
      }
    }
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'secondeye', subagent_id: subagentId, verdict, ts });
    queueRefineReflection(event, ts);
    return;
  }

  // 12. CocoFlow synthesis fallback — trigger rule-based fallback when LLM synthesis fails
  const isSynthesisStage = subagentId.startsWith('synthesis-') || event.stage_type === 'synthesis';
  if (isSynthesisStage && status === 'failed') {
    const flowPath = path.join(COCOPLUS_DIR, 'flow.json');
    if (fs.existsSync(flowPath)) {
      try {
        const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
        const stageId = event.stage_id || subagentId.replace(/^synthesis-/, '');
        const stage = (flow.stages || []).find(s => s.stage_id === stageId || s.id === stageId);
        const fallbackScript = stage && stage.synthesis && stage.synthesis.fallback_script;
        if (fallbackScript && stage.synthesis.fallback === 'rule-based') {
          const inputData = JSON.stringify(event.input_data || event.stage_input || {});
          try {
            const { execFileSync } = require('child_process');
            const fallbackOutput = execFileSync(
              process.execPath,
              [`.cortex/${fallbackScript}`, '--input', inputData],
              { timeout: 10000, windowsHide: true, encoding: 'utf8' }
            );
            const result = JSON.parse(fallbackOutput);
            // Write fallback result to stage output path
            const outputPath = path.join(COCOPLUS_DIR, 'harvest', `${stageId}-fallback-output.json`);
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            const tmp = outputPath + '.tmp.' + process.pid;
            fs.writeFileSync(tmp, JSON.stringify(result, null, 2));
            fs.renameSync(tmp, outputPath);
            appendJsonLine(path.join(COCOPLUS_DIR, 'ui-notifications.jsonl'), {
              type: 'synthesis_fallback',
              stage_id: stageId,
              reason: event.error || 'LLM unavailable',
              fallback_script: fallbackScript,
              output_path: outputPath,
              timestamp: ts,
              source: 'hook.SubagentStop',
            });
            appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'synthesis_fallback', stage_id: stageId, fallback_script: fallbackScript, ts });
          } catch (fbErr) {
            logError('subagent-stop', `synthesis fallback failed for ${stageId}: ${fbErr.message}`);
          }
        }
      } catch (_) { /* flow.json may be invalid */ }
    }
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'synthesis-failed', subagent_id: subagentId, ts });
    return;
  }

  // 13. Unknown — log and ignore
  appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'unknown', subagent_id: subagentId, ts });
}

// CocoRefine (Feature 45) — queue evaluation subagent completions for the
// Reflect step. Only queues when the event carries enough context to ground
// an attribution later (a strategy was actually injected this session).
const REFINE_PENDING = path.join(COCOPLUS_DIR, 'refine', 'pending.jsonl');
const REFINE_QUEUE_THRESHOLD = 1;

function queueRefineReflection(event, ts) {
  const strategyIds = event.injected_strategy_ids || event.strategy_ids || [];
  const functionName = event.function_name || event.artifact_reference || null;
  const functionVersionHash = event.function_version_hash || event.source_hash || null;
  if (!strategyIds.length || !functionName || !functionVersionHash) return;

  for (const strategyId of strategyIds) {
    appendJsonLine(REFINE_PENDING, {
      strategy_id: strategyId,
      session_id: event.session_id || process.env.COCO_SESSION_ID || 'unknown',
      function_name: functionName,
      function_version_hash: functionVersionHash,
      queued_at: ts,
    });
  }

  let queueLength = 0;
  try {
    queueLength = fs.readFileSync(REFINE_PENDING, 'utf8').split('\n').filter(Boolean).length;
  } catch (_) { /* file just created above */ }

  if (queueLength >= REFINE_QUEUE_THRESHOLD) {
    const reflectScript = path.join('scripts', 'refine-reflect.js');
    if (fs.existsSync(reflectScript)) {
      try {
        const child = spawn(process.execPath, [reflectScript], { detached: true, stdio: 'ignore', windowsHide: true });
        child.on('error', (err) => logError('subagent-stop', `refine-reflect spawn failed: ${err.message}`));
        child.unref();
        appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'refine-reflect-triggered', queue_length: queueLength, ts });
      } catch (err) {
        logError('subagent-stop', `refine-reflect spawn failed: ${err.message}`);
      }
    }
  }
}

try {
  main();
} catch (err) {
  logError('subagent-stop', err.message);
}
