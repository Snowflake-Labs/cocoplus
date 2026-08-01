#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function readOptional(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  } catch (_) {
    return '';
  }
}

const args = process.argv.slice(2);
const input = args.join(' ') || fs.readFileSync(0, 'utf8');
const bloomText = readOptional(path.join('.cocoplus', 'lifecycle', 'bloom.md'));
const text = `${String(input || '')}\n${bloomText}`.toLowerCase();
const tokens = text.split(/\s+/).filter(Boolean).length;

const weightedSignals = [
  { name: 'multi_step_sequence', weight: 2, re: /\b(then|after that|and also|first|second|finally|multi[- ]step)\b/ },
  { name: 'schema_or_deployment_change', weight: 3, re: /\b(schema|table|view|procedure|function|warehouse|deploy|migration|production)\b/ },
  { name: 'evaluation_required', weight: 3, re: /\b(evaluation|accuracy|precision|recall|f1|benchmark|threshold|golden|labeled)\b/ },
  { name: 'risk_or_governance', weight: 3, re: /\b(pii|phi|sensitive|governance|masking|policy|role|grant|security)\b/ },
  { name: 'uncertainty_marker', weight: 2, re: /\b(uncertain|unknown|maybe|probably|assumption|trade[- ]off|decide|choose)\b/ },
  { name: 'large_context', weight: 2, re: /\b(multiple|several|many|directory|dataset|history|logs|artifacts)\b/ },
  { name: 'bloom_constraints', weight: bloomText ? 2 : 0, re: /##\s+constraints/i },
];

const matched = weightedSignals
  .filter((signal) => signal.weight > 0 && signal.re.test(text))
  .map((signal) => signal.name);
const score = weightedSignals.reduce((sum, signal) => sum + (signal.re.test(text) ? signal.weight : 0), 0)
  + (tokens > 120 ? 2 : tokens > 80 ? 1 : 0);

const result = {
  flow_type: score >= 4 ? 'full' : 'quick',
  score,
  tokens_estimate: tokens,
  matched_signals: matched,
  bloom_signal: Boolean(bloomText),
};

if (args.includes('--json')) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} else {
  process.stdout.write(result.flow_type + '\n');
}
