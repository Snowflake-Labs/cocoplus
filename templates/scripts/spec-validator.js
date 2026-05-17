#!/usr/bin/env node
'use strict';

const fs = require('fs');

const vagueTerms = [
  'accurate', 'fast', 'scalable', 'robust', 'reliable',
  'simple', 'easy', 'better', 'optimized', 'secure',
  'good', 'high quality', 'low cost', 'real time', 'user friendly',
];

function hasMeasurement(line) {
  return /\d|%|ms|sec|second|minute|credit|token|row|threshold|sla|slo/i.test(line);
}

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  return lines.flatMap((line, index) => {
    if (hasMeasurement(line)) return [];
    return vagueTerms
      .filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(line))
      .map((term) => ({
        file: filePath,
        line: index + 1,
        term,
        severity: /accurate|secure|reliable|quality|cost|real time/i.test(term) ? 'high' : 'medium',
        recommendation: `Replace "${term}" with a measurable threshold, owner, or acceptance criterion.`,
        context: line.trim().slice(0, 240),
      }));
  });
}

const files = process.argv.slice(2);
const targets = files.length > 0 ? files : ['.cocoplus/lifecycle/spec.md', '.cocoplus/lifecycle/discuss.md'];
const findings = targets.flatMap(scanFile);
const high = findings.filter((finding) => finding.severity === 'high').length;
const score = Math.max(0, 100 - high * 15 - (findings.length - high) * 8);
process.stdout.write(JSON.stringify({
  score,
  outcome: score >= 85 ? 'PASS' : score >= 70 ? 'CONCERNS' : 'FAIL',
  findings,
}, null, 2) + '\n');
