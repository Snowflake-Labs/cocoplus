'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--config') args.config = argv[++i];
    else if (argv[i] === '--tier') args.tier = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function parseModelTiers(tomlText) {
  const tiers = {};
  let section = '';
  for (const rawLine of tomlText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }
    if (section !== 'model_tiers') continue;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!match) continue;
    const key = match[1];
    const raw = match[2].trim();
    if (raw.startsWith('[')) {
      tiers[key] = raw.replace(/^\[|\]$/g, '').split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else {
      tiers[key] = raw.replace(/^"|"$/g, '');
    }
  }
  return tiers;
}

function resolveTier(configPath, tier) {
  const tiers = parseModelTiers(fs.readFileSync(configPath, 'utf8'));
  const unavailable = new Set(Array.isArray(tiers.unavailable) ? tiers.unavailable : []);
  if (unavailable.has(tier) || !tiers[tier]) {
    fail(`Model tier "${tier}" is unavailable or unmapped; no silent fallback is allowed.`);
  }
  return { tier, model: tiers[tier] };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.config || !args.tier) fail('--config and --tier are required');
  console.log(JSON.stringify(resolveTier(path.resolve(process.cwd(), args.config), args.tier), null, 2));
}

if (require.main === module) main();

module.exports = { parseModelTiers, resolveTier };
