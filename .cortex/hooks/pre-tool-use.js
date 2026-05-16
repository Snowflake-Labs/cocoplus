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

const COCOPLUS_DIR  = '.cocoplus';
const HOOK_LOG      = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SAFETY_LOG    = path.join(COCOPLUS_DIR, 'safety-decisions.log');
const SAFETY_AUDIT  = path.join(COCOPLUS_DIR, 'safety-audit.jsonl');

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

function main() {
  // No-op if CocoPlus not initialized
  if (!fs.existsSync(COCOPLUS_DIR)) { allow(); return; }

  const ts = isoUtc();

  // Read structured event from stdin
  const event    = readStdinJson();
  const toolName = event.tool || process.env.COCO_TOOL_NAME || 'unknown';
  const params   = event.parameters || {};

  // --- Step 1: Prompt injection defense scan (planning artifacts on Read) ---
  if (toolName === 'Read' || toolName === 'mcp__files_read') {
    const filePath = params.file_path || params.path || '';
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

  // Determine safety mode from flag files (fast existence check only)
  let safetyMode = 'normal'; // default per spec
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.off')))    safetyMode = 'off';
  else if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.strict'))) safetyMode = 'strict';
  else if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.normal'))) safetyMode = 'normal';

  // Safety off: pass through immediately (EHRB still runs regardless)
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
