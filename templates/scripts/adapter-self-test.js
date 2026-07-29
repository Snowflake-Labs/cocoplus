#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const adapter = require('./transcript-adapter.js');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function summarize(events) {
  const counts = {
    assistant_messages: 0,
    dispatches: 0,
    queue_completions: 0,
    unknown: 0,
  };
  for (const event of events) {
    if (event.kind === 'assistant') counts.assistant_messages += 1;
    else if (event.kind === 'tool_result' && event.background) counts.dispatches += 1;
    else if (event.kind === 'queue_completion') counts.queue_completions += 1;
    else if (event.kind === 'other') counts.unknown += 1;
  }
  return counts;
}

function runSelfTest(options) {
  const events = adapter.parseFile(options.transcriptPath);
  const counts = summarize(events);
  const result = {
    transcript: options.transcriptPath,
    ok: counts.dispatches > 0 || counts.assistant_messages > 0 || counts.queue_completions > 0,
    schema_canary: counts.dispatches === 0,
    generated_at: new Date().toISOString(),
    counts,
  };
  if (options.outFile) writeJson(options.outFile, result);
  return result;
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--transcript') options.transcriptPath = argv[++i];
    else if (arg === '--out') options.outFile = argv[++i];
  }
  return options;
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.transcriptPath) {
    process.stderr.write('Usage: node adapter-self-test.js --transcript <jsonl> [--out <json>]\n');
    process.exit(2);
  }
  const result = runSelfTest(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = {
  runSelfTest,
  summarize,
};
