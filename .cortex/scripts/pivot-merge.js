#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ensureDir, readJson } = require('./_script-utils.js');

const command = process.argv[2] || 'status';
const lifecycle = path.join('.cocoplus', 'lifecycle');
const findingsPath = path.join(lifecycle, 'FINDINGS.md');

function clear() {
  if (fs.existsSync(findingsPath)) {
    const archive = path.join(lifecycle, 'findings-archive');
    ensureDir(archive);
    fs.renameSync(findingsPath, path.join(archive, `FINDINGS-${Date.now()}.md`));
  }
  console.log(JSON.stringify({ cleared: true }));
}

function merge(skipPartial) {
  ensureDir(lifecycle);
  const records = readJson(path.join('.cocoplus', 'pod-status.json'), []);
  const findings = [];
  for (const record of records) {
    if (skipPartial && record.status === 'PARTIAL') continue;
    for (const finding of record.findings || []) findings.push(finding);
  }
  const body = ['# CocoPivot Findings', ''];
  for (const finding of findings) {
    body.push(`- ${finding.priority || finding.severity || 'P?'} ${finding.id || ''}: ${finding.description || finding.issue_type || ''}`);
  }
  fs.writeFileSync(findingsPath, `${body.join('\n')}\n`, 'utf8');
  console.log(JSON.stringify(summary(findings)));
}

function summary(findings) {
  const byPriority = {};
  for (const finding of findings) {
    const key = finding.priority || 'UNKNOWN';
    byPriority[key] = (byPriority[key] || 0) + 1;
  }
  return { unique_findings: findings.length, by_priority: byPriority };
}

function status() {
  if (fs.existsSync(findingsPath)) {
    const findings = fs.readFileSync(findingsPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^-\s+(\S+)/))
      .filter(Boolean)
      .map((match) => ({ priority: match[1] }));
    console.log(JSON.stringify(summary(findings), null, 2));
    return;
  }
  const records = readJson(path.join('.cocoplus', 'pod-status.json'), []);
  const findings = records.flatMap((record) => record.findings || []);
  console.log(JSON.stringify(summary(findings), null, 2));
}

if (command === 'clear') clear();
else if (command === 'run') merge(process.argv.includes('--skip-partial'));
else if (command === 'show') console.log(fs.existsSync(findingsPath) ? fs.readFileSync(findingsPath, 'utf8') : '');
else if (command === 'status') status();
else {
  console.error(`Unknown pivot command: ${command}`);
  process.exit(1);
}
