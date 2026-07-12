#!/usr/bin/env node
/**
 * CocoOps Longitudinal Thesis Updater
 *
 * Reads the most recent dora-insights-*.md file (the prior thesis),
 * reads the new dora-snapshot.json, and writes an updated thesis block
 * to dora-thesis.md using the carry-forward pattern:
 *   - Prior thesis is preserved verbatim
 *   - New evidence is appended as a dated subsection
 *   - Never replaces, only extends
 *
 * No LLM. Deterministic structure. Text content comes from dora-snapshot.json.
 * Exit 0 on success, exit 1 on error.
 *
 * Usage:
 *   node scripts/ops-thesis-updater.js [--ops-dir <path>]
 *
 * Reads:  <ops-dir>/dora-snapshot.json
 *         <ops-dir>/dora-thesis.md (if exists)
 * Writes: <ops-dir>/dora-thesis.md (append-only structure)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DEFAULT_OPS_DIR = path.join('.cocoplus', 'ops');

function parseArgs() {
  const args    = process.argv.slice(2);
  const dirFlag = args.indexOf('--ops-dir');
  return dirFlag !== -1 ? args[dirFlag + 1] : DEFAULT_OPS_DIR;
}

function isoUtc() {
  return new Date().toISOString();
}

function readSnapshot(opsDir) {
  const snapshotPath = path.join(opsDir, 'dora-snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    console.error(`dora-snapshot.json not found at ${snapshotPath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse dora-snapshot.json: ${err.message}`);
    process.exit(1);
  }
}

function buildEvidenceBlock(snapshot, timestamp) {
  const date    = timestamp.slice(0, 10);
  const metrics = snapshot.metrics || {};

  const lines = [
    `### New Evidence — ${date}`,
    '',
    `Computed at: ${timestamp}`,
    '',
    '| Metric | Value | Tier |',
    '|--------|-------|------|',
  ];

  const METRIC_ALIASES = [
    ['Pipeline Run Frequency', ['run_frequency', 'pipeline_run_frequency']],
    ['Data Availability Lead', ['lead_time', 'data_availability_lead']],
    ['Failure Recovery Time', ['recovery_time', 'failure_recovery_time']],
    ['Data Quality Failure Rate', ['quality_failure_rate', 'data_quality_failure_rate']],
  ];

  for (const [label, keys] of METRIC_ALIASES) {
    const key = keys.find(k => metrics[k]);
    const m     = key ? metrics[key] : {};
    const value = m.value !== undefined ? String(m.value) : 'N/A';
    const unit  = m.unit  || '';
    const tier  = m.tier  || 'unknown';
    lines.push(`| ${label} | ${value}${unit ? ' ' + unit : ''} | ${tier} |`);
  }

  const overall = snapshot.overall_health || 'unknown';
  lines.push('');
  lines.push(`Overall health tier: **${overall}**`);

  const signals = snapshot.notable_signals || [];
  if (signals.length > 0) {
    lines.push('');
    lines.push('Notable signals:');
    for (const s of signals) {
      lines.push(`- ${s}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function main() {
  const opsDir   = parseArgs();
  const snapshot = readSnapshot(opsDir);
  const ts       = isoUtc();
  const thesisPath = path.join(opsDir, 'dora-thesis.md');

  let existingContent = '';
  let isFirstRun = true;

  if (fs.existsSync(thesisPath)) {
    existingContent = fs.readFileSync(thesisPath, 'utf8');
    isFirstRun = false;
  }

  const evidenceBlock = buildEvidenceBlock(snapshot, ts);

  let updatedContent;
  if (isFirstRun) {
    updatedContent = [
      '# CocoOps Longitudinal Delivery Thesis',
      '',
      `Created: ${ts}`,
      '',
      '## Thesis',
      '',
      '_Initial thesis established from first DORA snapshot. Extended with each subsequent $ops dora run._',
      '',
      evidenceBlock,
    ].join('\n');
  } else {
    // Carry-forward: append evidence block after existing content
    updatedContent = existingContent.trimEnd() + '\n\n' + evidenceBlock;
  }

  try {
    fs.writeFileSync(thesisPath, updatedContent, 'utf8');
  } catch (err) {
    console.error(`Failed to write dora-thesis.md: ${err.message}`);
    process.exit(1);
  }

  const action = isFirstRun ? 'created' : 'extended';
  console.log(`dora-thesis.md ${action} at ${thesisPath}`);
}

main();
