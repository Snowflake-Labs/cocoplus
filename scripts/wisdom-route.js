'use strict';

/**
 * wisdom-route.js — CocoWisdom correction routing (Feature 37 enhancement)
 *
 * Reads .cocoplus/cupper/auto-captured.json entries that carry a skill_context
 * field, groups them by skill, and applies a deterministic first-pass routing
 * classification per group based on the matched correction pattern. The
 * classification here is a structural default; the skill layer may refine it
 * with Haiku (Tier 3) before presenting to the developer. This script never
 * writes to any skill file — it only proposes groupings and classifications.
 */

const path = require('path');
const fs = require('fs');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const CAPTURE_PATH = path.join(COCOPLUS_DIR, 'cupper', 'auto-captured.json');
const WISDOM_DIR = path.join(COCOPLUS_DIR, 'wisdom');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--candidate') args.candidate = argv[++i];
    else if (arg === '--keep') args.keep = true;
    else if (arg === '--forget') args.forget = true;
    else if (arg === '--id') args.id = argv[++i];
    else if (arg === '--text') args.text = argv[++i];
    else if (arg === '--rationale') args.rationale = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    fail(`Could not read ${filePath}: ${err.message}`);
  }
}

function wordCount(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function evaluateCandidate(candidate, minSessions = 3) {
  const confirmedSessions = new Set((candidate.observations || [])
    .filter(o => o && o.confirmed)
    .map(o => o.session_id)
    .filter(Boolean));
  if (confirmedSessions.size < minSessions) {
    fail(`CocoWisdom evidence gate requires at least ${minSessions} distinct confirmed sessions before stable promotion.`);
  }

  const previousWords = wordCount(candidate.previous_text);
  const candidateWords = wordCount(candidate.candidate_text);
  const previousEntries = Number(candidate.previous_entry_count || 0);
  const candidateEntries = Number(candidate.candidate_entry_count || 0);
  const reducesEntries = candidateEntries < previousEntries;
  const growsWords = candidateWords > previousWords;
  if (growsWords && !reducesEntries && !candidate.justification) {
    fail('CocoWisdom denser-not-larger gate rejected this consolidation: word count increased without reducing entry count.');
  }

  return {
    accepted: true,
    confirmed_sessions: confirmedSessions.size,
    density: {
      previous_words: previousWords,
      candidate_words: candidateWords,
      previous_entries: previousEntries,
      candidate_entries: candidateEntries,
      justified_exception: Boolean(candidate.justification),
    },
  };
}

function appendFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, content, 'utf8');
}

// Deterministic first-pass classification by matched correction pattern shape.
// "undo"/"revert"/"stop doing" implies an action was taken and reversed —
// incorrect-behavior. "i meant" implies a missing option/variant. Everything
// else defaults to agent-misapplication pending Haiku refinement.
function classify(entry) {
  const pattern = entry.matched_pattern || '';
  if (/undo|revert|stop doing|don'?t do that/i.test(pattern)) return 'incorrect-behavior';
  if (/i meant/i.test(pattern)) return 'missing-variant';
  return 'agent-misapplication';
}

function destinationFor(entry, routing) {
  if (entry.skill_context) return 'skill-file';
  if (/guardrail|never|must not|do not run|don'?t run/i.test(entry.text || '')) return 'guardrails';
  if (/convention|standard|naming|schema|warehouse/i.test(entry.text || '')) return 'project-conventions';
  return routing === 'agent-misapplication' ? 'guardrails' : 'project-conventions';
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  if (args.candidate) {
    const result = evaluateCandidate(readJson(path.resolve(process.cwd(), args.candidate)));
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (args.keep) {
    if (!args.id || !args.text) fail('--keep requires --id and --text');
    appendFile(path.join(WISDOM_DIR, 'must-keep.md'), `- ${args.id}: ${args.text}\n`);
    console.log(JSON.stringify({ op: 'keep', id: args.id }, null, 2));
    return;
  }
  if (args.forget) {
    if (!args.id || !args.rationale) fail('--forget requires --id and --rationale');
    appendFile(path.join(WISDOM_DIR, 'consolidation-log.md'), `- ${new Date().toISOString()} forget ${args.id}: ${args.rationale}\n`);
    console.log(JSON.stringify({ op: 'forget', id: args.id }, null, 2));
    return;
  }

  let entries = [];
  try {
    entries = JSON.parse(fs.readFileSync(CAPTURE_PATH, 'utf8'));
    if (!Array.isArray(entries)) entries = [];
  } catch (_) {
    console.log(JSON.stringify({ groups: [], message: 'No auto-captured corrections found.' }, null, 2));
    return;
  }

  const withContext = entries.filter(e => e.skill_context);
  const grouped = {};
  for (const entry of withContext) {
    const key = entry.skill_context;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  }

  const groups = Object.entries(grouped).map(([skillContext, groupEntries]) => {
    const classifications = groupEntries.map(classify);
    const counts = classifications.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    return {
      skill_context: skillContext,
      correction_count: groupEntries.length,
      routing: dominant,
      destination: 'skill-file',
      classification_breakdown: counts,
      corrections: groupEntries.map(e => ({ text: e.text, ts: e.ts })),
    };
  });

  const ungrouped = entries.filter(e => !e.skill_context).map(entry => {
    const routing = classify(entry);
    return {
      routing,
      destination: destinationFor(entry, routing),
      corrections: [{ text: entry.text, ts: entry.ts }],
    };
  });

  console.log(JSON.stringify({ groups, ungrouped, ungrouped_count: ungrouped.length }, null, 2));
}

main();
