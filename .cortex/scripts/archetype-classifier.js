#!/usr/bin/env node
'use strict';

/**
 * archetype-classifier.js — deterministic session archetype classifier.
 *
 * Input (stdin or --input): { "turn_count": N, "duration_minutes": M }
 * Output (stdout): { "archetype": "<archetype>" }
 *
 * Archetypes:
 *   exploration   — short session, low turns (≤5 turns, ≤15 min)
 *   deep-build    — long session, many turns (>20 turns, >60 min)
 *   review-cycle  — moderate turns, moderate duration, tool-use pattern suggests review
 *   quick-fix     — low turns (≤8), short duration (≤20 min)
 *   planning      — many turns (>10), low tool use ratio (handled externally as turn_count high but no build output)
 *
 * Classification is deterministic — no LLM.
 */

function classify({ turn_count, duration_minutes, tool_use_count }) {
  const turns = turn_count || 0;
  const minutes = duration_minutes || 0;
  const tools = tool_use_count || 0;

  if (turns <= 5 && minutes <= 15) return 'exploration';
  if (turns <= 8 && minutes <= 20) return 'quick-fix';
  if (turns > 20 && minutes > 60) return 'deep-build';
  if (turns > 10 && tools === 0) return 'planning';
  return 'review-cycle';
}

function run(inputData) {
  const archetype = classify(inputData);
  process.stdout.write(JSON.stringify({ archetype }) + '\n');
  process.exit(0);
}

const inputArg = process.argv.indexOf('--input');
if (inputArg !== -1 && process.argv[inputArg + 1]) {
  try {
    run(JSON.parse(process.argv[inputArg + 1]));
  } catch (e) {
    process.stderr.write('archetype-classifier: invalid JSON: ' + e.message + '\n');
    process.exit(1);
  }
} else {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    if (!raw.trim()) {
      process.stdout.write(JSON.stringify({ archetype: 'exploration' }) + '\n');
      process.exit(0);
    }
    try {
      run(JSON.parse(raw));
    } catch (e) {
      process.stderr.write('archetype-classifier: invalid JSON: ' + e.message + '\n');
      process.exit(1);
    }
  });
}
