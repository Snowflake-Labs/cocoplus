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
 * Exit 0: allowed. Exit 1: blocked (reason on stdout as JSON).
 */

const path = require('path');
const fs = require('fs');
const { sourceHash } = require('./_contract-hash.js');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const OUTCOMES_DIR = path.resolve(process.cwd(), 'outcomes');
const EVIDENCE_PATH = path.join(COCOPLUS_DIR, 'contract-evidence.json');

const CERTIFYING_TIERS = new Set(['e2e', 'reference']);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--command') args.command = argv[++i];
    else if (argv[i] === '--function') args.function = argv[++i];
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

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return allow();

  const args = parseArgs(process.argv.slice(2));
  if (!args.command || !args.function) return allow();

  if (args.command === 'spec' || args.command === 'build') {
    const contractPath = path.join(OUTCOMES_DIR, args.function, 'contract.md');
    if (!fs.existsSync(contractPath)) {
      return block(`No committed outcome contract for "${args.function}". Run $contract init ${args.function} before $${args.command}.`);
    }
    return allow();
  }

  if (args.command === 'ship') {
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
