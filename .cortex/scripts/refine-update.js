#!/usr/bin/env node
'use strict';

const path = require('path');
const { ensureDir, parseArgs, readJson, writeJson } = require('./_script-utils.js');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const filePath = args.file;
if (!filePath) fail('Missing --file');

const strategy = readJson(filePath, null);
if (!strategy) fail(`Unable to read strategy file: ${filePath}`);

const ref = strategy.attribution && strategy.attribution.evidence_reference;
if (ref && ref.startsWith('contract:')) {
  const key = ref.slice('contract:'.length);
  const evidence = readJson(path.join('.cocoplus', 'contract-evidence.json'), {});
  if (!evidence[key]) fail(`Evidence attribution missing for ${ref}`);
}

if (strategy.optimization_round) {
  if (!Array.isArray(strategy.changed_fields) || strategy.changed_fields.length !== 1) {
    fail('Optimization rounds require one-change-per-round mutation discipline.');
  }
  if (!Array.isArray(strategy.evaluation_criteria) || strategy.evaluation_criteria.some((item) => !item.name && item.expected === undefined)) {
    fail('Optimization rounds require structured evaluation criteria.');
  }
}

const outDir = path.join('cocoplus', 'strategies');
ensureDir(outDir);
writeJson(path.join(outDir, `${strategy.id || 'strategy'}.json`), strategy);
console.log(JSON.stringify({ status: 'ok', id: strategy.id || null }));
