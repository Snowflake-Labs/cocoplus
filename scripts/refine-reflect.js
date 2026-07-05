'use strict';

/**
 * refine-reflect.js — CocoRefine learning cycle Reflect step (Tier 3, async)
 *
 * Reads refine/pending.jsonl (queued by subagent-stop.js on evaluation subagent
 * completion) and trace data, and determines whether a strategy's effectiveness
 * can be attributed to a recorded evaluation result. This step is deliberately
 * NOT permitted to judge strategy quality itself — it only checks whether a
 * concrete evidence record exists and matches the strategy that was injected.
 *
 * Deterministic gate: an entry only proceeds to attribution if a real evidence
 * record is found. No LLM call decides whether attribution is warranted. An
 * LLM (Haiku) may only be used afterward, to phrase the resulting attribution
 * note in natural language for the strategy file's history — never to decide
 * whether the strategy worked.
 *
 * Usage: node refine-reflect.js
 * Reads: .cocoplus/refine/pending.jsonl
 * Writes: .cocoplus/refine/attributions.jsonl (append), truncates processed
 *         entries from pending.jsonl on success.
 */

const path = require('path');
const fs = require('fs');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const PENDING_PATH = path.join(COCOPLUS_DIR, 'refine', 'pending.jsonl');
const ATTRIBUTIONS_PATH = path.join(COCOPLUS_DIR, 'refine', 'attributions.jsonl');
const CONTRACT_EVIDENCE_PATH = path.join(COCOPLUS_DIR, 'contract-evidence.json');

function readPending() {
  try {
    return fs.readFileSync(PENDING_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch (_) { return null; }
      })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function readContractEvidence() {
  try {
    return JSON.parse(fs.readFileSync(CONTRACT_EVIDENCE_PATH, 'utf8'));
  } catch (_) {
    return {};
  }
}

// Looks for a concrete evaluation result the entry can be grounded in:
// a CocoContract evidence record for the same function, matching the
// function version hash recorded when the strategy was injected.
function findGroundedEvidence(entry, contractEvidence) {
  const record = contractEvidence[entry.function_name];
  if (!record) return null;
  if (record.source_hash !== entry.function_version_hash) return null;
  return record;
}

function appendAttribution(entry, record) {
  fs.mkdirSync(path.dirname(ATTRIBUTIONS_PATH), { recursive: true });
  const attribution = {
    strategy_id: entry.strategy_id,
    session_id: entry.session_id,
    function_name: entry.function_name,
    function_version_hash: entry.function_version_hash,
    evidence_tier: record.tier,
    evidence_result: record.result,
    attributed_at: new Date().toISOString(),
  };
  fs.appendFileSync(ATTRIBUTIONS_PATH, JSON.stringify(attribution) + '\n');
  return attribution;
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const pending = readPending();
  if (pending.length === 0) return;

  const contractEvidence = readContractEvidence();
  const attributed = [];
  const stillPending = [];

  for (const entry of pending) {
    const record = findGroundedEvidence(entry, contractEvidence);
    if (record) {
      attributed.push(appendAttribution(entry, record));
    } else {
      // No evaluation record yet, or it doesn't match the injected version —
      // this entry produces no attribution and stays queued. Not an error.
      stillPending.push(entry);
    }
  }

  // Rewrite pending.jsonl with only the entries that still lack grounding.
  const tmp = PENDING_PATH + '.tmp.' + process.pid;
  fs.mkdirSync(path.dirname(PENDING_PATH), { recursive: true });
  fs.writeFileSync(tmp, stillPending.map(e => JSON.stringify(e)).join('\n') + (stillPending.length ? '\n' : ''), 'utf8');
  fs.renameSync(tmp, PENDING_PATH);

  console.log(JSON.stringify({ attributed: attributed.length, still_pending: stillPending.length }, null, 2));
}

main();
