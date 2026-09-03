#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('./_script-utils.js');

const args = parseArgs(process.argv.slice(2));
const dir = args.dir || 'recipes';
const recipes = [];

for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.json.template')) continue;
  const filePath = path.join(dir, entry.name);
  const recipe = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const stages = recipe.stages || (recipe.flow && recipe.flow.stages) || [];
  recipes.push({
    file: filePath,
    ...(recipe.__recipe_meta || {}),
    stage_count: stages.length,
    stage_preview: stages.map((stage) => stage.name || stage.id).filter(Boolean),
  });
}

console.log(JSON.stringify({ recipes }, null, 2));
