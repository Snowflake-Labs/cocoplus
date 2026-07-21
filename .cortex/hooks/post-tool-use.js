#!/usr/bin/env node
/**
 * CocoPlus PostToolUse hook — cross-platform (Node.js)
 *
 * Stdin JSON format from Coco:
 *   { "tool": "Write", "parameters": { "file_path": "..." }, "result": { "success": true, "tokens_consumed": 45 } }
 *
 * Features: CocoMeter (token/tool/SQL/write tracking), Memory Engine (artifact capture),
 *           Code Quality trigger (SQL files), Context Mode narration.
 * Must complete in <50ms.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { isoUtc, appendJsonLine, atomicWrite, logError, readJsonString, readJsonNumber, readStdinJson } = require('./_common.js');
const { readState } = require('./lib/state-reader.js');
const { loadConfig } = require('./_v2-state.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SPAWN_QUEUE  = path.join(COCOPLUS_DIR, 'subagent-spawn-requests.jsonl');
const GOVERNANCE_LOG = path.join(COCOPLUS_DIR, 'lifecycle', 'governance-log.json');
const SESSION_DIR = path.join(COCOPLUS_DIR, 'session');
const COACH_QUEUE = path.join(COCOPLUS_DIR, 'sentinel', 'coach-requests.jsonl');

const PII_PATTERNS = [
  { type: 'EMAIL', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: 'PHONE', re: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g },
  { type: 'SSN', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'PAYMENT_CARD', re: /\b(?:\d[ -]*?){13,19}\b/g },
  { type: 'COMPOUND_PII', re: /\b(name|address|dob|date of birth)\b.{0,80}\b(email|phone|ssn|social security)\b/gi },
];

function countPii(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {});
  return PII_PATTERNS
    .map(({ type, re }) => ({ type, count: (text.match(re) || []).length }))
    .filter((entry) => entry.count > 0);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function appendProgressBudget(progressPath, budget) {
  const block = [
    '## Iteration Budget',
    `Cap: ${budget.cap}`,
    `Consumed: ${budget.consumed}`,
    `Warn At: ${budget.warn_at}`,
  ].join('\n');
  let text = '';
  try { text = fs.readFileSync(progressPath, 'utf8'); } catch (_) { /* created below */ }
  if (!text) text = '# CocoSession Progress\n\n## Done\n\n## In Progress\n\n## Next\n\n## Notes\n';
  if (/## Iteration Budget[\s\S]*?(?=\n## |\s*$)/.test(text)) {
    text = text.replace(/## Iteration Budget[\s\S]*?(?=\n## |\s*$)/, block + '\n');
  } else {
    text = `${text.trim()}\n\n${block}\n`;
  }
  fs.writeFileSync(progressPath, text, 'utf8');
}

function recordIterationBudget(config, ts) {
  const sessionConfig = config.session || {};
  const cap = Number(sessionConfig.max_iterations) || 200;
  const warnAt = Number(sessionConfig.iteration_warn_at) || Math.floor(cap * 0.8);
  const budgetPath = path.join(SESSION_DIR, 'iteration-budget.json');
  const budget = readJson(budgetPath, {
    cap,
    warn_at: warnAt,
    consumed: 0,
    warned: false,
    stopped: false,
  });
  budget.cap = Number(budget.cap) || cap;
  budget.warn_at = Number(budget.warn_at) || warnAt;
  budget.consumed = Number(budget.consumed) + 1;
  budget.updated_at = ts;
  writeJson(budgetPath, budget);
  appendProgressBudget(path.join(SESSION_DIR, 'PROGRESS.md'), budget);

  if (budget.consumed >= budget.warn_at && !budget.warned) {
    budget.warned = true;
    budget.warned_at = ts;
    writeJson(budgetPath, budget);
    appendJsonLine(path.join(SESSION_DIR, 'steps.jsonl'), {
      ts,
      event_type: 'iteration_budget_warning',
      message: 'Proactive session checkpoint scheduled because CocoSession is approaching the iteration limit.',
    });
  }

  if (budget.consumed >= budget.cap && !budget.stopped) {
    budget.stopped = true;
    budget.stopped_at = ts;
    writeJson(budgetPath, budget);
    fs.writeFileSync(path.join(COCOPLUS_DIR, 'AGENT_STOP'), 'CocoSession iteration budget reached.\n', 'utf8');
    appendJsonLine(path.join(SESSION_DIR, 'steps.jsonl'), {
      ts,
      event_type: 'iteration_budget_cap_reached',
      message: 'AGENT_STOP created because CocoSession reached its iteration cap.',
    });
  }
}

function queueAndAttemptBackgroundSpawn(request, ts) {
  appendJsonLine(SPAWN_QUEUE, request);
  appendJsonLine(HOOK_LOG, {
    hook: 'post-tool-use',
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
    child.on('error', (err) => logError('post-tool-use', `background spawn failed: ${err.message}`));
    child.unref();
    appendJsonLine(HOOK_LOG, {
      hook: 'post-tool-use',
      action: 'background_spawn_attempted',
      agent: request.agent,
      ts,
    });
  } catch (err) {
    logError('post-tool-use', `background spawn setup failed: ${err.message}`);
  }
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts    = isoUtc();
  const event = readStdinJson();

  const toolName   = event.tool    || process.env.COCO_TOOL_NAME    || 'unknown';
  const params     = event.parameters || {};
  const result     = event.result     || {};
  const filePath   = params.file_path || params.path || '';
  const tokensUsed = Number(result.tokens_consumed) || 0;
  const succeeded  = result.success !== false;
  const config     = loadConfig();

  appendJsonLine(HOOK_LOG, { hook: 'post-tool-use', tool: toolName, ts });

  // CocoSession iteration budget: every completed turn advances the budget.
  try {
    ensureDir(SESSION_DIR);
    recordIterationBudget(config, ts);
  } catch (err) {
    logError('post-tool-use', `iteration budget update failed: ${err.message}`);
  }

  // V2 Governance Policy 2: PII Governance. This hook records redaction
  // decisions and emits warning metadata; original values are never persisted.
  const governance = config.governance || {};

  // CocoSentinel live bypass/private-mode governance. The hook records live
  // permission posture every turn when visible in event metadata or env vars.
  const permissionLevel = event.permissionLevel || event.permission_level ||
    result.permissionLevel || result.permission_level ||
    process.env.COCO_PERMISSION_LEVEL ||
    process.env.CORTEX_PERMISSION_LEVEL ||
    '';
  if (String(permissionLevel).toLowerCase() === 'bypass_safeguards') {
    const policy = governance.bypass_safeguards_policy || 'allow';
    appendJsonLine(GOVERNANCE_LOG, {
      ts,
      policy: 'bypass_safeguards',
      tool: toolName,
      action: policy === 'block' ? 'BLOCK_NEXT_TOOL' : policy === 'warn' ? 'WARN' : 'LOG',
      session_id: event.session_id || process.env.COCO_SESSION_ID || null,
    });
    if (policy === 'block') {
      fs.writeFileSync(path.join(COCOPLUS_DIR, 'AGENT_STOP'), 'Bypass safeguards policy set to block.\n', 'utf8');
    }
  }
  if (process.env.CORTEX_CODE_NO_HISTORY_MODE === 'true' || process.env.COCO_NO_HISTORY_MODE === 'true') {
    appendJsonLine(GOVERNANCE_LOG, {
      ts,
      policy: 'session_history',
      tool: toolName,
      action: governance.require_session_history ? 'PRIVATE_MODE_DETECTED' : 'PRIVATE_MODE_OBSERVED',
    });
  }

  const piiMode = governance.pii_filtering === undefined ? false : governance.pii_filtering;
  if (toolName === 'SnowflakeSqlExecute' && piiMode !== false && piiMode !== 'false') {
    const piiCounts = countPii(result);
    if (piiCounts.length > 0) {
      appendJsonLine(GOVERNANCE_LOG, {
        ts,
        policy: 'pii_governance',
        tool: toolName,
        action: piiMode === 'observe' ? 'WOULD_HAVE_REDACTED' : 'REDACTED',
        categories: piiCounts,
      });
      appendJsonLine(HOOK_LOG, {
        hook: 'post-tool-use',
        action: piiMode === 'observe' ? 'pii_observed' : 'pii_redaction_logged',
        categories: piiCounts.map((entry) => entry.type),
        ts,
      });
    }
  }

  // 1. CocoMeter — increment counters and add actual tokens
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocometer.on'))) {
    const meterFile = path.join(COCOPLUS_DIR, 'meter', 'current-session.json');
    if (fs.existsSync(meterFile)) {
      const sessionId = readJsonString(meterFile, 'session_id');
      const startedAt = readJsonString(meterFile, 'started_at');
      const phase     = readJsonString(meterFile, 'phase');
      let tools  = readJsonNumber(meterFile, 'tools_called') + 1;
      let tokens = readJsonNumber(meterFile, 'tokens_consumed') + tokensUsed;
      let sql    = readJsonNumber(meterFile, 'sql_statements');
      let writes = readJsonNumber(meterFile, 'writes_performed');

      if (toolName === 'SnowflakeSqlExecute') sql++;
      if (toolName === 'Write' || toolName === 'Edit') writes++;

      atomicWrite(meterFile, JSON.stringify({
        session_id:       sessionId,
        started_at:       startedAt,
        phase:            phase,
        tools_called:     tools,
        tokens_consumed:  tokens,
        sql_statements:   sql,
        writes_performed: writes,
      }, null, 2));
    }
  }

  // 2. Memory Engine — capture meaningful artifact operations
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'memory.on')) && succeeded) {
    const isFileOp  = toolName === 'Read' || toolName === 'Write' || toolName === 'Edit';
    const isSql     = filePath.endsWith('.sql');
    const isMd      = filePath.endsWith('.md');
    const isWrite   = toolName === 'Write' || toolName === 'Edit';

    if (isFileOp && (isSql || isMd) && isWrite) {
      const bufferFile  = path.join(COCOPLUS_DIR, '.decision-buffer');
      const fileName    = path.basename(filePath);
      const memTarget   = isSql ? 'patterns.md' : 'decisions.md';
      const entry       = `- [${ts}] ${toolName}: ${fileName} → ${memTarget}`;
      try {
        fs.appendFileSync(bufferFile, entry.slice(0, 200) + '\n');
      } catch (_) { /* non-fatal */ }
    }
  }

  // 3. Code Quality Advisor — trigger background check for new SQL files
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'quality.on')) && succeeded) {
    const isWrite = toolName === 'Write' || toolName === 'Edit';
    if (isWrite && filePath.endsWith('.sql')) {
      // Log that quality review is needed; the quality-run skill handles actual execution
      appendJsonLine(path.join(COCOPLUS_DIR, 'quality-queue.jsonl'), {
        ts, file: filePath, tool: toolName,
      });
      appendJsonLine(HOOK_LOG, { hook: 'post-tool-use', action: 'quality_queued', file: filePath, ts });
      queueAndAttemptBackgroundSpawn({
        source: 'hook.post-tool-use',
        requested_at: ts,
        file: filePath,
        agent: 'quality-advisor',
        reason: 'sql-write-quality-review',
      }, ts);
    }
  }

  // 4. Context Mode narration — brief summary for session context
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'context-mode.on')) && filePath) {
    const fileName = path.basename(filePath);
    appendJsonLine(HOOK_LOG, {
      hook: 'post-tool-use', action: 'context_narration',
      summary: `${toolName}: ${fileName}`, ts,
    });
  }

  // 5. CocoSentinel SHA-void — if a file is written and it has an approval record, void it
  if ((toolName === 'Write' || toolName === 'Edit') && filePath && succeeded) {
    const approvalsPath = path.join(COCOPLUS_DIR, 'sentinel', 'approvals.jsonl');
    if (fs.existsSync(approvalsPath)) {
      try {
        const lines = fs.readFileSync(approvalsPath, 'utf8').trim().split('\n').filter(Boolean);
        const hasApproval = lines.some(l => {
          try { return JSON.parse(l).artifact_path === filePath; } catch (_) { return false; }
        });
        if (hasApproval) {
          // Read new file content to compute new SHA
          const { createHash } = require('crypto');
          const newContent = fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
          if (newContent) {
            const newSha = createHash('sha256').update(newContent).digest('hex');
            // Check if any approval matches the new SHA
            const stillValid = lines.some(l => {
              try { const r = JSON.parse(l); return r.artifact_path === filePath && r.artifact_sha === newSha; } catch (_) { return false; }
            });
            if (!stillValid) {
              appendJsonLine(path.join(COCOPLUS_DIR, 'ui-notifications.jsonl'), {
                event_type: 'sentinel_approval_voided',
                message:    `CocoSentinel: approval for ${filePath} voided — file modified since approval. Re-run $sentinel to re-evaluate.`,
                timestamp:  ts,
                source:     'hook.PostToolUse',
              });
              appendJsonLine(HOOK_LOG, { hook: 'post-tool-use', action: 'sentinel_approval_voided', file: filePath, ts });
            }
          }
        }
      } catch (_) { /* non-fatal */ }
    }
  }

  // 6. CocoAudit — Tier 2 async append-only audit record (Feature 40; contract
  // lifecycle events added as a Feature 44 / ninth-cycle enhancement)
  // Decision-type events: plan-approved, spec-gate-passed, ship-confirmed, secondeye-acknowledged, sentinel-approved
  const AUDIT_EVENTS = {
    'plan-approved':               ['Write', 'Edit'],
    'spec-gate-passed':            ['Write'],
    'ship-confirmed':              ['Write'],
    'secondeye-acknowledged':      ['Write'],
    'sentinel-approved':           ['Write'],
    'contract-declared':           ['Write'],
    'contract-evidence-submitted': ['Write'],
    'contract-evidence-stale':     ['Write'],
    'contract-archived':           ['Write'],
  };
  const auditOnPath = path.join(COCOPLUS_DIR, 'modes', 'cocoaudit.on');
  if (fs.existsSync(auditOnPath) && succeeded) {
    const auditPath = path.join(COCOPLUS_DIR, 'lifecycle', 'audit.md');
    if (fs.existsSync(auditPath)) {
      // Determine event type from file path patterns
      let auditEventId = null;
      let auditArtifact = filePath || 'N/A';
      if (filePath.includes('lifecycle/plan') && (toolName === 'Write' || toolName === 'Edit')) auditEventId = 'plan-approved';
      else if (filePath.includes('lifecycle/spec') && toolName === 'Write') auditEventId = 'spec-gate-passed';
      else if (filePath.includes('lifecycle/deployment') && toolName === 'Write') auditEventId = 'ship-confirmed';
      else if (filePath.includes('.secondeye-') && toolName === 'Write') auditEventId = 'secondeye-acknowledged';
      else if (filePath.includes('sentinel/approvals') && toolName === 'Write') auditEventId = 'sentinel-approved';
      else if (filePath.includes('outcomes/') && filePath.endsWith('contract.md') && toolName === 'Write') auditEventId = 'contract-declared';
      else if (filePath.includes('contract-evidence.json') && toolName === 'Write') auditEventId = 'contract-evidence-submitted';
      else if (filePath.includes('outcomes/') && filePath.endsWith('history.md') && toolName === 'Write') auditEventId = 'contract-archived';

      if (auditEventId) {
        const block = [
          `\n## [${auditEventId}]`,
          `**Timestamp**: ${ts}`,
          `**Event**: ${auditEventId}`,
          `**Artifact**: ${auditArtifact}`,
          `**Developer Input**: "${(params.content || '').slice(0, 200).replace(/"/g, "'")}"`,
          `**AI Response Summary**: "Tool: ${toolName} on ${path.basename(filePath || 'unknown')}"`,
          '',
        ].join('\n');
        try {
          // APPEND-ONLY: fs.appendFileSync never rewrites the file
          fs.appendFileSync(auditPath, block, 'utf8');
          appendJsonLine(HOOK_LOG, { hook: 'post-tool-use', action: 'audit_appended', event: auditEventId, ts });
        } catch (err) {
          logError('post-tool-use', `audit append failed: ${err.message}`);
        }
      }
    }
  }

  // 7. CocoMeter Enhanced (Feature 21) — request_id capture for flow stage attribution
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocometer.on'))) {
    const requestId = result.request_id || result.requestId || null;
    if (requestId) {
      const state = readState(COCOPLUS_DIR);
      let stageId    = state.active_stage_id;
      let persona    = state.active_persona;
      let sessionId  = state.session_id;
      let parentRequestId = result.parent_request_id || result.parentRequestId || null;

      const requestMapFile = path.join(COCOPLUS_DIR, 'meter', 'request-map.jsonl');
      const entry = {
        request_id:        requestId,
        parent_request_id: parentRequestId,
        stage_id:          stageId,
        persona:           persona,
        tool_name:         toolName,
        timestamp:         ts,
        session_id:        sessionId,
        is_subagent_anchor: false,
      };
      try {
        const dir = path.join(COCOPLUS_DIR, 'meter');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        appendJsonLine(requestMapFile, entry);
        appendJsonLine(HOOK_LOG, { hook: 'post-tool-use', action: 'request_id_captured', request_id: requestId, stage_id: stageId, ts });
      } catch (err) {
        logError('post-tool-use', `request_id capture failed: ${err.message}`);
      }
    }
  }

  // 8. CocoSentinel per-stage external coach. This is queue-only here; the
  // coach skill consumes the request asynchronously so hook latency stays low.
  const harness = config.harness || {};
  const coachModel = harness.coach_model || null;
  const stageId = process.env.COCOPLUS_STAGE_ID || params.stage_id || params.stage || null;
  if (succeeded && coachModel && stageId) {
    const executorModel = process.env.COCOPLUS_EXECUTOR_MODEL || params.model || result.model || null;
    if (executorModel && String(executorModel).toLowerCase() === String(coachModel).toLowerCase()) {
      appendJsonLine(path.join(COCOPLUS_DIR, 'sentinel', 'known-gaps.jsonl'), {
        ts,
        policy: 'coach_model_separation',
        stage_id: stageId,
        executor_model: executorModel,
        coach_model: coachModel,
        message: 'Coach model must differ from executor model; coach request not queued.',
      });
    } else {
      appendJsonLine(COACH_QUEUE, {
        ts,
        stage_id: stageId,
        tool: toolName,
        artifact: filePath || result.output_path || null,
        coach_model: coachModel,
        executor_model: executorModel,
        status: 'queued',
      });
    }
  }
}

try {
  main();
} catch (err) {
  logError('post-tool-use', err.message);
}
