#!/usr/bin/env node
/**
 * CocoPlus PreToolUse hook — cross-platform (Node.js)
 *
 * Stdin JSON format from Coco:
 *   { "tool": "SnowflakeSqlExecute", "parameters": { "sql": "...", ... } }
 *
 * Stdout JSON response:
 *   {"action":"allow"}
 *   {"action":"block","reason":"..."}
 *   {"action":"allow","warning":"..."}
 *
 * Features: Safety Gate (hard layer), CocoMeter timing start.
 * Must complete in <10ms — no expensive I/O beyond mode file existence check.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, logError, readStdinJson } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SAFETY_LOG   = path.join(COCOPLUS_DIR, 'safety-decisions.log');

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

  // Only intercept SnowflakeSqlExecute
  if (toolName !== 'SnowflakeSqlExecute') { allow(); return; }
  appendJsonLine(HOOK_LOG, { hook: 'pre-tool-use', tool: toolName, ts });

  // Extract SQL from parameters.sql (spec-defined path)
  const params = event.parameters || {};
  const sql    = params.sql || params.query || params.statement || '';

  // Determine safety mode from flag files (fast existence check only)
  let safetyMode = 'normal'; // default per spec
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.off')))    safetyMode = 'off';
  else if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.strict'))) safetyMode = 'strict';
  else if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.normal'))) safetyMode = 'normal';

  // Safety off: pass through immediately
  if (safetyMode === 'off') { allow(); return; }

  // Detect destructive pattern
  let pattern = null;
  for (const { re, label } of DESTRUCTIVE_PATTERNS) {
    if (re.test(sql)) { pattern = label; break; }
  }

  // Check production schema patterns in ALTER TABLE using safety-config.json
  if (!pattern && /ALTER\s+TABLE/i.test(sql)) {
    let productionPatterns = [];
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(COCOPLUS_DIR, 'safety-config.json'), 'utf8'));
      productionPatterns = cfg.production_schema_patterns || cfg.production_patterns || [];
    } catch (_) { /* file may not exist yet */ }

    for (const prod of productionPatterns) {
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
  }

  // CocoMeter: record tool call start time for duration tracking in PostToolUse
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocometer.on'))) {
    appendJsonLine(path.join(COCOPLUS_DIR, 'meter', 'tool-timing.jsonl'), {
      tool: toolName, start: ts,
    });
  }

  switch (safetyMode) {
    case 'strict':
      block(`SnowflakeSqlExecute: ${pattern} detected in safety.strict mode. This operation is blocked. Switch to /safety normal to allow with confirmation.`);
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
