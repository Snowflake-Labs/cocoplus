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
const { isoUtc, appendJsonLine, logError, readStdinJson } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

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
    return;
  }

  // 5. Inspector completion
  if (isInspector) {
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'inspector', status, ts });
    return;
  }

  // 6. Quality advisor completion
  if (isQuality) {
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'quality', status, ts });
    return;
  }

  // 7. Unknown — log and ignore
  appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', type: 'unknown', subagent_id: subagentId, ts });
}

try {
  main();
} catch (err) {
  logError('subagent-stop', err.message);
}
