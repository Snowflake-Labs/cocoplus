'use strict';

/**
 * refine-update.js — CocoStrategyBook atomic mutator (add/update/deprecate only)
 *
 * No LLM. Enforces:
 *   - hedging-language rejection on strategy content
 *   - evidence attribution required on add/update
 *   - version history preserved (never overwritten) on update
 *   - deprecation preserves history, only flips a flag + records reason
 *
 * Strategies are stored as one YAML file per strategy at cocoplus/strategies/<id>.yaml.
 * This script hand-rolls minimal YAML read/write (block-scalar strategy content plus
 * flat key: value fields) rather than pulling in a YAML dependency — the schema is
 * fixed and small enough that a real parser would be the over-engineering CocoLean
 * flags.
 */

const path = require('path');
const fs = require('fs');

const STRATEGIES_DIR = path.resolve(process.cwd(), 'cocoplus', 'strategies');

const HEDGING_PATTERNS = [
  /\bmight\b/i,
  /\bcould\b/i,
  /\bmay help\b/i,
  /\bpossibly\b/i,
  /\bin some cases\b/i,
  /\bperhaps\b/i,
  /\bseems to\b/i,
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--op') args.op = argv[++i];
    else if (a === '--id') args.id = argv[++i];
    else if (a === '--file') args.file = argv[++i];
    else if (a === '--reason') args.reason = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function readStrategyInput(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    fail(`Could not read strategy input at ${filePath}: ${err.message}`);
  }
}

function findHedging(content) {
  for (const pattern of HEDGING_PATTERNS) {
    if (pattern.test(content)) return pattern.source;
  }
  return null;
}

function requireAttribution(strategy) {
  const attr = strategy.attribution;
  if (!attr || !attr.session_id || !attr.evidence_reference || !attr.function_version_hash) {
    fail('Evidence attribution record is required: session_id, evidence_reference, and function_version_hash must all be present. Self-authored justification does not satisfy this requirement.');
  }
}

function strategyPath(id) {
  return path.join(STRATEGIES_DIR, `${id}.yaml`);
}

function toYaml(strategy) {
  // Minimal deterministic YAML emission for this fixed schema.
  const lines = [];
  lines.push(`id: ${strategy.id}`);
  lines.push(`name: "${strategy.name}"`);
  lines.push(`version: ${strategy.version}`);
  lines.push(`deprecated: ${strategy.deprecated}`);
  if (strategy.deprecated_reason) lines.push(`deprecated_reason: "${strategy.deprecated_reason}"`);
  lines.push(`task_type: "${strategy.task_type}"`);
  lines.push(`data_characteristics: "${strategy.data_characteristics}"`);
  lines.push(`quality_constraint: "${strategy.quality_constraint}"`);
  lines.push('content: |');
  for (const line of String(strategy.content).split('\n')) lines.push(`  ${line}`);
  lines.push('attribution:');
  lines.push(`  session_id: "${strategy.attribution.session_id}"`);
  lines.push(`  evidence_reference: "${strategy.attribution.evidence_reference}"`);
  lines.push(`  function_version_hash: "${strategy.attribution.function_version_hash}"`);
  if (strategy.degradation_conditions) {
    lines.push(`degradation_conditions: "${strategy.degradation_conditions}"`);
  }
  lines.push('history:');
  for (const h of strategy.history || []) {
    lines.push(`  - version: ${h.version}`);
    lines.push(`    content: |`);
    for (const line of String(h.content).split('\n')) lines.push(`      ${line}`);
    lines.push(`    attribution:`);
    lines.push(`      session_id: "${h.attribution.session_id}"`);
    lines.push(`      evidence_reference: "${h.attribution.evidence_reference}"`);
    lines.push(`      function_version_hash: "${h.attribution.function_version_hash}"`);
    lines.push(`    superseded_at: "${h.superseded_at}"`);
  }
  return lines.join('\n') + '\n';
}

function atomicWriteFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

function opAdd(args) {
  if (!args.file) fail('--file is required for --op add');
  const input = readStrategyInput(args.file);
  if (!input.id) fail('Strategy input must include an id field');
  if (fs.existsSync(strategyPath(input.id))) fail(`Strategy "${input.id}" already exists — use --op update`);

  const hedge = findHedging(input.content || '');
  if (hedge) fail(`Strategy content contains hedging language (matched: ${hedge}). Rewrite in prescriptive, conditional-free form.`);

  requireAttribution(input);

  const strategy = {
    id: input.id,
    name: input.name,
    version: 1,
    deprecated: false,
    task_type: input.task_type,
    data_characteristics: input.data_characteristics,
    quality_constraint: input.quality_constraint,
    content: input.content,
    attribution: input.attribution,
    degradation_conditions: input.degradation_conditions || '',
    history: [],
  };

  persist(strategy);
  console.log(JSON.stringify({ op: 'add', id: input.id, version: 1 }, null, 2));
}

function readExisting(id) {
  const p = strategyPath(id);
  if (!fs.existsSync(p)) fail(`Strategy "${id}" does not exist`);
  // Re-parse from the JSON sidecar we also keep for round-trip fidelity, since
  // this script writes YAML but must read back structured data to version it.
  const jsonSidecar = p.replace(/\.yaml$/, '.json');
  if (!fs.existsSync(jsonSidecar)) fail(`Strategy "${id}" is missing its structured record (${jsonSidecar}) — cannot version safely from YAML text alone`);
  return JSON.parse(fs.readFileSync(jsonSidecar, 'utf8'));
}

function persist(strategy) {
  const jsonSidecar = strategyPath(strategy.id).replace(/\.yaml$/, '.json');
  atomicWriteFile(strategyPath(strategy.id), toYaml(strategy));
  atomicWriteFile(jsonSidecar, JSON.stringify(strategy, null, 2));
}

function opUpdate(args) {
  if (!args.id) fail('--id is required for --op update');
  if (!args.file) fail('--file is required for --op update');
  const input = readStrategyInput(args.file);

  const hedge = findHedging(input.content || '');
  if (hedge) fail(`Strategy content contains hedging language (matched: ${hedge}). Rewrite in prescriptive, conditional-free form.`);
  requireAttribution(input);

  const existing = readExisting(args.id);
  existing.history = existing.history || [];
  existing.history.push({
    version: existing.version,
    content: existing.content,
    attribution: existing.attribution,
    superseded_at: new Date().toISOString(),
  });
  existing.version += 1;
  existing.content = input.content;
  existing.attribution = input.attribution;
  if (input.degradation_conditions) existing.degradation_conditions = input.degradation_conditions;

  persist(existing);
  console.log(JSON.stringify({ op: 'update', id: args.id, version: existing.version }, null, 2));
}

function opDeprecate(args) {
  if (!args.id) fail('--id is required for --op deprecate');
  if (!args.reason) fail('--reason is required for --op deprecate');

  const existing = readExisting(args.id);
  existing.deprecated = true;
  existing.deprecated_reason = args.reason;
  existing.deprecated_at = new Date().toISOString();

  persist(existing);
  console.log(JSON.stringify({ op: 'deprecate', id: args.id, reason: args.reason }, null, 2));
}

function main() {
  if (!fs.existsSync(path.resolve(process.cwd(), '.cocoplus'))) {
    fail('CocoPlus not initialized. Run $pod init first.');
  }

  const args = parseArgs(process.argv.slice(2));
  if (args.op === 'add') return opAdd(args);
  if (args.op === 'update') return opUpdate(args);
  if (args.op === 'deprecate') return opDeprecate(args);
  fail('Unknown --op. Expected one of: add, update, deprecate');
}

main();
