#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const path = require('path');
const { readJson } = require('./_script-utils.js');

const evidence = readJson(path.join('.cocoplus', 'contract-evidence.json'), {});
let failed = false;

for (const [name, record] of Object.entries(evidence)) {
  if (!record || !Array.isArray(record.check_command)) continue;
  const [cmd, ...args] = record.check_command;
  const result = childProcess.spawnSync(cmd, args, { encoding: 'utf8', shell: false });
  if (result.status !== 0) {
    console.log(`check command failed for ${name}: exit ${result.status}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('contract evidence checks passed');
