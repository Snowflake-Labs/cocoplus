#!/usr/bin/env node
'use strict';

const fs = require('fs');

const input = process.argv.slice(2).join(' ') || fs.readFileSync(0, 'utf8');
const text = String(input || '').toLowerCase();
const tokens = text.split(/\s+/).filter(Boolean).length;

const fullSignals = [
  /\bthen\b/,
  /\bafter that\b/,
  /\band also\b/,
  /\bschema\b/,
  /\bproduction\b/,
  /\bevaluation\b/,
  /\baccuracy\b/,
  /\bpii\b/,
  /\bwarehouse\b/,
  /\bmultiple\b/,
  /\buncertain\b/,
];

const score = fullSignals.reduce((sum, pattern) => sum + (pattern.test(text) ? 1 : 0), 0) + (tokens > 80 ? 1 : 0);
process.stdout.write(score >= 2 ? 'full\n' : 'quick\n');
