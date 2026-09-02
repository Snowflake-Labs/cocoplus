#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { parseArgs } = require('./_script-utils.js');

function parseToml(filePath) {
  const config = {};
  let section = null;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      config[section] = config[section] || {};
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^\[.*\]$/.test(value)) {
      value = value.slice(1, -1).split(',').map((item) => item.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else {
      value = value.replace(/^"|"$/g, '');
    }
    if (section) config[section][kv[1]] = value;
    else config[kv[1]] = value;
  }
  return config;
}

const args = parseArgs(process.argv.slice(2));
const config = parseToml(args.config || 'cocoplus.toml');
const tier = args.tier || 'regular';
const tiers = config.model_tiers || {};
if ((tiers.unavailable || []).includes(tier) || !tiers[tier]) {
  console.error(`Requested model tier "${tier}" is unavailable; no silent fallback is allowed.`);
  process.exit(1);
}
console.log(JSON.stringify({ tier, model: tiers[tier] }));
