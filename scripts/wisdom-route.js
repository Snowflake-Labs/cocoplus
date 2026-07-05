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

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
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
      classification_breakdown: counts,
      corrections: groupEntries.map(e => ({ text: e.text, ts: e.ts })),
    };
  });

  console.log(JSON.stringify({ groups, ungrouped_count: entries.length - withContext.length }, null, 2));
}

main();
