'use strict';

/**
 * grove-score.js — CocoGrove promotion scoring (Durability x Impact x Scope)
 *
 * Computes the three-dimension total from developer-supplied scores and
 * applies the decision thresholds. Also runs the three distillation rule
 * checks (descriptive-to-prescriptive, verbose-to-concise, conditional-to-
 * absolute) against the pattern text — deterministic pattern matching only,
 * no LLM judgment of whether the transformation is "good," just whether
 * hedging language and length bounds are violated.
 *
 * Usage: node grove-score.js --id <pattern-id> --durability <0-3> --impact <0-3> --scope <0-3> --text "<pattern text>"
 */

const path = require('path');
const fs = require('fs');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');

const HEDGING_PATTERNS = [/\bsometimes\b/i, /\bmight\b/i, /\bcan\b/i, /\bit depends\b/i, /\bmay\b/i, /\bpossibly\b/i];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--id') args.id = argv[++i];
    else if (a === '--durability') args.durability = Number(argv[++i]);
    else if (a === '--impact') args.impact = Number(argv[++i]);
    else if (a === '--scope') args.scope = Number(argv[++i]);
    else if (a === '--text') args.text = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function validDimension(n) {
  return Number.isInteger(n) && n >= 0 && n <= 3;
}

function computeDecision(total, dims) {
  const singleDimensionOverride = dims.some(d => d === 3);
  let decision;
  if (total >= 6) decision = 'PROMOTE';
  else if (total >= 4) decision = 'WATCH';
  else decision = 'IGNORE';

  if (singleDimensionOverride && decision !== 'PROMOTE') {
    return { decision, override: true, override_note: 'A dimension scored 3 — strong promotion candidate requiring explicit human review before demotion, despite total score.' };
  }
  return { decision, override: false, override_note: null };
}

function checkDistillation(text) {
  const findings = [];
  if (!text) return { passes: false, findings: ['No pattern text provided'] };

  const sentenceCount = (text.match(/[.!?]+/g) || []).length;
  if (sentenceCount > 2) findings.push(`Verbose-to-concise violation: ${sentenceCount} sentences (max 2) — move detail to a linked reference file`);

  for (const pattern of HEDGING_PATTERNS) {
    if (pattern.test(text)) findings.push(`Conditional-to-absolute violation: hedging language matched "${pattern.source}" — resolve to a specific condition or remove`);
  }

  const isImperative = /^(use|run|write|avoid|prefer|never|always|apply|check|validate)\b/i.test(text.trim());
  if (!isImperative) findings.push('Descriptive-to-prescriptive violation: text does not open with a direct instruction verb — restate as an instruction, not an observation');

  return { passes: findings.length === 0, findings };
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) fail('CocoPlus not initialized. Run $pod init first.');

  const args = parseArgs(process.argv.slice(2));
  if (!args.id) fail('--id is required');
  if (![args.durability, args.impact, args.scope].every(validDimension)) {
    fail('--durability, --impact, and --scope must each be an integer 0-3');
  }

  const total = args.durability + args.impact + args.scope;
  const decisionResult = computeDecision(total, [args.durability, args.impact, args.scope]);
  const distillation = checkDistillation(args.text);

  console.log(JSON.stringify({
    pattern_id: args.id,
    durability: args.durability,
    impact: args.impact,
    scope: args.scope,
    total,
    ...decisionResult,
    distillation,
  }, null, 2));
}

main();
