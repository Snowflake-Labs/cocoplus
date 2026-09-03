#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const path = require('path');
const { parseArgs } = require('./_script-utils.js');

const args = parseArgs(process.argv.slice(2));
const fn = args.function || args.f || args._[0] || '';
const contractPath = fn ? path.join('outcomes', fn, 'contract.md') : '';

if (!contractPath) {
  console.log('BLOCK: missing function name for outcome contract gate');
  process.exit(1);
}

const status = childProcess.spawnSync('git', ['status', '--porcelain', '--', contractPath], {
  encoding: 'utf8',
  shell: false,
});

if (status.status !== 0) {
  console.log(`BLOCK: unable to inspect outcome contract state for ${contractPath}`);
  process.exit(1);
}

if (status.stdout.trim()) {
  console.log(`BLOCK: outcome contract ${contractPath} has uncommitted changes`);
  process.exit(1);
}

console.log(`ALLOW: outcome contract ${contractPath} is committed`);
