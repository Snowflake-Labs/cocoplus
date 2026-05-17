#!/usr/bin/env node
'use strict';

const fs = require('fs');

const DEFAULT_FILES = [
  '.cocoplus/lifecycle/discuss.md',
  '.cocoplus/lifecycle/spec.md',
  '.cocoplus/lifecycle/cocoplus-context.md',
];

const patterns = {
  accuracy_threshold: /(?:accuracy|quality)\D{0,30}(\d+(?:\.\d+)?%)/ig,
  warehouse: /\bwarehouse\D{0,20}([A-Z][A-Z0-9_$]{2,})/g,
  schema: /\bschema\D{0,20}([A-Z][A-Z0-9_$]{2,})/g,
  model: /\bmodel\D{0,20}([A-Za-z0-9._-]+)/g,
};

function extract(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const text = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const [field, pattern] of Object.entries(patterns)) {
    const values = new Set();
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) values.add(match[1]);
    if (values.size > 0) result[field] = [...values];
  }
  return result;
}

const files = process.argv.slice(2);
const targets = files.length > 0 ? files : DEFAULT_FILES;
const extracted = Object.fromEntries(targets.map((file) => [file, extract(file)]));
const conflicts = [];

for (const field of Object.keys(patterns)) {
  const seen = new Map();
  for (const [file, fields] of Object.entries(extracted)) {
    for (const value of fields[field] || []) {
      const key = String(value).toLowerCase();
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(file);
    }
  }
  if (seen.size > 1) {
    conflicts.push({
      field,
      values: [...seen.entries()].map(([value, sourceFiles]) => ({ value, files: sourceFiles })),
    });
  }
}

process.stdout.write(JSON.stringify(conflicts, null, 2) + '\n');
