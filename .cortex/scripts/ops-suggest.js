#!/usr/bin/env node
'use strict';

/**
 * ops-suggest.js — deterministic time-aware operational suggestion classifier. No LLM.
 *
 * Reads system clock + .cocoplus/ops/dora-snapshot.json for citations.
 * Maps current hour to time bucket and returns 2-3 contextual action suggestions.
 *
 * Output: JSON array of suggestions with citations.
 */

const fs   = require('fs');
const path = require('path');

const COCOPLUS_DIR  = '.cocoplus';
const SNAPSHOT_FILE = path.join(COCOPLUS_DIR, 'ops', 'dora-snapshot.json');

function getTimeBucket(hour, dayOfWeek) {
  // Friday end-of-week
  if (dayOfWeek === 5) return 'friday';
  if (hour >= 7  && hour < 10)  return 'morning';
  if (hour >= 10 && hour < 12)  return 'mid-morning';
  if (hour >= 12 && hour < 14)  return 'midday';
  if (hour >= 14 && hour < 17)  return 'afternoon';
  if (hour >= 17 && hour < 19)  return 'end-of-day';
  return 'off-hours';
}

const SUGGESTION_TEMPLATES = {
  morning: [
    { action: 'Check overnight pipeline run status', command: '$ops dora', priority: 1 },
    { action: 'Review data freshness — any failed tasks from overnight runs?', command: null, priority: 2 },
    { action: 'Scan for failure recovery events in the last 12 hours', command: '$ops dora', priority: 3 },
  ],
  'mid-morning': [
    { action: 'Review open PRs modifying pipeline code', command: 'git log --oneline --since="1 week ago" -- "*.sql"', priority: 1 },
    { action: 'Check for blocked pipelines awaiting review', command: '$ops sprint', priority: 2 },
    { action: 'Review pending CocoSentinel approvals', command: '$sentinel --report', priority: 3 },
  ],
  midday: [
    { action: 'Quick delivery health check — what shipped since standup?', command: '$ops dora', priority: 1 },
    { action: 'Review any DORA metric regressions since morning run', command: '$ops dora', priority: 2 },
  ],
  afternoon: [
    { action: 'Review stale PRs on pipeline code (open >3 days)', command: null, priority: 1 },
    { action: 'Check review cycle time alerts from DORA snapshot', command: '$ops dora', priority: 2 },
    { action: 'Run CocoReview on any outstanding code changes', command: '$review', priority: 3 },
  ],
  'end-of-day': [
    { action: 'Check end-of-day velocity against sprint goals', command: '$ops sprint', priority: 1 },
    { action: 'Review scheduled overnight tasks — are they configured correctly?', command: null, priority: 2 },
  ],
  friday: [
    { action: 'Run weekly delivery health summary', command: '$ops dora', priority: 1 },
    { action: 'Review full sprint burndown before weekend', command: '$ops sprint', priority: 2 },
    { action: 'Check quality failure rate trend for the week', command: '$ops dora', priority: 3 },
  ],
  'off-hours': [
    { action: 'Review DORA metrics for the session', command: '$ops dora', priority: 1 },
  ],
};

function getCitations(snapshot) {
  if (!snapshot) return null;
  const signals = snapshot.git_signals || {};
  const runFreq = snapshot.metrics && snapshot.metrics.run_frequency;
  return {
    commits_14d: signals.commits_14d || 0,
    run_frequency: runFreq ? `${runFreq.value} runs/day (${runFreq.tier} tier)` : null,
    overall_health: snapshot.overall_health || 'Unknown',
  };
}

function main() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri

  const bucket = getTimeBucket(hour, dayOfWeek);
  const suggestions = SUGGESTION_TEMPLATES[bucket] || SUGGESTION_TEMPLATES['off-hours'];

  let citations = null;
  try {
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
    citations = getCitations(snapshot);
  } catch (_) { /* snapshot may not exist */ }

  const output = {
    time_bucket: bucket,
    current_hour: hour,
    suggestions: suggestions.map(s => ({
      priority: s.priority,
      action:   s.action,
      command:  s.command,
      citation: citations ? `Based on: ${citations.run_frequency || citations.overall_health || 'DORA snapshot'}` : null,
    })),
  };

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

try {
  main();
} catch (err) {
  process.stderr.write('ops-suggest: ' + err.message + '\n');
  process.exit(1);
}
