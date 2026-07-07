'use strict';

/**
 * contract-gate.js — CocoContract Tier 1 enforcement (<50ms, no LLM)
 *
 * Invoked from user-prompt-submit.js for $spec, $build, and $ship.
 * The $ship staleness check hashes only the git-tracked files matching the
 * function name (a bounded glob lookup via `git ls-files`, not a repo-wide
 * scan) using the same routine contract-prove.js uses to write evidence, so
 * the two never diverge on what "the source" means for a given function.
 *
 * Usage: node contract-gate.js --command <spec|build|ship> --function <name>
 *        node contract-gate.js --command ship --all
 * Exit 0: allowed. Exit 1: blocked (reason on stdout as JSON).
 */

const path = require('path');
const fs = require('fs');
const { sourceHash } = require('./_contract-hash.js');
const { execFileSync } = require('child_process');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const OUTCOMES_DIR = path.resolve(process.cwd(), 'outcomes');
const EVIDENCE_PATH = path.join(COCOPLUS_DIR, 'contract-evidence.json');

const CERTIFYING_TIERS = new Set(['e2e', 'reference']);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--command') args.command = argv[++i];
    else if (argv[i] === '--function') args.function = argv[++i];
    else if (argv[i] === '--all') args.all = true;
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

function allow() {
  console.log(JSON.stringify({ action: 'ALLOW' }));
  process.exit(0);
}

function block(reason) {
  console.log(JSON.stringify({ action: 'BLOCK', reason }));
  process.exit(1);
}

function isCommittedContract(contractPath) {
  const relative = path.relative(process.cwd(), contractPath).replace(/\\/g, '/');
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', relative], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function contractFunctions() {
  try {
    return fs.readdirSync(OUTCOMES_DIR)
      .filter(name => fs.statSync(path.join(OUTCOMES_DIR, name)).isDirectory())
      .filter(name => fs.existsSync(path.join(OUTCOMES_DIR, name, 'contract.md')));
  } catch (_) {
    return [];
  }
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return allow();

  const args = parseArgs(process.argv.slice(2));
  if (!args.command) return allow();
  if (!args.function && !(args.command === 'ship' && args.all)) return allow();

  if (args.command === 'spec' || args.command === 'build') {
    const contractPath = path.join(OUTCOMES_DIR, args.function, 'contract.md');
    if (!fs.existsSync(contractPath)) {
      return block(`No committed outcome contract for "${args.function}". Run $contract init ${args.function} before $${args.command}.`);
    }
    if (!isCommittedContract(contractPath)) {
      return block(`Outcome contract for "${args.function}" exists but is not committed. Commit outcomes/${args.function}/contract.md before $${args.command}.`);
    }
    return allow();
  }

  if (args.command === 'ship') {
    if (args.all) {
      const functions = contractFunctions();
      if (functions.length === 0) return block('No outcome contracts found for this deployment. Run $contract init for each production-bound function before $ship.');
      const failures = [];
      for (const fn of functions) {
        const record = readEvidence()[fn];
        if (!record || !CERTIFYING_TIERS.has(record.tier)) failures.push(`${fn}: missing e2e/reference evidence`);
        else if (sourceHash(fn) !== record.source_hash) failures.push(`${fn}: stale evidence`);
      }
      if (failures.length) return block(`CocoContract ship gate failed: ${failures.join('; ')}`);
      return allow();
    }
    const evidence = readEvidence();
    const record = evidence[args.function];
    if (!record || !CERTIFYING_TIERS.has(record.tier)) {
      return block(`No e2e or reference evidence for "${args.function}". Run $contract prove ${args.function} --tier e2e before $ship.`);
    }
    if (sourceHash(args.function) !== record.source_hash) {
      return block(`Evidence for "${args.function}" is stale (source changed since proof). Run $contract prove ${args.function} --tier e2e again before $ship.`);
    }
    return allow();
  }

  return allow();
}

main();
