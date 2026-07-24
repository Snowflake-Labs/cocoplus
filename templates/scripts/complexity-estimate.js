#!/usr/bin/env node
'use strict';

const fs = require('fs');

const TIERS = [
  { name: 'trivial', max: 20 },
  { name: 'simple', max: 40 },
  { name: 'moderate', max: 60 },
  { name: 'hard', max: 80 },
  { name: 'open-ended', max: Infinity },
];

const LOW_EFFORT = /\b(typo|rename|format|lint|bump|comment|copy|fix spelling)\b/i;
const HIGH_EFFORT = /\b(refactor|migrate|architect|rewrite|debug|investigate|redesign|implement|integrate)\b/i;
const BROAD_SCOPE = /\b(the whole|entire|every|all of|across|multi[-\s]?schema|end[-\s]?to[-\s]?end)\b/i;
const ACCEPTANCE = /\b(run (the )?(tests?|validation)|so .* passes|done when|verify|confirm|acceptance|success criteria)\b/i;
const AMBIGUITY = /\b(figure out|somehow|explore|investigate why|find out|unclear|unknown|maybe|probably|what is wrong|why .* failing)\b/i;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tierFor(score) {
  return TIERS.find((tier) => score <= tier.max).name;
}

function scoreDescription(description) {
  const text = String(description || '').trim();
  const words = text ? text.split(/\s+/).length : 0;
  const enumeratedSteps = (text.match(/(?:^|\s)(?:\d+\.|[-*])\s+/g) || []).length;
  const fileMentions = (text.match(/\b[\w.-]+\.(sql|js|ts|py|md|json|toml|html|yml|yaml)\b/gi) || []).length;

  const signals = {
    length: words > 80 ? 18 : words > 40 ? 10 : words > 18 ? 5 : 0,
    low_effort: LOW_EFFORT.test(text) ? -12 : 0,
    high_effort: HIGH_EFFORT.test(text) ? 18 : 0,
    scope_breadth: BROAD_SCOPE.test(text) || fileMentions > 3 ? 16 : fileMentions > 1 ? 8 : 0,
    acceptance_check: ACCEPTANCE.test(text) ? -6 : 0,
    ambiguity: AMBIGUITY.test(text) ? 60 : 0,
    step_count: enumeratedSteps >= 4 ? 12 : enumeratedSteps >= 2 ? 6 : 0,
  };

  let score = 24 + Object.values(signals).reduce((sum, value) => sum + value, 0);
  if (!text) score = 50;
  score = clamp(score, 0, 100);

  return {
    description: text,
    tier: tierFor(score),
    score,
    signals,
    ambiguity_score: Math.max(0, signals.ambiguity),
    has_acceptance_check: signals.acceptance_check < 0,
  };
}

function harnessFor(estimate, budgetState, configured = {}) {
  const tierFloors = {
    trivial: { model: 'regular', thinking_effort: 'low' },
    simple: { model: 'regular', thinking_effort: 'low' },
    moderate: { model: 'smart', thinking_effort: 'medium' },
    hard: { model: 'smart', thinking_effort: 'high' },
    'open-ended': { model: 'smart', thinking_effort: 'high' },
  };
  const quotaCaps = {
    normal: { parallelism: configured.parallelism, retry_budget: configured.retry_budget },
    reserve: { parallelism: 2, retry_budget: 1 },
    exhausted: { parallelism: 1, retry_budget: 0 },
  };
  return {
    complexity_floor: tierFloors[estimate.tier] || tierFloors.moderate,
    quota_cap: quotaCaps[budgetState] || quotaCaps.normal,
    invariant: 'complexity sets model/effort floor; quota caps parallelism/retry only',
  };
}

function main() {
  const argText = process.argv.slice(2).join(' ');
  const stdinText = argText ? '' : fs.readFileSync(0, 'utf8');
  const description = argText || stdinText;
  process.stdout.write(JSON.stringify(scoreDescription(description), null, 2) + '\n');
}

module.exports = { scoreDescription, harnessFor };

if (require.main === module) {
  main();
}
