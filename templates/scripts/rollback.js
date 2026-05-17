#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const tagIndex = args.indexOf('--tag');
const tag = tagIndex >= 0 ? args[tagIndex + 1] : args[0];
const execute = args.includes('--execute');

if (!tag) {
  console.error('Usage: node .cocoplus/scripts/rollback.js --tag <tag-name> [--execute]');
  process.exit(2);
}

const resolved = spawnSync('git', ['rev-parse', '--verify', tag], { encoding: 'utf8' });
if (resolved.status !== 0) {
  console.error(`Tag not found: ${tag}`);
  process.exit(1);
}

console.log(`Rollback target: ${tag} (${resolved.stdout.trim()})`);
if (!execute) {
  console.log('Dry run only. Re-run with --execute after confirming the target.');
  console.log(`git reset --hard ${tag}`);
  process.exit(0);
}

const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
if (status.status !== 0) {
  console.error(status.stderr || 'Unable to inspect git status.');
  process.exit(1);
}
if (status.stdout.trim()) {
  console.error('Refusing rollback with uncommitted changes. Commit, stash, or clean the worktree first.');
  process.exit(1);
}

const reset = spawnSync('git', ['reset', '--hard', tag], { encoding: 'utf8' });
if (reset.status !== 0) {
  console.error(reset.stderr || reset.stdout || `Rollback failed for ${tag}`);
  process.exit(reset.status || 1);
}
process.stdout.write(reset.stdout);
