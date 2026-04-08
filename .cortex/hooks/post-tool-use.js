#!/usr/bin/env node
/**
 * CocoPlus PostToolUse hook — cross-platform (Node.js)
 * Fires after every tool call.
 * Responsibilities: CocoMeter token/tool tracking, Memory Engine decision capture.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, atomicWrite, logError, readJsonString, readJsonNumber } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const toolName = process.env.COCO_TOOL_NAME || 'unknown';
  const ts       = isoUtc();

  appendJsonLine(HOOK_LOG, { hook: 'post-tool-use', tool: toolName, ts });

  // 1. Memory Engine — scan tool result for decision signals
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'memory.on'))) {
    const toolResult   = process.env.COCO_TOOL_RESULT || '';
    const bufferFile   = path.join(COCOPLUS_DIR, '.decision-buffer');
    const decisionKeywords = /decided|determined|approved|pattern|chosen|selected/i;
    if (decisionKeywords.test(toolResult)) {
      try {
        fs.appendFileSync(bufferFile, `- [${ts}] Tool: ${toolName}\n`);
      } catch (_) { /* non-fatal */ }
    }
  }

  // 2. CocoMeter — increment tool/SQL/write counters
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocometer.on'))) {
    const meterFile = path.join(COCOPLUS_DIR, 'meter', 'current-session.json');
    if (fs.existsSync(meterFile)) {
      const sessionId = readJsonString(meterFile, 'session_id');
      const startedAt = readJsonString(meterFile, 'started_at');
      const phase     = readJsonString(meterFile, 'phase');
      let tools  = readJsonNumber(meterFile, 'tools_called') + 1;
      let tokens = readJsonNumber(meterFile, 'tokens_consumed');
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
}

try {
  main();
} catch (err) {
  logError('post-tool-use', err.message);
}
