#!/usr/bin/env node
'use strict';

const path = require('path');
const { parseArgs, readJson, writeJson } = require('./_script-utils.js');

const args = parseArgs(process.argv.slice(2));
const opsDir = args['ops-dir'] || path.join('.cocoplus', 'ops');
const snapshot = readJson(path.join(opsDir, 'dora-snapshot.json'), {});
const metrics = snapshot.metrics || {};
const rows = [
  ['Pipeline Run Frequency', metrics.run_frequency || metrics.deployment_frequency],
  ['Data Availability Lead', metrics.data_availability_lead || metrics.lead_time],
  ['Failure Recovery Time', metrics.recovery_time || metrics.mean_time_to_recovery],
  ['Data Quality Failure Rate', metrics.data_quality_failure_rate || metrics.change_failure_rate],
];

const lines = ['# CocoOps DORA Thesis', '', '| Metric | Value | Tier |', '|---|---:|---|'];
for (const [label, metric] of rows) {
  if (!metric) continue;
  lines.push(`| ${label} | ${metric.value} ${metric.unit || ''} | ${metric.tier || ''} |`);
}
writeJson(path.join(opsDir, 'dora-thesis.json'), { overall_health: snapshot.overall_health || null, rows });
require('fs').writeFileSync(path.join(opsDir, 'dora-thesis.md'), `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ status: 'ok', output_path: path.join(opsDir, 'dora-thesis.md') }));
