#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const tagIndex = args.indexOf('--tag');
const tag = tagIndex >= 0 ? args[tagIndex + 1] : args[0];

if (!tag) {
  console.error('Usage: node .cocoplus/scripts/rollback.js --tag <tag-name>');
  process.exit(2);
}

const resolved = spawnSync('git', ['rev-parse', '--verify', tag], { encoding: 'utf8' });
if (resolved.status !== 0) {
  console.error(`Tag not found: ${tag}`);
  process.exit(1);
}

console.log(`Rollback target: ${tag} (${resolved.stdout.trim()})`);
console.log('Run this command after confirming the target:');
console.log(`git reset --hard ${tag}`);
