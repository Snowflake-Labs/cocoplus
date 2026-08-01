#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const transcriptAdapter = require('./transcript-adapter.js');

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function atomicWriteJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function parseTranscriptEvents(transcriptText) {
  const completionByTask = new Map();
  const completionByToolUse = new Map();
  const pods = [];

  for (const record of transcriptAdapter.parseText(transcriptText)) {
    if (record.kind === 'queue_completion') {
      const completion = {
        task_id: record.task_id,
        tool_use_id: record.tool_use_id,
        timestamp: record.timestamp,
      };
      if (completion.task_id) completionByTask.set(completion.task_id, completion);
      if (completion.tool_use_id) completionByToolUse.set(completion.tool_use_id, completion);
      continue;
    }

    if (record.kind === 'tool_result' && record.background) {
      const id = record.tool_use_id;
      const task = record.task_id;
      const completion = task && completionByTask.get(task) || id && completionByToolUse.get(id) || null;
      const startTime = record.started_at || record.timestamp;
      const fallbackEnd = record.completed_at || record.timestamp;
      const endTime = completion && completion.timestamp || fallbackEnd;
      const durationSeconds = startTime && endTime
        ? Math.max(0, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000))
        : null;
      pods.push({
        pod_id: record.pod_id || task || id || null,
        task_id: task,
        tool_use_id: id,
        started_at: startTime,
        completed_at: endTime,
        duration_seconds: durationSeconds,
        completion_source: completion ? 'enqueue_record' : 'tool_result_fallback',
        completion_timestamp_reliable: Boolean(completion),
      });
    }
  }

  return { pods };
}

function mergeFlowState(flowState, parsed) {
  const next = { ...flowState };
  next.pods = Array.isArray(next.pods) ? next.pods : [];
  for (const pod of parsed.pods) {
    const existing = next.pods.find((item) =>
      item.pod_id && item.pod_id === pod.pod_id ||
      item.task_id && item.task_id === pod.task_id ||
      item.tool_use_id && item.tool_use_id === pod.tool_use_id
    );
    if (existing) Object.assign(existing, pod);
    else next.pods.push(pod);
  }
  next.updated_at = new Date().toISOString();
  return next;
}

function runFlowEventReader(options, deps = {}) {
  const readFile = deps.readFile || ((filePath) => fs.readFileSync(filePath, 'utf8'));
  const readState = deps.readState || ((filePath) => readJson(filePath, {}));
  const writeState = deps.writeState || atomicWriteJson;
  const parsed = parseTranscriptEvents(readFile(options.transcriptPath));
  const flowState = options.flowStateFile ? readState(options.flowStateFile) : {};
  const next = mergeFlowState(flowState, parsed);
  if (options.flowStateFile) writeState(options.flowStateFile, next);
  return next;
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--transcript') options.transcriptPath = argv[++i];
    else if (arg === '--flow-state') options.flowStateFile = argv[++i];
  }
  return options;
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.transcriptPath) {
    process.stderr.write('Usage: node flow-event-reader.js --transcript <jsonl> [--flow-state <json>]\n');
    process.exit(2);
  }
  const result = runFlowEventReader(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = {
  mergeFlowState,
  parseTranscriptEvents,
  runFlowEventReader,
};
