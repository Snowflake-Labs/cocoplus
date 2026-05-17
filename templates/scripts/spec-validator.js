#!/usr/bin/env node
'use strict';

const fs = require('fs');

const vagueTerms = [
  'accurate', 'fast', 'scalable', 'robust', 'reliable',
  'simple', 'easy', 'better', 'optimized', 'secure',
];

function hasMeasurement(line) {
  return /\d|%|ms|sec|second|minute|credit|token|row|threshold|sla|slo/i.test(line);
}

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).flatMap((line, index) => {
    if (hasMeasurement(line)) return [];
    return vagueTerms
      .filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(line))
      .map((term) => ({ file: filePath, line: index + 1, term, context: line.trim().slice(0, 200) }));
  });
}

const files = process.argv.slice(2);
const targets = files.length > 0 ? files : ['.cocoplus/lifecycle/spec.md', '.cocoplus/lifecycle/discuss.md'];
process.stdout.write(JSON.stringify(targets.flatMap(scanFile), null, 2) + '\n');
