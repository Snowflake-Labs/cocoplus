#!/usr/bin/env node
/**
 * CocoPlus PreToolUse hook — cross-platform (Node.js)
 * Fires before every tool call.
 * Responsibilities: Safety Gate — intercept SnowflakeSqlExecute and block/warn
 * on destructive SQL patterns based on active safety mode.
 *
 * Output protocol: print a single JSON object to stdout.
 *   {"action":"allow"}                      → permit the tool call
 *   {"action":"block","reason":"..."}       → block with message shown to user
 *   {"action":"allow","warning":"..."}      → allow but surface a warning
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, logError } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SAFETY_LOG   = path.join(COCOPLUS_DIR, 'safety-decisions.log');

/** Destructive SQL patterns to detect */
const DESTRUCTIVE_PATTERNS = [
  { re: /DROP\s+(TABLE|DATABASE|SCHEMA|INDEX|PROCEDURE|FUNCTION)/i, label: 'DROP statement' },
  { re: /TRUNCATE\s+TABLE/i,                                         label: 'TRUNCATE TABLE' },
  { re: /DELETE\s+FROM\s+\S+\s*;?\s*$/i,                            label: 'DELETE without WHERE' },
  { re: /ALTER\s+TABLE\s+\S+.*DROP\s+COLUMN/i,                      label: 'ALTER TABLE DROP COLUMN' },
];

function allow(warning) {
  process.stdout.write(JSON.stringify(warning ? { action: 'allow', warning } : { action: 'allow' }) + '\n');
}

function block(reason) {
  process.stdout.write(JSON.stringify({ action: 'block', reason }) + '\n');
}

function main() {
  const toolName = process.env.COCO_TOOL_NAME || 'unknown';
  const ts       = isoUtc();

  // No-op if CocoPlus not initialized
  if (!fs.existsSync(COCOPLUS_DIR)) { allow(); return; }

  appendJsonLine(HOOK_LOG, { hook: 'pre-tool-use', tool: toolName, ts });

  // Only intercept SQL executor
  if (toolName !== 'SnowflakeSqlExecute') { allow(); return; }

  // Extract SQL from COCO_TOOL_INPUT (JSON env var set by Coco)
  let input = process.env.COCO_TOOL_INPUT || '';
  if (!input) {
    try { input = fs.readFileSync('/dev/fd/0', 'utf8'); } catch (_) { }
  }
  let sql = input;
  try {
    const parsed = JSON.parse(input);
    sql = parsed.sql || parsed.query || parsed.statement || input;
  } catch (_) { /* use raw input */ }

  // Detect destructive pattern
  let pattern = null;
  for (const { re, label } of DESTRUCTIVE_PATTERNS) {
    if (re.test(sql)) { pattern = label; break; }
  }

  if (!pattern) { allow(); return; }

  // Determine safety mode from flag files
  let safetyMode = 'normal';
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.strict'))) safetyMode = 'strict';
  else if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'safety.off'))) safetyMode = 'off';

  if (safetyMode !== 'off') {
    appendJsonLine(SAFETY_LOG, { ts, tool: toolName, pattern, mode: safetyMode });
  }

  switch (safetyMode) {
    case 'strict':
      block(`Safety Gate (strict): ${pattern} detected. Operation blocked. Switch to /safety normal to allow with confirmation, or /safety off to disable (not recommended).`);
      break;
    case 'normal':
      allow(`Safety Gate (normal): ${pattern} detected. Operation allowed but flagged. Confirm this is intentional.`);
      break;
    default:
      allow();
  }
}

try {
  main();
} catch (err) {
  logError('pre-tool-use', err.message);
  allow(); // fail-open: never block on hook error
}
