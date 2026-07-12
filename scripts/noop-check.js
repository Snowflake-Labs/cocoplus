'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--state') args.state = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    fail(`Could not read ${filePath}: ${err.message}`);
  }
}

function appendLog(payload) {
  const dir = path.resolve(process.cwd(), '.cocoplus', 'flow');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, 'noop-log.jsonl'), JSON.stringify(payload) + '\n', 'utf8');
}

function evaluate(state) {
  const changed = state.changed_files || state.changedFiles || [];
  const checkpoints = state.pending_checkpoints || state.pendingCheckpoints || [];
  const noop = changed.length === 0 && checkpoints.length === 0;
  return {
    noop,
    reason: noop ? 'No changed files or pending checkpoints.' : 'Work remains for this stage.',
    changed_files: changed.length,
    pending_checkpoints: checkpoints.length,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.state) fail('--state is required');
  const payload = { ...evaluate(readJson(path.resolve(process.cwd(), args.state))), ts: new Date().toISOString() };
  if (payload.noop) appendLog(payload);
  console.log(JSON.stringify(payload, null, 2));
}

if (require.main === module) main();

module.exports = { evaluate };
