#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { parseArgs, readJson, writeJson } = require('./_script-utils.js');

function parseValue(raw) {
  const value = raw.trim();
  if (/^\[.*\]$/.test(value)) {
    return value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
  }
  if (/^\d+$/.test(value)) return Number(value);
  return value.replace(/^"|"$/g, '');
}

const args = parseArgs(process.argv.slice(2));
const outputFile = args['output-file'];
const content = fs.readFileSync(outputFile, 'utf8');
const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!match) {
  console.error('Missing status envelope');
  process.exit(1);
}
const record = {};
for (const line of match[1].split(/\r?\n/)) {
  const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
  if (kv) record[kv[1]] = parseValue(kv[2]);
}
const statusPath = path.join('.cocoplus', 'pod-status.json');
const records = readJson(statusPath, []);
records.push(record);
writeJson(statusPath, records);
console.log(JSON.stringify(record));
