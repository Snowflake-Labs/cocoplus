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

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');
const SPAWN_QUEUE  = path.join(COCOPLUS_DIR, 'subagent-spawn-requests.jsonl');

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

  appendJsonLine(HOOK_LOG, { hook: 'post-tool-use', tool: toolName, ts });

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

  // 5. CocoMeter Enhanced (Feature 21) — request_id capture for flow stage attribution
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocometer.on'))) {
    const requestId = result.request_id || result.requestId || null;
    if (requestId) {
      const stateFile = path.join(COCOPLUS_DIR, 'state.json');
      let stageId    = null;
      let persona    = null;
      let sessionId  = null;
      let parentRequestId = result.parent_request_id || result.parentRequestId || null;

      if (fs.existsSync(stateFile)) {
        try {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
          stageId   = state.active_stage_id  || null;
          persona   = state.active_persona   || null;
          sessionId = state.session_id       || null;
        } catch (_) { /* non-fatal */ }
      }

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
}

try {
  main();
} catch (err) {
  logError('post-tool-use', err.message);
}
