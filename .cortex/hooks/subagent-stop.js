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
const { spawn } = require('child_process');
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

  // 10. Unknown — log and ignore
  appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'unknown', subagent_id: subagentId, ts });
}

try {
  main();
} catch (err) {
  logError('subagent-stop', err.message);
}
