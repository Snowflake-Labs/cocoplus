#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const path = require('path');
const { readJson } = require('./_script-utils.js');

const APPROVED_NODE_SCRIPTS = new Set([
  '.cortex/scripts/contract-gate.js',
  'scripts/validate-cocoplus.js',
  'scripts/tests/regression.js',
]);

const APPROVED_NPM_COMMANDS = new Set([
  'build',
  'lint',
  'test',
]);

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function isNodeCommand(cmd) {
  const base = path.basename(String(cmd || '')).toLowerCase();
  return base === 'node' || base === 'node.exe' || cmd === process.execPath;
}

function approvedCheckCommand(command) {
  if (!Array.isArray(command) || command.length === 0) return { approved: false, reason: 'empty check_command' };
  const [cmd, ...args] = command.map(String);
  if (isNodeCommand(cmd)) {
    if (args.some((arg) => arg === '-e' || arg === '--eval' || arg === '-p' || arg === '--print')) {
      return { approved: false, reason: 'inline node evaluation is not approved' };
    }
    const script = normalizePath(args[0] || '');
    if (APPROVED_NODE_SCRIPTS.has(script)) return { approved: true };
    return { approved: false, reason: `node script is not approved: ${script || '<missing>'}` };
  }
  if (/^npm(?:\.cmd)?$/i.test(path.basename(cmd))) {
    if (args[0] === 'run' && APPROVED_NPM_COMMANDS.has(args[1])) return { approved: true };
    if (APPROVED_NPM_COMMANDS.has(args[0])) return { approved: true };
    return { approved: false, reason: `npm command is not approved: ${args.join(' ')}` };
  }
  return { approved: false, reason: `command is not approved: ${cmd}` };
}

const evidence = readJson(path.join('.cocoplus', 'contract-evidence.json'), {});
let failed = false;

for (const [name, record] of Object.entries(evidence)) {
  if (!record || !Array.isArray(record.check_command)) continue;
  const approval = approvedCheckCommand(record.check_command);
  if (!approval.approved) {
    console.error(`check command not approved for ${name}: ${approval.reason}`);
    failed = true;
    continue;
  }
  const [cmd, ...args] = record.check_command;
  const result = childProcess.spawnSync(cmd, args, { encoding: 'utf8', shell: false });
  if (result.status !== 0) {
    console.log(`check command failed for ${name}: exit ${result.status}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('contract evidence checks passed');
