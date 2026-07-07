'use strict';

/**
 * contract-prove.js — CocoContract evidence recorder and CI regression runner
 *
 * Two modes:
 *   --function <name> --tier <tier> --description "<text>"   Record evidence
 *   --ci                                                       Re-execute archived contracts
 *
 * Evidence tiers (strongest first): e2e, reference, spec, differential, unit.
 * Only e2e and reference satisfy $ship certification.
 *
 * contract-evidence.json schema:
 * { "<function-name>": { tier, description, source_hash, recorded_at, result } }
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { sourceHash } = require('./_contract-hash.js');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const OUTCOMES_DIR = path.resolve(process.cwd(), 'outcomes');
const EVIDENCE_PATH = path.join(COCOPLUS_DIR, 'contract-evidence.json');

const CERTIFYING_TIERS = new Set(['e2e', 'reference']);
const VALID_TIERS = new Set(['e2e', 'reference', 'spec', 'differential', 'unit']);

function cocoplusExists() {
  return fs.existsSync(COCOPLUS_DIR);
}

function parseArgs(argv) {
  const args = { ci: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ci') args.ci = true;
    else if (a === '--function') args.function = argv[++i];
    else if (a === '--tier') args.tier = argv[++i];
    else if (a === '--description') args.description = argv[++i];
    else if (a === '--check-command') args.checkCommand = argv[++i];
  }
  return args;
}

function readEvidence() {
  try {
    return JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
  } catch (_) {
    return {};
  }
}

function writeEvidence(data) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  const tmp = EVIDENCE_PATH + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, EVIDENCE_PATH);
}

function recordEvidence(args) {
  if (!args.function || !args.tier) {
    console.error(JSON.stringify({ error: '--function and --tier are required' }));
    process.exit(1);
  }
  if (!VALID_TIERS.has(args.tier)) {
    console.error(JSON.stringify({ error: `Invalid tier "${args.tier}". Valid tiers: ${[...VALID_TIERS].join(', ')}` }));
    process.exit(1);
  }

  const evidence = readEvidence();
  const hash = sourceHash(args.function);
  const record = {
    tier: args.tier,
    description: args.description || '',
    source_hash: hash,
    recorded_at: new Date().toISOString(),
    result: 'pass',
    certifying: CERTIFYING_TIERS.has(args.tier),
  };
  if (args.checkCommand) {
    try {
      const parsed = JSON.parse(args.checkCommand);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('expected non-empty array');
      record.check_command = parsed.map(String);
    } catch (err) {
      console.error(JSON.stringify({ error: `--check-command must be a JSON array, e.g. ["node","test.js"]: ${err.message}` }));
      process.exit(1);
    }
  }
  evidence[args.function] = record;
  writeEvidence(evidence);

  console.log(JSON.stringify({ function: args.function, recorded: record }, null, 2));
}

function checkStaleness(functionName, record) {
  const currentHash = sourceHash(functionName);
  return currentHash !== record.source_hash;
}

function runCheckCommand(record) {
  if (!Array.isArray(record.check_command) || record.check_command.length === 0) {
    return { status: 'skip', reason: 'no executable check command recorded' };
  }
  const [cmd, ...args] = record.check_command;
  try {
    execFileSync(cmd, args, { cwd: process.cwd(), stdio: 'pipe', timeout: 120000 });
    return { status: 'pass' };
  } catch (err) {
    return { status: 'fail', reason: `check command failed with exit ${err.status ?? 'unknown'}` };
  }
}

function runCi() {
  if (!fs.existsSync(OUTCOMES_DIR)) {
    console.log(JSON.stringify({ contracts: [], message: 'No outcomes/ archive found.' }));
    return;
  }

  const functions = fs.readdirSync(OUTCOMES_DIR).filter(f =>
    fs.statSync(path.join(OUTCOMES_DIR, f)).isDirectory()
  );

  const evidence = readEvidence();
  const results = [];
  let anyFailed = false;

  for (const fn of functions) {
    const contractPath = path.join(OUTCOMES_DIR, fn, 'contract.md');
    if (!fs.existsSync(contractPath)) {
      results.push({ function: fn, status: 'fail', reason: 'contract.md missing from archive' });
      anyFailed = true;
      continue;
    }
    const record = evidence[fn];
    if (!record || !CERTIFYING_TIERS.has(record.tier)) {
      results.push({ function: fn, status: 'fail', reason: 'no certifying (e2e/reference) evidence on record' });
      anyFailed = true;
      continue;
    }
    if (checkStaleness(fn, record)) {
      results.push({ function: fn, status: 'fail', reason: 'evidence is stale — source hash has changed since proof' });
      anyFailed = true;
      continue;
    }
    const check = runCheckCommand(record);
    if (check.status === 'fail') {
      results.push({ function: fn, status: 'fail', reason: check.reason });
      anyFailed = true;
      continue;
    }
    results.push({ function: fn, status: 'pass', tier: record.tier, check: check.status });
  }

  console.log(JSON.stringify({ contracts: results }, null, 2));
  process.exit(anyFailed ? 1 : 0);
}

function main() {
  if (!cocoplusExists()) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  if (args.ci) {
    runCi();
  } else {
    recordEvidence(args);
  }
}

main();
