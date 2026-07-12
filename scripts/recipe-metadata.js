#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const dirs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir') dirs.push(argv[++i]);
  }
  return { dirs };
}

function readRecipe(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const meta = parsed.__recipe_meta || {};
  const stages = Array.isArray(parsed.stages) ? parsed.stages : [];
  return {
    name: meta.name || path.basename(filePath).replace(/\.json\.template$/, ''),
    description: meta.description || '',
    category: meta.category || 'uncategorized',
    estimated_time: meta.estimated_time || meta.estimatedTime || 'unknown',
    difficulty: meta.difficulty || 'unknown',
    keywords: Array.isArray(meta.keywords) ? meta.keywords : [],
    stage_count: Number.isFinite(meta.stage_count) ? meta.stage_count : stages.length,
    stage_preview: stages.slice(0, 5).map(s => s.name || s.id || 'unnamed-stage'),
    path: filePath,
  };
}

function main() {
  const { dirs } = parseArgs(process.argv.slice(2));
  const recipes = [];
  for (const dir of dirs) {
    const fullDir = path.resolve(dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const entry of fs.readdirSync(fullDir)) {
      if (!entry.endsWith('.json.template')) continue;
      recipes.push(readRecipe(path.join(fullDir, entry)));
    }
  }
  recipes.sort((a, b) => a.name.localeCompare(b.name));
  console.log(JSON.stringify({ recipes }, null, 2));
}

main();
