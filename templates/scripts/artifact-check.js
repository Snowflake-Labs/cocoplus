#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node artifact-check.js --root <artifact-root> --stage <stage-id> --reads <json-array> [--writes <json-array>]');
  process.exit(2);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function parseArray(value, label) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {
    // fall through
  }
  console.error(`artifact-check: ${label} must be a JSON array`);
  process.exit(2);
}

const root = arg('--root');
const stage = arg('--stage');
if (!root || !stage) usage();

const reads = parseArray(arg('--reads'), '--reads');
const writes = parseArray(arg('--writes'), '--writes');
const missingReads = reads.filter((item) => !fs.existsSync(path.join(root, item)));
const missingWrites = writes.filter((item) => !fs.existsSync(path.join(root, item)));

const result = {
  stage,
  root,
  reads,
  writes,
  missing_reads: missingReads,
  missing_writes: missingWrites,
  ok: missingReads.length === 0 && missingWrites.length === 0,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(result.ok ? 0 : 1);
