#!/usr/bin/env node
'use strict';

const path = require('path');
const { appendLine, ensureDir, parseArgs, readJson } = require('./_script-utils.js');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const wisdomDir = path.join('.cocoplus', 'wisdom');
ensureDir(wisdomDir);

if (args.candidate) {
  const candidate = readJson(args.candidate, {});
  const distinct = new Set((candidate.observations || []).filter((item) => item.confirmed).map((item) => item.session_id));
  if (distinct.size < 3) fail('Wisdom routing requires at least 3 distinct confirmed sessions.');
  const previousLength = String(candidate.previous_text || '').length;
  const candidateLength = String(candidate.candidate_text || '').length;
  const previousEntries = Number(candidate.previous_entry_count || 0);
  const candidateEntries = Number(candidate.candidate_entry_count || 0);
  if (candidateEntries >= previousEntries && candidateLength > previousLength) {
    fail('Wisdom routing rejected by denser-not-larger rule.');
  }
  console.log(JSON.stringify({ accepted: true }));
} else if (args.keep) {
  appendLine(path.join(wisdomDir, 'must-keep.md'), `- ${args.id}: ${args.text || ''}`);
  console.log(JSON.stringify({ kept: args.id || null }));
} else if (args.forget) {
  appendLine(path.join(wisdomDir, 'consolidation-log.md'), `- ${args.id}: ${args.rationale || ''}`);
  console.log(JSON.stringify({ forgotten: args.id || null }));
} else {
  fail('Usage: wisdom-route.js --candidate file | --keep --id id --text text | --forget --id id --rationale text');
}
