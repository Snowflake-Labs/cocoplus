'use strict';

/**
 * trace-blast.js — CocoTrace blast radius computation (deterministic, no LLM, Tier 1)
 *
 * Reads snowflake-deps.json (per-function object dependency map, maintained
 * by trace-check.js's $trace sync extension) and computes the reverse index:
 * given a Snowflake object name, which functions depend on it, how, and
 * whether their CocoContract evidence is stale relative to the object.
 *
 * snowflake-deps.json schema:
 * { "<function-name>": { reads: [...objects], writes: [...objects], cortex_features: [...] } }
 */

const path = require('path');
const fs = require('fs');
const { sourceHash } = require('./_contract-hash.js');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const DEPS_PATH = path.join(COCOPLUS_DIR, 'lifecycle', 'snowflake-deps.json');
const CONTRACT_EVIDENCE_PATH = path.join(COCOPLUS_DIR, 'contract-evidence.json');
const OUTCOMES_DIR = path.resolve(process.cwd(), 'outcomes');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--object') args.object = argv[++i];
  }
  return args;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function traceChain(functionName) {
  const contractPath = path.join(OUTCOMES_DIR, functionName, 'contract.md');
  const hasContract = fs.existsSync(contractPath);
  return hasContract
    ? `bloom → spec → build → outcomes/${functionName}/contract.md`
    : `bloom → spec → build (no CocoContract outcome recorded for ${functionName})`;
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  if (!args.object) {
    console.error(JSON.stringify({ error: '--object is required' }));
    process.exit(1);
  }

  const deps = readJson(DEPS_PATH, {});
  const evidence = readJson(CONTRACT_EVIDENCE_PATH, {});

  const affected = [];
  for (const [functionName, dep] of Object.entries(deps)) {
    const reads = dep.reads || [];
    const writes = dep.writes || [];
    let dependencyType = null;
    if (reads.includes(args.object)) dependencyType = 'read';
    if (writes.includes(args.object)) dependencyType = dependencyType ? 'read+write' : 'write';
    if ((dep.cortex_features || []).includes(args.object)) dependencyType = dependencyType ? `${dependencyType}+structural` : 'structural';

    if (!dependencyType) continue;

    const record = evidence[functionName];
    const contractStale = !record || record.result !== 'pass' || sourceHash(functionName) !== record.source_hash;

    affected.push({
      function: functionName,
      dependency_type: dependencyType,
      traceability_chain: traceChain(functionName),
      contract_evidence_stale: contractStale,
    });
  }

  console.log(JSON.stringify({
    object: args.object,
    affected_functions: affected.length,
    functions: affected,
  }, null, 2));
}

main();
