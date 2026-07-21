#!/usr/bin/env node
/**
 * CocoPlus PreToolUse hook — cross-platform (Node.js)
 *
 * Stdin JSON format from Coco:
 *   { "tool": "SnowflakeSqlExecute", "parameters": { "sql": "...", ... } }
 *   { "tool": "Read|Write|Edit", "parameters": { "file_path": "...", ... } }
 *
 * Stdout JSON response:
 *   {"action":"allow"}
 *   {"action":"block","reason":"..."}
 *   {"action":"allow","warning":"..."}
 *
 * Execution order (per spec):
 *   1. Prompt injection defense scan (planning artifacts on Read)
 *   2. EHRB classification (SnowflakeSqlExecute only)
 *   3. Layer 1 Safety Gate hard/warn check (SnowflakeSqlExecute only)
 *
 * Features: Safety Gate (hard layer), EHRB confirmation gate, prompt injection
 * defense, CocoMeter timing start.
 * Must complete in <100ms — injection scan is structural pattern match only.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, logError, readStdinJson } = require('./_common.js');
const { loadConfig } = require('./_v2-state.js');

const COCOPLUS_DIR  = '.cocoplus';
const HOOK_LOG      = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SAFETY_LOG    = path.join(COCOPLUS_DIR, 'safety-decisions.log');
const SAFETY_AUDIT  = path.join(COCOPLUS_DIR, 'safety-audit.jsonl');
const GOVERNANCE_LOG = path.join(COCOPLUS_DIR, 'lifecycle', 'governance-log.json');
const STAGE_EVIDENCE = path.join(COCOPLUS_DIR, 'session', 'stage-evidence.json');
const PROPOSAL_LOG = path.join(COCOPLUS_DIR, 'proposals', 'proposal-log.jsonl');
const FLOW_ARTIFACT_ROOT = path.join(COCOPLUS_DIR, 'flow', 'artifacts');

/** Planning artifacts that are scanned for prompt injection */
const PLANNING_ARTIFACTS = [
  'lifecycle/flow.json', 'lifecycle/spec.md', 'lifecycle/plan.md',
  'lifecycle/discuss.md', 'flow.json',
];

/**
 * Structural anomaly scan — detects instruction-type syntax in declarative content.
 * Returns {anomaly: true, reason} or {anomaly: false}.
 * Must complete in <50ms. Conservative: flag only high-confidence anomalies.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|all)\s+instructions/i,
  /your\s+(new\s+)?task\s+is\b/i,
  /as\s+an\s+ai\s+you\s+must\b/i,
  /disregard\s+(your\s+)?(previous\s+)?(instructions|constraints|rules)/i,
  /bypass\s+(safety|governance|security|the\s+gate)/i,
  /\brole\s*:\s*(admin|system|root|override)\b/i,
];

function scanForInjection(content) {
  for (const re of INJECTION_PATTERNS) {
    if (re.test(content)) {
      return { anomaly: true, reason: `Structural anomaly detected: instruction-type pattern found in planning artifact` };
    }
  }
  // Check for embedded base64 that decodes to instruction-like text
  const b64Matches = content.match(/[A-Za-z0-9+/]{40,}={0,2}/g) || [];
  for (const b64 of b64Matches) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      for (const re of INJECTION_PATTERNS) {
        if (re.test(decoded)) {
          return { anomaly: true, reason: 'Structural anomaly detected: encoded instruction-type content in planning artifact' };
        }
      }
    } catch (_) { /* not valid base64 */ }
  }
  return { anomaly: false };
}

/**
 * EHRB — Elevated-Hazard Requiring Buy-in classification.
 * Returns {ehrb: true, category, indicator} or {ehrb: false}.
 * Runs before Layer 1 hard gate. EHRB requires confirmation, not a block.
 */
const EHRB_BILLING_THRESHOLD_DEFAULT = 100000; // configurable in safety-config.json

function classifyEHRB(sql, prodPatterns, billingThreshold) {
  // Production systems
  for (const prod of prodPatterns) {
    const escaped = prod.replace(/\*/g, '.*').replace(/\?/g, '.');
    if (new RegExp(escaped, 'i').test(sql) && /\b(DDL|DROP|ALTER|CREATE\s+OR\s+REPLACE)\b/i.test(sql)) {
      return { ehrb: true, category: 'Production systems', indicator: `DDL targeting production schema pattern: ${prod}` };
    }
  }
  // Sensitive/PII
  if (/AI_REDACT|AI_EXTRACT/i.test(sql)) {
    return { ehrb: true, category: 'Sensitive/PII data', indicator: 'Cortex AI_REDACT or AI_EXTRACT on unverified columns' };
  }
  // Billing-significant: metered Cortex functions (simplified detection)
  if (/\b(AI_COMPLETE|AI_CLASSIFY|AI_EXTRACT|AI_SENTIMENT|SNOWFLAKE\.CORTEX\.)/i.test(sql)) {
    return { ehrb: true, category: 'Billing-significant operation', indicator: `Metered Cortex function call detected (threshold: ${billingThreshold} rows)` };
  }
  // Security-critical
  if (/\b(CREATE|DROP|GRANT|REVOKE)\s+(ROLE|POLICY|ROW\s+ACCESS\s+POLICY|MASKING\s+POLICY)/i.test(sql)) {
    return { ehrb: true, category: 'Security-critical operation', indicator: 'Role, grant, or policy modification detected' };
  }
  return { ehrb: false };
}

/** Destructive SQL patterns — case-insensitive, simple string match per spec */
const DESTRUCTIVE_PATTERNS = [
  { re: /DROP\s+TABLE/i,              label: 'DROP TABLE' },
  { re: /DROP\s+SCHEMA/i,             label: 'DROP SCHEMA' },
  { re: /DROP\s+DATABASE/i,           label: 'DROP DATABASE' },
  { re: /DROP\s+PROCEDURE/i,          label: 'DROP PROCEDURE' },
  { re: /DROP\s+FUNCTION/i,           label: 'DROP FUNCTION' },
  { re: /TRUNCATE\s+TABLE/i,          label: 'TRUNCATE TABLE' },
  { re: /DELETE\s+FROM\s+\S+\s*;?\s*$/i, label: 'DELETE without WHERE' },
  { re: /ALTER\s+TABLE.*DROP\s+COLUMN/i, label: 'ALTER TABLE DROP COLUMN' },
];

function allow(warning) {
  process.stdout.write(JSON.stringify(warning ? { action: 'allow', warning } : { action: 'allow' }) + '\n');
}

function block(reason) {
  process.stdout.write(JSON.stringify({ action: 'block', reason }) + '\n');
}

function isTruthy(value) {
  return value === true || value === 'true' || value === 'observe' || value === 'enabled';
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function recordStageEvidence(stageId, filePath, ts) {
  if (!stageId || !filePath) return;
  const registry = readJsonFile(STAGE_EVIDENCE, { stages: {} });
  if (!registry.stages) registry.stages = {};
  if (!registry.stages[stageId]) registry.stages[stageId] = [];
  registry.stages[stageId].push({
    ts,
    source: 'Read',
    file: filePath,
    qualifying: true,
  });
  writeJsonFile(STAGE_EVIDENCE, registry);
}

function stageHasEvidence(stageId) {
  const registry = readJsonFile(STAGE_EVIDENCE, { stages: {} });
  const entries = registry.stages && registry.stages[stageId];
  return Array.isArray(entries) && entries.some((entry) => entry.qualifying);
}

function stageIsEvidenceExempt(stageId) {
  const flow = readJsonFile(path.join(COCOPLUS_DIR, 'flow.json'), readJsonFile(path.join(COCOPLUS_DIR, 'lifecycle', 'flow.json'), {}));
  const stages = Array.isArray(flow.stages) ? flow.stages : [];
  const stage = stages.find((item) => item.id === stageId || item.name === stageId);
  return Boolean(stage && (stage.evidence_exempt === true || stage.evidence_exempt === 'true'));
}

function extractsCompletedStage(params) {
  const payload = JSON.stringify(params || {});
  const idMatch = payload.match(/"stage_id"\s*:\s*"([^"]+)"/) ||
    payload.match(/"id"\s*:\s*"([^"]+)"/) ||
    payload.match(/"stage"\s*:\s*"([^"]+)"/);
  if (!idMatch || !/"status"\s*:\s*"completed"/.test(payload)) return null;
  return idMatch[1];
}

function currentStageId(params) {
  return process.env.COCOPLUS_STAGE_ID ||
    params.stage_id ||
    params.stage ||
    params.stageId ||
    null;
}

function activeFlow() {
  return readJsonFile(path.join(COCOPLUS_DIR, 'flow.json'), readJsonFile(path.join(COCOPLUS_DIR, 'lifecycle', 'flow.json'), {}));
}

function findStage(stageId) {
  if (!stageId) return null;
  const flow = activeFlow();
  const stages = Array.isArray(flow.stages) ? flow.stages : [];
  return stages.find((item) => item.id === stageId || item.name === stageId) || null;
}

function stageReadArtifacts(stage) {
  if (!stage || !stage.artifacts) return [];
  const reads = stage.artifacts.reads || stage.artifacts_read || [];
  return Array.isArray(reads) ? reads : [];
}

function artifactPath(runId, artifactName) {
  const safeRunId = runId || process.env.COCOPLUS_RUN_ID || 'current';
  return path.join(FLOW_ARTIFACT_ROOT, safeRunId, artifactName);
}

function shouldCheckArtifactReads(params) {
  return process.env.COCOPLUS_STAGE_START === 'true' ||
    params.stage_start === true ||
    params.action === 'stage_start' ||
    params.cocoplus_action === 'stage_start';
}

function main() {
  // No-op if CocoPlus not initialized
  if (!fs.existsSync(COCOPLUS_DIR)) { allow(); return; }

  const ts = isoUtc();

  // Read structured event from stdin
  const event    = readStdinJson();
  const toolName = event.tool || process.env.COCO_TOOL_NAME || 'unknown';
  const params   = event.parameters || {};
  const config   = loadConfig();

  // CocoSession kill-switch: operator-created sentinel halts all tool calls.
  // Removing .cocoplus/AGENT_STOP from outside the agent restores execution.
  const stopFile = path.join(COCOPLUS_DIR, 'AGENT_STOP');
  if (fs.existsSync(stopFile)) {
    appendJsonLine(HOOK_LOG, { hook: 'pre-tool-use', action: 'agent_stop_blocked', tool: toolName, ts });
    block('CocoSession kill-switch is active: .cocoplus/AGENT_STOP exists. Remove it to resume tool use.');
    return;
  }

  // CocoFlow Named Artifact Protocol: optional declared reads/writes become a
  // structural handoff contract. If a stage declares artifacts.reads, it cannot
  // start until those files exist under the flow artifact root.
  if (shouldCheckArtifactReads(params)) {
    const stageId = currentStageId(params);
    const stage = findStage(stageId);
    const reads = stageReadArtifacts(stage);
    const runId = params.run_id || process.env.COCOPLUS_RUN_ID || 'current';
    const missing = reads.filter((name) => !fs.existsSync(artifactPath(runId, name)));
    if (missing.length > 0) {
      appendJsonLine(HOOK_LOG, {
        hook: 'pre-tool-use',
        action: 'artifact_reads_blocked',
        stage_id: stageId,
        missing,
        ts,
      });
      block(`CocoFlow artifact protocol: stage "${stageId}" cannot start. Missing declared read artifacts: ${missing.join(', ')}.`);
      return;
    }
  }

  // V2 Governance Policy 1: ReviewerLockout. Review/evaluation agents cannot
  // mutate the artifact they are currently reviewing. Observe mode logs only.
  if (toolName === 'Write' || toolName === 'Edit') {
    const governance = config.governance || {};
    const mode = governance.reviewer_lockout === undefined ? true : governance.reviewer_lockout;
    const filePath = params.file_path || params.path || '';
    const reviewerRole = process.env.COCOPLUS_REVIEWER === 'true' ||
      /review|critic|sentinel|secondeye/i.test(process.env.COCOPLUS_PERSONA || '');
    const reviewTarget = process.env.COCOPLUS_REVIEW_TARGET || '';
    const writesReviewedArtifact = reviewerRole && reviewTarget && path.resolve(filePath) === path.resolve(reviewTarget);
    if (writesReviewedArtifact && mode !== false && mode !== 'false') {
      appendJsonLine(GOVERNANCE_LOG, {
        ts,
        policy: 'reviewer_lockout',
        tool: toolName,
        file: filePath,
        target: reviewTarget,
        action: mode === 'observe' ? 'WOULD_HAVE_BLOCKED' : 'BLOCKED',
      });
      if (mode === 'observe') {
        allow(`ReviewerLockout observe mode: write would have been blocked for ${filePath}.`);
      } else {
        block(`ReviewerLockout: review-mode agents cannot modify the artifact under review (${filePath}).`);
      }
      return;
    }
  }

  // CocoFlow Default-FAIL Evidence Gate. When enabled, a stage cannot be
  // marked completed until a qualifying Read has been recorded for that stage.
  if (toolName === 'Write' || toolName === 'Edit') {
    const evidenceGate = config.evidence_gate || {};
    const enabled = isTruthy(evidenceGate.enabled);
    const filePath = params.file_path || params.path || '';
    const isFlowMutation = /(^|[\\/])\.cocoplus[\\/](lifecycle[\\/])?flow\.json$/i.test(filePath);
    const stageId = extractsCompletedStage(params);
    if (enabled && isFlowMutation && stageId && !stageIsEvidenceExempt(stageId) && !stageHasEvidence(stageId)) {
      appendJsonLine(HOOK_LOG, { hook: 'pre-tool-use', action: 'stage_evidence_blocked', stage_id: stageId, file: filePath, ts });
      block(`CocoFlow evidence gate: stage "${stageId}" cannot advance to completed until a qualifying evidence file has been read. Read the test result, query output, schema diff, screenshot, or configured evidence artifact first.`);
      return;
    }
  }

  // --- Step 1: Prompt injection defense scan (planning artifacts on Read) ---
  if (toolName === 'Read' || toolName === 'mcp__files_read') {
    const filePath = params.file_path || params.path || '';
    recordStageEvidence(process.env.COCOPLUS_STAGE_ID || params.stage_id || params.stage, filePath, ts);
    const isArtifact = PLANNING_ARTIFACTS.some(a => filePath.endsWith(a));
    if (isArtifact && fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { anomaly, reason } = scanForInjection(content);
        if (anomaly) {
          appendJsonLine(SAFETY_AUDIT, { ts, tool: toolName, file: filePath, anomaly: true, reason });
          allow(`⚠ ${reason} in \`${filePath}\`. Review before proceeding.`);
          return;
        }
      } catch (_) { /* read failed — fail open */ }
    }
    allow();
    return;
  }

  // Only intercept SnowflakeSqlExecute for remaining checks
  if (toolName !== 'SnowflakeSqlExecute') { allow(); return; }
  appendJsonLine(HOOK_LOG, { hook: 'pre-tool-use', tool: toolName, ts });

  // Extract SQL from parameters.sql (spec-defined path)
  const sql = params.sql || params.query || params.statement || '';

  // CocoSentinel RBAC Escalation Guard: structural protection independent of
  // session env vars. ACCOUNTADMIN escalation requires explicit pod opt-in.
  const governance = config.governance || {};
  const allowAccountAdmin = governance.allow_accountadmin_escalation === true ||
    governance.allow_accountadmin_escalation === 'true';
  if (/\bUSE\s+ROLE\s+ACCOUNTADMIN\b/i.test(sql)) {
    appendJsonLine(GOVERNANCE_LOG, {
      ts,
      policy: 'rbac_escalation_guard',
      tool: toolName,
      action: allowAccountAdmin ? 'ALLOWED' : 'BLOCKED',
      stage_id: currentStageId(params),
      summary: sql.slice(0, 160),
    });
    if (!allowAccountAdmin) {
      block('[CocoSentinel] RBAC Escalation Blocked\nDetected: USE ROLE ACCOUNTADMIN in SQL tool call.\nTo allow: set [governance] allow_accountadmin_escalation = true in cocoplus.toml.');
      return;
    }
  }

  // Retained Proposal Model: proposal-enabled flow stages must not write
  // directly to Snowflake. The proposal is settled later with $flow settle.
  const proposalEnabled = process.env.COCOPLUS_WRITES_VIA_PROPOSAL === 'true' ||
    params.writes_via_proposal === true ||
    params.proposal_mode === true;
  if (proposalEnabled && /\b(CREATE|ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE|MERGE|GRANT|REVOKE)\b/i.test(sql)) {
    const stageId = process.env.COCOPLUS_STAGE_ID || params.stage_id || 'unknown-stage';
    appendJsonLine(PROPOSAL_LOG, {
      ts,
      stage_id: stageId,
      action: 'DIRECT_WRITE_BLOCKED',
      tool: toolName,
      summary: sql.slice(0, 160),
    });
    block(`Retained Proposal Model: stage "${stageId}" is proposal-enabled. Write the SQL proposal under .cocoplus/proposals/${stageId}/ and settle it with $flow settle --accept ${stageId} before touching Snowflake.`);
    return;
  }

  // Determine safety mode from flag files (fast existence check only)
  let safetyMode = 'normal'; // default per spec
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.off')))    safetyMode = 'off';
  else if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.strict'))) safetyMode = 'strict';
  else if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.normal'))) safetyMode = 'normal';

  // Safety off: pass through immediately — all checks including EHRB are bypassed
  if (safetyMode === 'off') { allow(); return; }

  // Phase-aware gate: block SQL execution during Spec and Plan phases
  const metaPath = path.join(COCOPLUS_DIR, 'lifecycle', 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const phase = (meta.current_phase || '').toLowerCase();
      if (phase === 'spec' || phase === 'plan') {
        block(`SnowflakeSqlExecute is blocked during the ${phase} phase. SQL execution is only permitted from the Build phase onward. Use $build to advance the lifecycle.`);
        return;
      }
    } catch (_) { /* malformed meta.json — fail open */ }
  }

  // --- Step 1b: Four-Tier Boundary Framework (Step 25.6 / Step 26.6) ---
  // Reads boundary_tiers from safety-config.json (or cocoplus.toml when migrated)
  let boundaryTiers = null;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(COCOPLUS_DIR, 'safety-config.json'), 'utf8'));
    boundaryTiers = cfg.boundary_tiers || null;
  } catch (_) { /* not yet configured — skip tier classification */ }

  if (boundaryTiers && toolName === 'SnowflakeSqlExecute') {
    const neverPatterns   = boundaryTiers.never_patterns   || [];
    const humanPatterns   = boundaryTiers.human_required_patterns || [];
    const askFirstPatterns = boundaryTiers.ask_first_patterns || [];

    // Tier 4: NEVER — unconditional block, cannot be overridden
    for (const pattern of neverPatterns) {
      if (new RegExp(pattern, 'i').test(sql)) {
        block(`[TIER 4 — NEVER] This operation matches a pattern that CocoPlus is configured to never execute: "${pattern}". This cannot be overridden. Edit boundary_tiers.never_patterns in safety-config.json to change this policy.`);
        appendJsonLine(SAFETY_AUDIT, { ts, tool: toolName, tier: 4, pattern, mode: 'never' });
        return;
      }
    }

    // Tier 3: HUMAN REQUIRED — hard stop requiring typed rationale
    for (const pattern of humanPatterns) {
      if (new RegExp(pattern, 'i').test(sql)) {
        block(`[TIER 3 — HUMAN REQUIRED] This operation requires explicit human authorization: "${pattern}" matched. Provide written rationale and re-submit: "AUTHORIZED: <your reason>"`);
        appendJsonLine(SAFETY_AUDIT, { ts, tool: toolName, tier: 3, pattern, mode: 'human_required' });
        return;
      }
    }

    // Tier 2: ASK FIRST — confirmation prompt before execution
    for (const pattern of askFirstPatterns) {
      if (new RegExp(pattern, 'i').test(sql)) {
        allow(`[TIER 2 — ASK FIRST] This operation matches a pattern requiring confirmation: "${pattern}". Confirm to proceed? Type YES to allow this operation.`);
        appendJsonLine(SAFETY_AUDIT, { ts, tool: toolName, tier: 2, pattern, mode: 'ask_first' });
        return;
      }
    }
  }

  // --- Step 2: EHRB classification ---
  // EHRB requires confirmation (warn), not a block — runs regardless of safety mode
  let prodPatterns = [];
  let billingThreshold = EHRB_BILLING_THRESHOLD_DEFAULT;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(COCOPLUS_DIR, 'safety-config.json'), 'utf8'));
    prodPatterns = cfg.production_schema_patterns || cfg.production_patterns || [];
    if (cfg.ehrb_billing_row_threshold) billingThreshold = cfg.ehrb_billing_row_threshold;
  } catch (_) { /* file may not exist yet */ }

  const { ehrb, category: ehrbCategory, indicator: ehrbIndicator } = classifyEHRB(sql, prodPatterns, billingThreshold);
  if (ehrb) {
    appendJsonLine(SAFETY_AUDIT, { ts, tool: toolName, ehrb: true, category: ehrbCategory, indicator: ehrbIndicator });
    // Surface as warning with confirmation prompt — EHRB never blocks unilaterally
    allow(`⚠ EHRB Review Required — ${ehrbCategory}\nDetected: ${ehrbIndicator}\nOperation: ${sql.slice(0, 100)}\nConfirm to proceed? Review safety-audit.jsonl for log.`);
    return;
  }

  // --- Step 3: Layer 1 Safety Gate ---
  // Detect destructive pattern
  let pattern = null;
  for (const { re, label } of DESTRUCTIVE_PATTERNS) {
    if (re.test(sql)) { pattern = label; break; }
  }

  // Check production schema patterns in ALTER TABLE (prodPatterns already loaded above)
  if (!pattern && /ALTER\s+TABLE/i.test(sql)) {
    for (const prod of prodPatterns) {
      const escaped = prod.replace(/\*/g, '.*').replace(/\?/g, '.');
      if (new RegExp(escaped, 'i').test(sql)) {
        pattern = `ALTER TABLE on production schema (${prod})`;
        break;
      }
    }
  }

  if (!pattern) { allow(); return; }

  // Log the safety decision
  if (safetyMode !== 'off') {
    appendJsonLine(SAFETY_LOG, { ts, tool: toolName, pattern, mode: safetyMode });
    appendJsonLine(SAFETY_AUDIT, { ts, tool: toolName, layer: 'layer1', pattern, mode: safetyMode });
  }

  // CocoMeter: record tool call start time for duration tracking in PostToolUse
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocometer.on'))) {
    appendJsonLine(path.join(COCOPLUS_DIR, 'meter', 'tool-timing.jsonl'), {
      tool: toolName, start: ts,
    });
  }

  switch (safetyMode) {
    case 'strict':
      block(`SnowflakeSqlExecute: ${pattern} detected in safety.strict mode. This operation is blocked. Switch to $safety normal to allow with confirmation.`);
      break;
    case 'normal':
    default:
      allow(`SnowflakeSqlExecute: ${pattern} detected in safety.normal mode. This is allowed but flagged.`);
  }
}

try {
  main();
} catch (err) {
  logError('pre-tool-use', err.message);
  allow(); // fail-open: never block on hook error
}
