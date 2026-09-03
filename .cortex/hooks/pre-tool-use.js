#!/usr/bin/env node
/**
 * CocoPlus PreToolUse hook — cross-platform (Node.js)
 *
 * Stdin JSON format from Coco:
 *   { "tool": "SnowflakeSqlExecute", "parameters": { "sql": "...", ... } }
 *   { "tool_name": "SnowflakeSqlExecute", "tool_input": { "sql": "...", ... } }
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
const crypto = require('crypto');
const { isoUtc, appendJsonLine, logError, readStdinJson, normalizeToolEvent } = require('./_common.js');
const { loadConfig } = require('./_v2-state.js');

const COCOPLUS_DIR  = '.cocoplus';
const HOOK_LOG      = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SAFETY_LOG    = path.join(COCOPLUS_DIR, 'safety-decisions.log');
const SAFETY_AUDIT  = path.join(COCOPLUS_DIR, 'safety-audit.jsonl');
const GOVERNANCE_LOG = path.join(COCOPLUS_DIR, 'lifecycle', 'governance-log.json');
const POLICY_DECISIONS = path.join(COCOPLUS_DIR, 'lifecycle', 'policy-decisions.jsonl');
const AUDIT_MD = path.join(COCOPLUS_DIR, 'lifecycle', 'audit.md');
const STEER_INBOX = path.join(COCOPLUS_DIR, 'STEER.md');
const STAGE_EVIDENCE = path.join(COCOPLUS_DIR, 'session', 'stage-evidence.json');
const POLICY_INSTRUCTIONS = path.join(COCOPLUS_DIR, 'session', 'policy-instructions.jsonl');
const POLICY_REPEAT_STATE = path.join(COCOPLUS_DIR, 'session', 'policy-repeat-state.json');
const PROPOSAL_LOG = path.join(COCOPLUS_DIR, 'proposals', 'proposal-log.jsonl');
const FLOW_ARTIFACT_ROOT = path.join(COCOPLUS_DIR, 'flow', 'artifacts');
const SESSION_BUDGET_STATE = path.join(COCOPLUS_DIR, 'session', 'budget-state.json');
const OPEN_PRE_TOOL_USE = path.join(COCOPLUS_DIR, 'session', 'open-pre-tool-use.json');
const INIT_CONFIRMATION = path.join(COCOPLUS_DIR, 'lifecycle', 'cocoplus-init.json');

const COMPLEXITY_TIERS = [
  { name: 'trivial', max: 20 },
  { name: 'simple', max: 40 },
  { name: 'moderate', max: 60 },
  { name: 'hard', max: 80 },
  { name: 'open-ended', max: Infinity },
];
const LOW_EFFORT = /\b(typo|rename|format|lint|bump|comment|copy|fix spelling)\b/i;
const HIGH_EFFORT = /\b(refactor|migrate|architect|rewrite|debug|investigate|redesign|implement|integrate)\b/i;
const BROAD_SCOPE = /\b(the whole|entire|every|all of|across|multi[-\s]?schema|end[-\s]?to[-\s]?end)\b/i;
const ACCEPTANCE = /\b(run (the )?(tests?|validation)|so .* passes|done when|verify|confirm|acceptance|success criteria)\b/i;
const AMBIGUITY = /\b(figure out|somehow|explore|investigate why|find out|unclear|unknown|maybe|probably|what is wrong|why .* failing)\b/i;

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
    const escaped = wildcardPatternToRegex(prod);
    if (safeRegexTest(escaped, sql, 'ehrb-production-pattern') && /\b(DDL|DROP|ALTER|CREATE\s+OR\s+REPLACE)\b/i.test(sql)) {
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

function appendAudit(text) {
  fs.mkdirSync(path.dirname(AUDIT_MD), { recursive: true });
  fs.appendFileSync(AUDIT_MD, `${text}\n`, 'utf8');
}

function configValue(config, sections, key, fallback) {
  for (const section of sections) {
    if (config[section] && config[section][key] !== undefined) return config[section][key];
  }
  return fallback;
}

function runtimePolicyEnabled(config) {
  return configValue(config, ['safety', 'security'], 'runtime_policy_engine', true) !== false;
}

function policyLogAll(config) {
  return configValue(config, ['safety', 'security'], 'policy_log_all', false) === true;
}

function configuredProductionPrefixes(config) {
  const values = configValue(config, ['safety', 'security', 'project'], 'production_schema_prefixes', ['PROD.', 'PRODUCTION.']);
  if (Array.isArray(values)) return values;
  if (typeof values === 'string' && values.trim()) return values.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function sqlOperation(sql) {
  const normalized = String(sql || '').replace(/\s+/g, ' ').trim();
  const patterns = [
    [/^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([A-Za-z0-9_.$"]+)/i, 'DROP TABLE'],
    [/^\s*TRUNCATE\s+(?:TABLE\s+)?([A-Za-z0-9_.$"]+)/i, 'TRUNCATE'],
    [/^\s*DELETE\s+FROM\s+([A-Za-z0-9_.$"]+)/i, 'DELETE FROM'],
    [/^\s*ALTER\s+TABLE\s+([A-Za-z0-9_.$"]+)/i, 'ALTER TABLE'],
    [/^\s*COPY\s+INTO\s+([A-Za-z0-9_.$"]+)/i, 'COPY INTO'],
    [/^\s*SELECT\b/i, 'SELECT'],
  ];
  for (const [pattern, type] of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const target = (match[1] || '').replace(/"/g, '');
    return { type, target, label: `${type}${target ? ` on ${target}` : ''}` };
  }
  return { type: 'UNKNOWN', target: '', label: normalized.slice(0, 80) };
}

function targetMatchesProduction(target, prefixes) {
  const upperTarget = String(target || '').toUpperCase();
  return prefixes.some((prefix) => {
    const normalized = String(prefix || '').replace(/\*/g, '').toUpperCase();
    return normalized && upperTarget.startsWith(normalized);
  });
}

function policyFileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function unsafeRegexReason(pattern) {
  const text = String(pattern || '');
  if (text.length > 160) return 'pattern exceeds 160 characters';
  if (/[^\x09\x0a\x0d\x20-\x7e]/.test(text)) return 'pattern contains non-printable characters';
  if (/\([^)]*[+*][^)]*\)\s*[+*?{]/.test(text)) return 'nested quantifier pattern';
  if (/\([^)]*\{[^}]+}[^)]*\)\s*[+*?{]/.test(text)) return 'nested bounded quantifier pattern';
  if (/(?:\.\*){3,}/.test(text)) return 'excessive wildcard repetition';
  return null;
}

function safeRegexTest(pattern, input, context) {
  const reason = unsafeRegexReason(pattern);
  if (reason) {
    appendJsonLine(HOOK_LOG, {
      hook: 'pre-tool-use',
      action: 'unsafe_regex_skipped',
      context,
      reason,
      pattern: String(pattern || '').slice(0, 120),
      ts: isoUtc(),
    });
    return false;
  }
  try {
    return new RegExp(pattern, 'i').test(input);
  } catch (err) {
    appendJsonLine(HOOK_LOG, {
      hook: 'pre-tool-use',
      action: 'invalid_regex_skipped',
      context,
      error: err.message,
      pattern: String(pattern || '').slice(0, 120),
      ts: isoUtc(),
    });
    return false;
  }
}

function wildcardPatternToRegex(pattern) {
  return String(pattern || '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
}

function parsePolicyFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (/\.json$/i.test(filePath)) return JSON.parse(text);
  const policy = {};
  let nested = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const nestedMatch = rawLine.match(/^\s{2,}([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
    if (nested && nestedMatch) {
      const rawValue = nestedMatch[2].trim();
      const value = /^\[[^\]]*\]$/.test(rawValue)
        ? rawValue.slice(1, -1).split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
        : rawValue.replace(/^['"]|['"]$/g, '');
      nested[nestedMatch[1].replace(/-/g, '_')] = value;
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
    const objectStart = line.match(/^([A-Za-z0-9_-]+)\s*:\s*$/);
    if (objectStart) {
      nested = {};
      policy[objectStart[1].replace(/-/g, '_')] = nested;
      continue;
    }
    if (!match) continue;
    nested = null;
    const key = match[1].replace(/-/g, '_');
    const rawValue = match[2].trim();
    policy[key] = /^\[[^\]]*\]$/.test(rawValue)
      ? rawValue.slice(1, -1).split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
      : rawValue.replace(/^['"]|['"]$/g, '');
  }
  return policy;
}

function loadPolicyFiles() {
  const dir = path.join(COCOPLUS_DIR, 'lifecycle', 'policies');
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(json|ya?ml)$/i.test(entry.name))
      .map((entry) => {
        const filePath = path.join(dir, entry.name);
        try {
          const stat = fs.lstatSync(filePath);
          if (!stat.isFile() || stat.isSymbolicLink()) {
            appendJsonLine(HOOK_LOG, {
              hook: 'pre-tool-use',
              action: 'runtime_policy_file_skipped',
              file: entry.name,
              error: 'policy file must be a regular file',
              ts: isoUtc(),
            });
            return null;
          }
          const policy = parsePolicyFile(filePath);
          policy.name = policy.name || entry.name.replace(/\.(json|ya?ml)$/i, '');
          policy.source_file = path.join(dir, entry.name).replace(/\\/g, '/');
          policy.source_sha256 = policyFileHash(filePath);
          return policy;
        } catch (err) {
          appendJsonLine(HOOK_LOG, {
            hook: 'pre-tool-use',
            action: 'runtime_policy_file_skipped',
            file: entry.name,
            error: err.message,
            ts: isoUtc(),
          });
          return null;
        }
      })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function customPolicyDecision(policy, params, sql, operation, ts) {
  const pattern = policy.sql_pattern || policy.pattern || policy.regex || '';
  let matched = false;
  if (pattern) {
    matched = safeRegexTest(pattern, sql, `runtime-policy:${policy.name || 'unnamed'}`);
  } else if (policy.match && typeof policy.match === 'object') {
    matched = policyMatch(policy.match, operation);
  }
  if (!matched) return null;
  const decision = String(policy.decision || policy.action || 'instruct').toLowerCase();
  if (!['allow', 'deny', 'instruct'].includes(decision)) return null;
  const policyName = policy.name || 'custom-policy';
  const repeatsEscalate = policy.escalate_on_repeat === true || policy.escalate_on_repeat === 'true';
  const repeated = repeatsEscalate && seenPolicyInstruction(policyName, operation);
  if (decision === 'instruct' && repeatsEscalate && !repeated) {
    markPolicyInstruction(policyName, operation, ts);
  }
  return {
    ts,
    stage_id: currentStageId(params),
    step_id: params.step_id || params.step || '',
    operation: operation.type,
    target: operation.target,
    decision: repeated ? 'deny' : decision,
    policy: policyName,
    message: repeated
      ? `Custom runtime policy ${policyName} was already instructed in this session and escalated on repeat.`
      : policy.message || `Custom runtime policy ${decision}: ${policyName || pattern}`,
    excerpt: String(sql || '').slice(0, 500),
    source_file: policy.source_file || '',
    source_sha256: policy.source_sha256 || '',
  };
}

function policyValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).replace(/"/g, '').toUpperCase());
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim().replace(/"/g, '').toUpperCase());
  return [];
}

function policyMatch(match, operation) {
  const operations = policyValues(match.operations || match.operation);
  const schemas = policyValues(match.schemas || match.schema);
  const tables = policyValues(match.tables || match.table);
  const op = String(operation.type || '').toUpperCase();
  const target = String(operation.target || '').replace(/"/g, '').toUpperCase();
  const parts = target.split('.');
  const table = parts[parts.length - 1] || '';
  const schema = parts.length >= 2 ? `${parts[parts.length - 2]}.` : '';
  const fullSchema = parts.length >= 3 ? `${parts[0]}.${parts[1]}.` : schema;

  if (operations.length && !operations.some((item) => op === item || op.startsWith(item))) return false;
  if (schemas.length && !schemas.some((item) => fullSchema.startsWith(item) || schema.startsWith(item) || target.startsWith(item))) return false;
  if (tables.length && !tables.includes(table) && !tables.includes(target)) return false;
  return true;
}

function evaluateCustomPolicies(params, sql, operation, ts, options = {}) {
  const instructions = [];
  for (const policy of loadPolicyFiles()) {
    if (options.names && !options.names.has(policy.name)) continue;
    const decision = customPolicyDecision(policy, params, sql, operation, ts);
    if (!decision) continue;
    if (decision.decision === 'deny' || decision.decision === 'allow') return decision;
    if (decision.decision === 'instruct') instructions.push(decision);
  }
  if (instructions.length === 0) return null;
  const first = instructions[0];
  return Object.assign({}, first, {
    policy: instructions.map((item) => item.policy).join(', '),
    message: instructions.map((item) => item.message).join('\n'),
  });
}

function deleteWithoutWhere(sql) {
  return /\bDELETE\s+FROM\b/i.test(sql) && !/\bWHERE\b/i.test(sql);
}

function currentStageTier(params) {
  const stage = findStage(currentStageId(params));
  return String(stage.complexity_tier || stage.contract_tier || stage.model_tier_floor || params.complexity_tier || '').toLowerCase();
}

function policyStateKey(policyName, operation) {
  return `${policyName}:${operation.target || operation.label}`.toLowerCase();
}

function seenPolicyInstruction(policyName, operation) {
  const state = readJsonFile(POLICY_REPEAT_STATE, {});
  return Boolean(state[policyStateKey(policyName, operation)]);
}

function markPolicyInstruction(policyName, operation, ts) {
  const state = readJsonFile(POLICY_REPEAT_STATE, {});
  state[policyStateKey(policyName, operation)] = ts;
  writeJsonFile(POLICY_REPEAT_STATE, state);
}

function logPolicyDecision(config, decision) {
  const record = Object.assign({
    ts: isoUtc(),
    stage_id: '',
    step_id: '',
    tool: 'SnowflakeSqlExecute',
    decision: 'allow',
    policy: 'none',
    operation: 'UNKNOWN',
    target: '',
    message: '',
    excerpt: '',
  }, decision);
  if (record.decision !== 'allow' || policyLogAll(config)) {
    appendJsonLine(POLICY_DECISIONS, record);
  }
  if (record.decision === 'deny' || record.decision === 'instruct') {
    appendAudit(`- ${record.ts} runtime policy ${record.decision}: ${record.policy} | ${record.operation}${record.target ? ` ${record.target}` : ''} | ${record.message}`);
  }
  if (record.decision === 'instruct') {
    appendJsonLine(POLICY_INSTRUCTIONS, record);
  }
}

function evaluateRuntimePolicy(config, params, sql, ts) {
  if (!runtimePolicyEnabled(config)) return { decision: 'disabled' };
  const safetyConfig = config.safety || config.security || {};
  const operation = sqlOperation(sql);
  const prefixes = configuredProductionPrefixes(config);
  const builtInPolicies = new Set([
    'block-drop-table-production',
    'block-truncate',
    'block-delete-without-where',
    'block-alter-table-production',
  ]);
  const customBuiltInOverride = evaluateCustomPolicies(params, sql, operation, ts, { names: builtInPolicies });
  if (customBuiltInOverride) {
    const allowOverrides = safetyConfig.allow_custom_policy_overrides === true ||
      safetyConfig.allow_custom_policy_overrides === 'true';
    if (customBuiltInOverride.decision === 'allow' && builtInPolicies.has(customBuiltInOverride.policy) && !allowOverrides) {
      return Object.assign(customBuiltInOverride, {
        decision: 'deny',
        policy: 'custom_allow_override_disabled',
        message: `Custom policy ${customBuiltInOverride.policy} attempted to allow a built-in policy override. Set [safety].allow_custom_policy_overrides = true only when Snowflake-side controls are the authoritative boundary.`,
      });
    }
    return customBuiltInOverride;
  }
  const stageId = currentStageId(params);
  const base = {
    ts,
    stage_id: stageId,
    step_id: params.step_id || params.step || '',
    operation: operation.type,
    target: operation.target,
    excerpt: String(sql || '').slice(0, 500),
  };

  if (safetyConfig.block_drop_table_production !== false && /\bDROP\s+TABLE\b/i.test(sql) && targetMatchesProduction(operation.target, prefixes)) {
    return Object.assign(base, {
      decision: 'deny',
      policy: 'block-drop-table-production',
      message: 'DROP TABLE on production schema is blocked. Use a CocoFlow stage with schema-change complexity tier and explicit operator approval.',
    });
  }

  if (safetyConfig.block_truncate !== false && /\bTRUNCATE(?:\s+TABLE)?\b/i.test(sql) && !/\birreversible\b/i.test(currentStageTier(params))) {
    return Object.assign(base, {
      decision: 'deny',
      policy: 'block-truncate',
      message: 'TRUNCATE is blocked by default because it is irreversible. Declare the stage as irreversible complexity tier and obtain explicit CocoContract approval.',
    });
  }

  if (safetyConfig.block_delete_without_where !== false && deleteWithoutWhere(sql)) {
    const policyName = 'block-delete-without-where';
    if (seenPolicyInstruction(policyName, operation)) {
      return Object.assign(base, {
        decision: 'deny',
        policy: policyName,
        message: 'DELETE without WHERE was already flagged in this session. Add a WHERE clause before proceeding.',
      });
    }
    markPolicyInstruction(policyName, operation, ts);
    return Object.assign(base, {
      decision: 'instruct',
      policy: policyName,
      message: 'This DELETE has no WHERE clause. Add a WHERE clause to scope the deletion, or declare the stage as data-write complexity tier with an explicit row-count pre-check.',
    });
  }

  if (safetyConfig.block_alter_table_production !== false && /\bALTER\s+TABLE\b/i.test(sql) && targetMatchesProduction(operation.target, prefixes) && !/\bschema-change\b/i.test(currentStageTier(params))) {
    return Object.assign(base, {
      decision: 'deny',
      policy: 'block-alter-table-production',
      message: 'ALTER TABLE on production requires schema-change complexity tier in the CocoFlow stage definition. Declare the tier before dispatch.',
    });
  }

  const customDecision = evaluateCustomPolicies(params, sql, operation, ts);
  if (customDecision) return customDecision;

  return Object.assign(base, {
    decision: 'allow',
    policy: 'built-in-default',
    message: 'No runtime policy matched.',
  });
}

function isGateWeakeningSteer(text) {
  return /\b(skip|bypass|disable|ignore|remove|turn\s+off)\b.*\b(qa|quality|critic|review|sentinel|secondeye|evidence|gate|checkpoint|stop_after|run_policy)\b/i.test(text) ||
    /\b(reverse|override|dismiss|clear)\b.*\b(blocking|blocked|fail|rejection|verdict)\b/i.test(text) ||
    /\ballow_irreversible_actions\s*=\s*true\b/i.test(text) ||
    /\b(merge_policy|stop_after|run_policy)\b.*\b(change|set|alter|override)\b/i.test(text);
}

function updateFlowState(mutator) {
  const flowStatePath = path.join(COCOPLUS_DIR, 'lifecycle', 'flow-state.json');
  const state = readJsonFile(flowStatePath, {});
  mutator(state);
  writeJsonFile(flowStatePath, state);
}

function drainSteerInboxAtStageTransition(params, ts) {
  if (!isStageBoundaryDispatch(params) || !fs.existsSync(STEER_INBOX)) return null;
  let text = '';
  try { text = fs.readFileSync(STEER_INBOX, 'utf8').trim(); } catch (_) { return null; }
  if (!text) {
    try { fs.unlinkSync(STEER_INBOX); } catch (_) { /* already gone */ }
    return null;
  }

  if (isGateWeakeningSteer(text)) {
    appendJsonLine(HOOK_LOG, {
      hook: 'pre-tool-use',
      action: 'gate_weakening_refused',
      stage_id: currentStageId(params),
      instruction: text.slice(0, 160),
      ts,
    });
    appendAudit(`- ${ts} gate-weakening steer refused at stage transition: ${text.slice(0, 240)}`);
    updateFlowState((state) => {
      state.gate_weakening_refusals = Number(state.gate_weakening_refusals || 0) + 1;
      state.last_gate_weakening_refusal_at = ts;
      state.last_inbox_drain_at = ts;
    });
    try { fs.unlinkSync(STEER_INBOX); } catch (_) { /* already gone */ }
    return 'CocoFlow refused a STEER.md message that would weaken an active governance gate. Change run policy in cocoplus.toml and start a new run if that is intentional.';
  }

  appendJsonLine(path.join(COCOPLUS_DIR, 'session', 'steps.jsonl'), {
    ts,
    action: 'steer_inbox_drained',
    source: 'hook.pre-tool-use',
    stage_id: currentStageId(params),
    instruction: text.slice(0, 1000),
  });
  updateFlowState((state) => {
    state.last_inbox_drain_at = ts;
    state.last_steer_stage_id = currentStageId(params);
  });
  try { fs.unlinkSync(STEER_INBOX); } catch (_) { /* already gone */ }
  return null;
}

function runPolicy(config) {
  const policy = config.run_policy || {};
  const stopAfter = Array.isArray(policy.stop_after) ? policy.stop_after : [];
  return {
    merge_policy: policy.merge_policy || 'none',
    allow_irreversible_actions: policy.allow_irreversible_actions === true || policy.allow_irreversible_actions === 'true',
    stop_after: stopAfter.map(String),
  };
}

function policySnapshotPath(runId) {
  return path.join(COCOPLUS_DIR, 'lifecycle', 'cocoflow', runId, 'policy-snapshot.json');
}

function ensurePolicySnapshot(config, params, ts) {
  if (!isStageBoundaryDispatch(params)) return;
  const runId = flowRunId(params);
  const snapshotPath = policySnapshotPath(runId);
  if (fs.existsSync(snapshotPath)) return;
  const snapshot = runPolicy(config);
  snapshot.run_id = runId;
  snapshot.declared_at = ts;
  snapshot.source = 'cocoplus.toml';
  writeJsonFile(snapshotPath, snapshot);
  appendJsonLine(HOOK_LOG, { hook: 'pre-tool-use', action: 'run_policy_snapshotted', run_id: runId, ts });
}

function rankModelTier(tier) {
  const key = String(tier || '').toLowerCase();
  const ranks = {
    smol: 1,
    haiku: 1,
    regular: 2,
    sonnet: 2,
    smart: 3,
    ultra: 4,
    opus: 4,
  };
  return ranks[key] || 0;
}

function strongerModelTier(left, right) {
  return rankModelTier(left) >= rankModelTier(right) ? left : right;
}

function configuredDefaultModelTier(config) {
  const flowConfig = config.flow || {};
  const modelRoles = config.model_roles || {};
  return flowConfig.model_tier_default || modelRoles.worker || 'regular';
}

function ensureStagePolicySnapshot(config, params, ts) {
  if (!isStageBoundaryDispatch(params)) return;
  const stageId = currentStageId(params);
  const stage = findStage(stageId);
  if (!stage) return;

  const declaredFloor = stage.model_tier_floor || stage.model_floor || null;
  const defaultTier = configuredDefaultModelTier(config);
  const effective = declaredFloor ? strongerModelTier(defaultTier, declaredFloor) : defaultTier;
  const runId = flowRunId(params);
  const snapshotPath = policySnapshotPath(runId);
  const snapshot = readJsonFile(snapshotPath, runPolicy(config));
  if (!snapshot.stages) snapshot.stages = {};
  snapshot.stages[stageId] = {
    ...(snapshot.stages[stageId] || {}),
    model_tier_default: defaultTier,
    model_tier_floor: declaredFloor,
    effective_model_tier: effective,
    model_tier_resolved_at: ts,
  };
  writeJsonFile(snapshotPath, snapshot);

  if (declaredFloor && effective === declaredFloor && rankModelTier(declaredFloor) > rankModelTier(defaultTier)) {
    appendJsonLine(HOOK_LOG, {
      hook: 'pre-tool-use',
      action: 'model_tier_floor_applied',
      run_id: runId,
      stage_id: stageId,
      default_tier: defaultTier,
      floor_tier: declaredFloor,
      effective_model_tier: effective,
      ts,
    });
  }
}

function activePolicy(config, params) {
  const runId = flowRunId(params);
  return readJsonFile(policySnapshotPath(runId), runPolicy(config));
}

function checkRunPolicyBoundary(config, params, ts) {
  if (!isStageBoundaryDispatch(params)) return null;
  const policy = activePolicy(config, params);
  const previousStage = params.previous_stage_id || params.previous_stage || process.env.COCOPLUS_PREVIOUS_STAGE_ID || '';
  if (previousStage && Array.isArray(policy.stop_after) && policy.stop_after.includes(String(previousStage))) {
    updateFlowState((state) => {
      state.paused_by_run_policy = true;
      state.paused_after_stage = previousStage;
      state.paused_at = ts;
    });
    appendJsonLine(HOOK_LOG, { hook: 'pre-tool-use', action: 'run_policy_stop_after_paused', stage_id: previousStage, ts });
    return `CocoFlow run policy paused after stage "${previousStage}". Resume explicitly before dispatching the next stage.`;
  }
  return null;
}

function sqlIsIrreversible(sql) {
  return /\b(DROP|TRUNCATE|DELETE|ALTER|MERGE|GRANT|REVOKE)\b/i.test(sql);
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

function isStageBoundaryDispatch(params) {
  return shouldCheckArtifactReads(params) ||
    params.action === 'dispatch_stage' ||
    params.cocoplus_action === 'dispatch_stage' ||
    process.env.COCOPLUS_STAGE_DISPATCH === 'true';
}

function budgetEnforcementEnabled(config) {
  const session = config.session || {};
  const limit = Number(session.budget_limit) || 0;
  return limit > 0 && (session.budget_enforcement || 'stage-boundary') !== 'none';
}

function checkBudgetBoundary(config, params, ts) {
  if (!budgetEnforcementEnabled(config) || !isStageBoundaryDispatch(params)) return null;
  const state = readJsonFile(SESSION_BUDGET_STATE, { budget_state: 'normal' });
  const budgetState = state.budget_state || 'normal';
  if (budgetState === 'reserve' || budgetState === 'exhausted') {
    appendJsonLine(HOOK_LOG, {
      hook: 'pre-tool-use',
      action: 'budget_boundary_blocked',
      budget_state: budgetState,
      stage_id: currentStageId(params),
      ts,
    });
    return `CocoSession budget is in ${budgetState} state. New CocoFlow stages cannot start; use the remaining budget for landing work, handoff, or a larger-budget rerun.`;
  }
  return null;
}

function complexityEnabled(config) {
  const flowConfig = config.flow || {};
  const harnessConfig = config.harness || {};
  return flowConfig.complexity_estimation === true ||
    flowConfig.complexity_estimation === 'true' ||
    harnessConfig.trivial_floor_invariant === true ||
    harnessConfig.trivial_floor_invariant === 'true';
}

function taskDescription(params) {
  return params.description ||
    params.task ||
    params.prompt ||
    params.objective ||
    params.outcome ||
    params.query ||
    process.env.COCOPLUS_TASK_DESCRIPTION ||
    '';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tierFor(score) {
  return COMPLEXITY_TIERS.find((tier) => score <= tier.max).name;
}

function scoreDescription(description) {
  const text = String(description || '').trim();
  const words = text ? text.split(/\s+/).length : 0;
  const enumeratedSteps = (text.match(/(?:^|\s)(?:\d+\.|[-*])\s+/g) || []).length;
  const fileMentions = (text.match(/\b[\w.-]+\.(sql|js|ts|py|md|json|toml|html|yml|yaml)\b/gi) || []).length;

  const signals = {
    length: words > 80 ? 18 : words > 40 ? 10 : words > 18 ? 5 : 0,
    low_effort: LOW_EFFORT.test(text) ? -12 : 0,
    high_effort: HIGH_EFFORT.test(text) ? 18 : 0,
    scope_breadth: BROAD_SCOPE.test(text) || fileMentions > 3 ? 16 : fileMentions > 1 ? 8 : 0,
    acceptance_check: ACCEPTANCE.test(text) ? -6 : 0,
    ambiguity: AMBIGUITY.test(text) ? 60 : 0,
    step_count: enumeratedSteps >= 4 ? 12 : enumeratedSteps >= 2 ? 6 : 0,
  };

  let score = 24 + Object.values(signals).reduce((sum, value) => sum + value, 0);
  if (!text) score = 50;
  score = clamp(score, 0, 100);

  return {
    description: text,
    tier: tierFor(score),
    score,
    signals,
    ambiguity_score: Math.max(0, signals.ambiguity),
    has_acceptance_check: signals.acceptance_check < 0,
  };
}

function harnessFor(estimate, budgetStateValue, configured = {}) {
  const tierFloors = {
    trivial: { model: 'regular', thinking_effort: 'low' },
    simple: { model: 'regular', thinking_effort: 'low' },
    moderate: { model: 'smart', thinking_effort: 'medium' },
    hard: { model: 'smart', thinking_effort: 'high' },
    'open-ended': { model: 'smart', thinking_effort: 'high' },
  };
  const quotaCaps = {
    normal: { parallelism: configured.parallelism, retry_budget: configured.retry_budget },
    reserve: { parallelism: 2, retry_budget: 1 },
    exhausted: { parallelism: 1, retry_budget: 0 },
  };
  return {
    complexity_floor: tierFloors[estimate.tier] || tierFloors.moderate,
    quota_cap: quotaCaps[budgetStateValue] || quotaCaps.normal,
    invariant: 'complexity sets model/effort floor; quota caps parallelism/retry only',
  };
}

function flowRunId(params) {
  const flow = activeFlow();
  return params.run_id ||
    params.flow_run_id ||
    process.env.COCOPLUS_RUN_ID ||
    flow.run_id ||
    flow.id ||
    `run-${Date.now()}`;
}

function sessionId() {
  return process.env.COCO_SESSION_ID ||
    process.env.CORTEX_SESSION_ID ||
    'unknown';
}

function recordOpenPreToolUse(event, toolName, params, ts) {
  const registry = readJsonFile(OPEN_PRE_TOOL_USE, { open: [] });
  const open = Array.isArray(registry.open) ? registry.open : [];
  open.push({
    session_id: event.session_id || sessionId(),
    tool_name: toolName,
    tool_input: params,
    timestamp: ts,
  });
  writeJsonFile(OPEN_PRE_TOOL_USE, { open: open.slice(-100) });
}

function gateClearancePath(config, runId) {
  const flowStage = config.flow_stage || config['flow.stage'] || {};
  const configured = flowStage.human_gate_clearance_file || '';
  if (configured) {
    return configured.replace('<run-id>', runId).replace('[run-id]', runId);
  }
  return path.join(COCOPLUS_DIR, 'lifecycle', 'cocoflow', runId, 'gate-clearances.json');
}

function humanGateCleared(config, runId, stageId) {
  const clearances = readJsonFile(gateClearancePath(config, runId), { clearances: [] });
  const entries = Array.isArray(clearances.clearances) ? clearances.clearances : [];
  return entries.some((entry) => String(entry.stage_id || entry.stage || '') === String(stageId));
}

function checkHumanGate(config, params, ts) {
  if (!isStageBoundaryDispatch(params)) return null;
  const stageId = currentStageId(params);
  const stage = findStage(stageId);
  if (!stage || !(stage.human_gate === true || stage.human_gate === 'true')) return null;
  const runId = flowRunId(params);
  if (humanGateCleared(config, runId, stageId)) return null;
  updateFlowState((state) => {
    state.human_gate_waiting = true;
    state.human_gate_stage_id = stageId;
    state.human_gate_reason = stage.human_gate_reason || stage.reason || '';
    state.human_gate_blocked_at = ts;
  });
  appendJsonLine(HOOK_LOG, {
    hook: 'pre-tool-use',
    action: 'human_gate_blocked',
    run_id: runId,
    stage_id: stageId,
    reason: stage.human_gate_reason || stage.reason || '',
    ts,
  });
  return `CocoFlow human gate: stage "${stageId}" is waiting for operator clearance. Run $flow gate-clear ${stageId} before dispatch.`;
}

function checkFirstRunConfigurationGate(params, ts) {
  if (!isStageBoundaryDispatch(params)) return null;
  const config = loadConfig();
  const pilotConfig = config.cocopilot || {};
  if (pilotConfig.first_run_gate === false || pilotConfig.first_run_gate === 'false') return null;
  const pilotActive = fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocopilot.on')) ||
    pilotConfig.auto_activate === true ||
    pilotConfig.auto_activate === 'true';
  if (!pilotActive) return null;

  const initState = readJsonFile(INIT_CONFIRMATION, null);
  if (initState && initState.confirmed === true) return null;
  if (!initState) {
    writeJsonFile(INIT_CONFIRMATION, {
      confirmed: false,
      status: 'pending_confirmation',
      requested_at: ts,
      operator: (config.cocoplus && config.cocoplus.operator) || 'unknown',
      settings: [
        { name: 'default_warehouse', value: (config.cocoplus && config.cocoplus.default_warehouse) || 'COMPUTE_WH' },
        { name: 'cost_ceiling_per_run', value: (config.session && config.session.budget_limit) || 5.0 },
        { name: 'schema_prefix_prod', value: (config.cocoplus && config.cocoplus.schema_prefix_prod) || 'COCOPLUS_PROD' },
        { name: 'schema_prefix_dev', value: (config.cocoplus && config.cocoplus.schema_prefix_dev) || 'COCOPLUS_DEV' },
        { name: 'notification_target', value: (config.cocoplus && config.cocoplus.notification_target) || null },
      ],
      instructions: 'Confirm or update these settings before the first CocoPilot dispatch. Run $cocoplus reset-init to force this gate again.',
    });
  }
  appendJsonLine(HOOK_LOG, {
    hook: 'pre-tool-use',
    action: 'first_run_configuration_blocked',
    stage_id: currentStageId(params),
    artifact: 'lifecycle/cocoplus-init.json',
    ts,
  });
  return 'CocoPilot first-run configuration is pending. Confirm the five key settings in .cocoplus/lifecycle/cocoplus-init.json before dispatch, or run $cocoplus reset-init to restart the gate.';
}

function premortemEnabled(config) {
  const pilot = config.cocopilot || {};
  return pilot.premortem_enabled !== false && pilot.premortem_enabled !== 'false';
}

function premortemWarnOnAbsent(config) {
  const pilot = config.cocopilot || {};
  return pilot.premortem_warn_on_absent !== false && pilot.premortem_warn_on_absent !== 'false';
}

function premortemRequired(stage) {
  if (!stage) return false;
  if (stage.premortem === true || stage.premortem === 'true') return true;
  if (stage.premortem === false || stage.premortem === 'false') return false;
  return stage.allow_irreversible_actions === true ||
    stage.allow_irreversible_actions === 'true' ||
    stage.require_outcome_verification === true ||
    stage.require_outcome_verification === 'true';
}

function premortemStatePath(runId) {
  return path.join(COCOPLUS_DIR, 'lifecycle', 'cocoflow', runId, 'premortem-gates.json');
}

function premortemAcknowledged(runId, stageId) {
  const state = readJsonFile(premortemStatePath(runId), { stages: {} });
  const stageState = state.stages && state.stages[stageId];
  if (!(stageState && stageState.premortem_acknowledged === true)) return false;
  const progressPath = path.join(COCOPLUS_DIR, 'session', 'PROGRESS.md');
  try {
    const progress = fs.readFileSync(progressPath, 'utf8');
    const escapedStageId = String(stageId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^## Pre-Mortem:.*${escapedStageId}`, 'm').test(progress);
  } catch (_) {
    return false;
  }
}

function checkPremortemGate(config, params, ts) {
  if (!premortemEnabled(config) || !isStageBoundaryDispatch(params)) return null;
  const stageId = currentStageId(params);
  const stage = findStage(stageId);
  if (!premortemRequired(stage)) return null;
  const runId = flowRunId(params);
  if (premortemAcknowledged(runId, stageId)) return null;

  const statePath = premortemStatePath(runId);
  const state = readJsonFile(statePath, { run_id: runId, stages: {} });
  if (!state.stages) state.stages = {};
  state.stages[stageId] = {
    ...(state.stages[stageId] || {}),
    premortem_required: true,
    premortem_acknowledged: false,
    blocked_at: ts,
    reason: stage.require_outcome_verification === true || stage.require_outcome_verification === 'true'
      ? 'require_outcome_verification'
      : 'allow_irreversible_actions',
    warning_mode: premortemWarnOnAbsent(config) ? 'hold_until_acknowledged' : 'advisory_only',
  };
  writeJsonFile(statePath, state);
  appendJsonLine(HOOK_LOG, {
    hook: 'pre-tool-use',
    action: 'premortem_required',
    run_id: runId,
    stage_id: stageId,
    premortem_acknowledged: false,
    require_outcome_verification: Boolean(stage.require_outcome_verification === true || stage.require_outcome_verification === 'true'),
    ts,
  });

  if (!premortemWarnOnAbsent(config)) {
    return null;
  }

  return `CocoPilot pre-mortem gate: stage "${stageId}" requires a pre-dispatch pre-mortem before execution. Record three failure scenarios and prevention status in PROGRESS.md, then acknowledge this stage in ${statePath}.`;
}

function budgetState() {
  const state = readJsonFile(SESSION_BUDGET_STATE, { budget_state: 'normal' });
  return state.budget_state || 'normal';
}

function recordComplexityEstimate(config, params, ts) {
  if (!complexityEnabled(config) || !isStageBoundaryDispatch(params)) return;
  const runId = flowRunId(params);
  const outputPath = path.join(COCOPLUS_DIR, 'lifecycle', 'cocoflow', runId, 'complexity.json');
  if (fs.existsSync(outputPath)) return;

  const description = taskDescription(params);
  if (!description) return;

  try {
    const estimate = scoreDescription(description);
    const configuredHarness = config.harness || {};
    const applied = harnessFor(estimate, budgetState(), {
      parallelism: configuredHarness.parallelism || configuredHarness.max_parallelism,
      retry_budget: configuredHarness.retry_budget || configuredHarness.max_retries,
    });
    writeJsonFile(outputPath, {
      run_id: runId,
      estimated_at: ts,
      description,
      ...estimate,
      applied_harness: applied,
    });
    appendJsonLine(HOOK_LOG, {
      hook: 'pre-tool-use',
      action: 'complexity_estimated',
      run_id: runId,
      tier: estimate.tier,
      score: estimate.score,
      ambiguity_score: estimate.ambiguity_score,
      has_acceptance_check: estimate.has_acceptance_check,
      ts,
    });
  } catch (err) {
    logError('pre-tool-use', `complexity estimation failed: ${err.message}`);
  }
}

function main() {
  // No-op if CocoPlus not initialized
  if (!fs.existsSync(COCOPLUS_DIR)) { allow(); return; }

  const ts = isoUtc();

  // Read structured event from stdin
  const event    = normalizeToolEvent(readStdinJson());
  const toolName = event.toolName;
  const params   = event.params;
  const config   = loadConfig();
  recordOpenPreToolUse(event, toolName, params, ts);

  const steerBlock = drainSteerInboxAtStageTransition(params, ts);
  if (steerBlock) {
    block(steerBlock);
    return;
  }

  ensurePolicySnapshot(config, params, ts);
  ensureStagePolicySnapshot(config, params, ts);

  const firstRunBlock = checkFirstRunConfigurationGate(params, ts);
  if (firstRunBlock) {
    block(firstRunBlock);
    return;
  }

  const premortemBlock = checkPremortemGate(config, params, ts);
  if (premortemBlock) {
    block(premortemBlock);
    return;
  }

  const humanGateBlock = checkHumanGate(config, params, ts);
  if (humanGateBlock) {
    block(humanGateBlock);
    return;
  }

  const budgetBlock = checkBudgetBoundary(config, params, ts);
  if (budgetBlock) {
    block(budgetBlock);
    return;
  }

  const runPolicyBlock = checkRunPolicyBoundary(config, params, ts);
  if (runPolicyBlock) {
    block(runPolicyBlock);
    return;
  }

  recordComplexityEstimate(config, params, ts);

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
  const runtimePolicy = evaluateRuntimePolicy(config, params, sql, ts);
  if (runtimePolicy.decision === 'deny') {
    logPolicyDecision(config, runtimePolicy);
    block(`[Runtime Policy] ${runtimePolicy.policy}: ${runtimePolicy.message}`);
    return;
  }
  if (runtimePolicy.decision === 'instruct') {
    logPolicyDecision(config, runtimePolicy);
    allow(`[Runtime Policy] ${runtimePolicy.policy}: ${runtimePolicy.message}`);
    return;
  }
  if (runtimePolicy.decision === 'allow') {
    logPolicyDecision(config, runtimePolicy);
    if (runtimePolicy.policy !== 'built-in-default') {
      allow();
      return;
    }
  }

  const policy = activePolicy(config, params);
  if (!policy.allow_irreversible_actions && sqlIsIrreversible(sql)) {
    appendJsonLine(GOVERNANCE_LOG, {
      ts,
      policy: 'run_policy_irreversible_guard',
      tool: toolName,
      action: 'BLOCKED',
      stage_id: currentStageId(params),
      summary: sql.slice(0, 160),
    });
    block('[CocoFlow] Run policy blocks irreversible SQL. Set [run_policy] allow_irreversible_actions = true in cocoplus.toml and start a new run if this operation is intended.');
    return;
  }

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
      if (safeRegexTest(pattern, sql, 'boundary-tier-never')) {
        block(`[TIER 4 — NEVER] This operation matches a pattern that CocoPlus is configured to never execute: "${pattern}". This cannot be overridden. Edit boundary_tiers.never_patterns in safety-config.json to change this policy.`);
        appendJsonLine(SAFETY_AUDIT, { ts, tool: toolName, tier: 4, pattern, mode: 'never' });
        return;
      }
    }

    // Tier 3: HUMAN REQUIRED — hard stop requiring typed rationale
    for (const pattern of humanPatterns) {
      if (safeRegexTest(pattern, sql, 'boundary-tier-human-required')) {
        block(`[TIER 3 — HUMAN REQUIRED] This operation requires explicit human authorization: "${pattern}" matched. Provide written rationale and re-submit: "AUTHORIZED: <your reason>"`);
        appendJsonLine(SAFETY_AUDIT, { ts, tool: toolName, tier: 3, pattern, mode: 'human_required' });
        return;
      }
    }

    // Tier 2: ASK FIRST — confirmation prompt before execution
    for (const pattern of askFirstPatterns) {
      if (safeRegexTest(pattern, sql, 'boundary-tier-ask-first')) {
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
      const escaped = wildcardPatternToRegex(prod);
      if (safeRegexTest(escaped, sql, 'layer1-production-pattern')) {
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
