'use strict';

/**
 * cupper-capture.js — CocoCupper automatic correction capture (Tier 1, <200ms, no LLM)
 *
 * Invoked from user-prompt-submit.js on every developer prompt. Applies a
 * fixed regex set to detect correction language, appends matches atomically
 * to .cocoplus/cupper/auto-captured.json. Silent — never surfaces output
 * itself; $cup history is where captures become visible.
 *
 * Usage: node cupper-capture.js --message "<text>" [--skill-context "<name>"]
 */

const path = require('path');
const fs = require('fs');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const CAPTURE_PATH = path.join(COCOPLUS_DIR, 'cupper', 'auto-captured.json');

const CORRECTION_PATTERNS = [
  /\bno[,.]?\s+(that's not|that is not|not what)\b/i,
  /\bthat's wrong\b/i,
  /\bdon'?t do that\b/i,
  /\bstop doing\b/i,
  /\bundo that\b/i,
  /\bnot like that\b/i,
  /\bi meant\b/i,
  /\brevert (that|this)\b/i,
  /\bthat's not (right|correct)\b/i,
  /\bactually,? (no|don'?t)\b/i,
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--message') args.message = argv[++i];
    else if (argv[i] === '--skill-context') args.skillContext = argv[++i];
  }
  return args;
}

function detectCorrection(message) {
  if (isMetaInstruction(message)) return null;
  for (const pattern of CORRECTION_PATTERNS) {
    if (pattern.test(message)) return pattern.source;
  }
  return null;
}

function isMetaInstruction(message) {
  return /^---\s*\n[\s\S]*?\n---/.test(message) ||
    /\buser-invocable:\s*(true|false)\b/i.test(message) ||
    /\bYou are executing (a )?Coco[A-Za-z]+ command\b/i.test(message) ||
    /\b## Anti-Rationalization\b/i.test(message) ||
    /\b## Exit Criteria\b/i.test(message);
}

function appendCapture(entry) {
  fs.mkdirSync(path.dirname(CAPTURE_PATH), { recursive: true });
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(CAPTURE_PATH, 'utf8'));
    if (!Array.isArray(existing)) existing = [];
  } catch (_) { /* file doesn't exist yet */ }

  existing.push(entry);

  const tmp = CAPTURE_PATH + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(existing, null, 2), 'utf8');
  fs.renameSync(tmp, CAPTURE_PATH);
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const args = parseArgs(process.argv.slice(2));
  if (!args.message) return;

  const matchedPattern = detectCorrection(args.message);
  if (!matchedPattern) return;

  appendCapture({
    text: args.message.slice(0, 500),
    matched_pattern: matchedPattern,
    skill_context: args.skillContext || null,
    ts: new Date().toISOString(),
  });
}

main();
