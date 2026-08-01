#!/usr/bin/env node
'use strict';

const fs = require('fs');

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value) {
  return typeof value === 'string' ? value : null;
}

function asNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function usageFrom(source) {
  const usage = asObject(source);
  return {
    input_tokens: asNumber(usage.input_tokens || usage.prompt_tokens),
    output_tokens: asNumber(usage.output_tokens || usage.completion_tokens),
    cache_creation_tokens: asNumber(usage.cache_creation_input_tokens || usage.cache_creation_tokens),
    cache_read_tokens: asNumber(usage.cache_read_input_tokens || usage.cache_read_tokens),
  };
}

function tokenTotal(usage) {
  return usage.input_tokens + usage.output_tokens + usage.cache_creation_tokens + usage.cache_read_tokens;
}

function parseJsonLine(line) {
  try {
    return asObject(JSON.parse(line));
  } catch (_) {
    return null;
  }
}

function normalizedType(record) {
  const message = asObject(record.message);
  return String(record.type || record.event || record.record_type || record.role || message.role || '');
}

function eventTimestamp(record) {
  return asString(record.timestamp) || asString(record.ts) || asString(record.created_at) || null;
}

function toolUseId(record) {
  return asString(record.tool_use_id) || asString(record.toolUseId) || asString(record['tool-use-id']) || asString(record.id) || null;
}

function taskId(record) {
  return asString(record.task_id) || asString(record.taskId) || asString(record['task-id']) || null;
}

function assistantEvent(record) {
  const message = asObject(record.message);
  const usage = usageFrom(record.usage || message.usage || record.message_usage);
  if (normalizedType(record) !== 'assistant' || tokenTotal(usage) <= 0) return null;
  return {
    kind: 'assistant',
    id: asString(message.id) || asString(record.message_id) || asString(record.id) || null,
    timestamp: eventTimestamp(record),
    model: asString(message.model) || asString(record.model) || null,
    usage,
  };
}

function queueCompletionEvent(record) {
  const type = normalizedType(record);
  const operation = String(record.operation || record.queue_operation || '');
  const status = String(record.status || record.result || '');
  const isCompletion = /queue-operation|queue_operation/i.test(type) &&
    /enqueue/i.test(operation) &&
    /complete|completed|success/i.test(status);
  if (!isCompletion) return null;
  return {
    kind: 'queue_completion',
    task_id: taskId(record),
    tool_use_id: toolUseId(record),
    timestamp: eventTimestamp(record),
  };
}

function toolResultEvent(record) {
  const type = normalizedType(record);
  const input = asObject(record.input || record.parameters);
  const name = String(record.name || record.tool_name || record.tool || '');
  const isToolResult = /tool_result|tool-result/i.test(type);
  if (!isToolResult) return null;
  return {
    kind: 'tool_result',
    tool_name: asString(record.name) || asString(record.tool_name) || asString(record.tool) || null,
    tool_use_id: toolUseId(record),
    task_id: taskId(record),
    pod_id: asString(record.subagent_id) || asString(record.pod_id) || taskId(record) || toolUseId(record),
    background: record.background === true || input.background === true || /cocopod|subagent|agent/i.test(name),
    started_at: asString(record.started_at) || asString(record.start_time) || asString(record.dispatched_at) || eventTimestamp(record),
    completed_at: asString(record.completed_at) || asString(record.end_time) || eventTimestamp(record),
    timestamp: eventTimestamp(record),
  };
}

function parseLine(line) {
  if (!String(line || '').trim()) return null;
  const record = parseJsonLine(line);
  if (!record) return { kind: 'other', raw_type: 'malformed_json' };

  const assistant = assistantEvent(record);
  if (assistant) return assistant;

  const completion = queueCompletionEvent(record);
  if (completion) return completion;

  const toolResult = toolResultEvent(record);
  if (toolResult) return toolResult;

  return { kind: 'other', raw_type: normalizedType(record) || null };
}

function parseText(text) {
  const events = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const event = parseLine(line);
    if (event) events.push(event);
  }
  return events;
}

function parseFile(filePath) {
  return parseText(fs.readFileSync(filePath, 'utf8'));
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    process.stderr.write('Usage: node transcript-adapter.js <jsonl>\n');
    process.exit(2);
  }
  process.stdout.write(`${JSON.stringify(parseFile(filePath), null, 2)}\n`);
}

module.exports = {
  parseFile,
  parseLine,
  parseText,
  tokenTotal,
};
