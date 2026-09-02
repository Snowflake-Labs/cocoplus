#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeJson } = require('./_script-utils.js');

function parseRootConfig() {
  const config = {};
  if (!fs.existsSync('cocoplus.toml')) return config;
  for (const rawLine of fs.readFileSync('cocoplus.toml', 'utf8').split(/\r?\n/)) {
    const kv = rawLine.trim().match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (!kv) continue;
    const raw = kv[2].trim();
    config[kv[1]] = raw === 'true' ? true : raw === 'false' ? false : raw.replace(/^"|"$/g, '');
  }
  return config;
}

const config = parseRootConfig();
const declared = config.automation_maturity || 'L0';
const checklist = [
  { id: 'kill-switch', description: 'Kill switch is configured', passed: config.kill_switch === true },
  { id: 'attempt-cap', description: 'Attempt cap is configured', passed: Number(config.attempt_cap || 0) > 0 },
  { id: 'memory', description: 'Memory mode is explicit', passed: fs.existsSync(path.join('.cocoplus', 'modes', 'memory.on')) },
  { id: 'safety', description: 'Safety mode is explicit', passed: fs.existsSync(path.join('.cocoplus', 'modes', 'safety.normal')) || fs.existsSync(path.join('.cocoplus', 'modes', 'safety.strict')) },
];
writeJson(path.join('.cocoplus', 'maturity.json'), {
  declared_level: declared,
  level: declared,
  l3_checklist: checklist,
});
console.log(JSON.stringify({ declared_level: declared, level: declared, l3_checklist: checklist }, null, 2));
