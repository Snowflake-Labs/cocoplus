#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const pluginPath = path.join(repoRoot, 'plugin.json');
const agentsDir = path.join(repoRoot, '.cortex', 'agents');
const hooksDir = path.join(repoRoot, '.cortex', 'hooks');
const hookLibDir = path.join(hooksDir, 'lib');
const templatesDir = path.join(repoRoot, 'templates');
const recipesDir = path.join(repoRoot, 'recipes');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function listFiles(dirPath, suffix) {
  return fs.readdirSync(dirPath)
    .filter((name) => name.endsWith(suffix))
    .map((name) => path.join(dirPath, name));
}

function walkFiles(dirPath, predicate) {
  if (!fs.existsSync(dirPath)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const filePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkFiles(filePath, predicate));
    } else if (!predicate || predicate(filePath)) {
      found.push(filePath);
    }
  }
  return found;
}

function parseFrontmatterTools(agentFile) {
  const content = readFile(agentFile);
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [];

  const lines = match[1].split(/\r?\n/);
  const tools = [];
  let inTools = false;

  for (const line of lines) {
    if (/^tools:\s*$/.test(line)) {
      inTools = true;
      continue;
    }
    if (inTools) {
      const item = line.match(/^\s*-\s+(.+?)\s*$/);
      if (item) {
        tools.push(item[1]);
        continue;
      }
      if (/^\S/.test(line)) {
        inTools = false;
      }
    }
  }

  return tools;
}

function main() {
  const failures = [];
  const plugin = readJson(pluginPath);

  const requiredAgents = [
    'coco-bloom',
    'coco-klatch',
    'coco-pull',
  ];

  const requiredHookLibs = [
    'agents-update.js',
    'state-reader.js',
  ];

  const requiredTemplates = [
    'flow-view.html.template',
    'meter-view.html.template',
  ];

  const requiredRecipes = [
    'cortex-add-classifier.json.template',
    'cortex-add-search.json.template',
    'cortex-semantic-model.json.template',
    'cortex-add-extraction.json.template',
  ];

  const requiredProjectScripts = [
    'rollback.js',
    'scope-classify.js',
    'spec-validator.js',
    'alignment-check.js',
  ];

  for (const agentId of plugin.agents || []) {
    const agentFile = path.join(agentsDir, `${agentId}.agent.md`);
    if (!fs.existsSync(agentFile)) {
      failures.push(`Manifest agent "${agentId}" is missing file ${path.relative(repoRoot, agentFile)}`);
    }
  }

  for (const agentId of requiredAgents) {
    if (!(plugin.agents || []).includes(agentId)) {
      failures.push(`Required agent "${agentId}" is not registered in plugin.json`);
    }
  }

  for (const fileName of requiredHookLibs) {
    const filePath = path.join(hookLibDir, fileName);
    if (!fs.existsSync(filePath)) {
      failures.push(`Required hook library is missing: ${path.relative(repoRoot, filePath)}`);
    }
  }

  for (const fileName of requiredTemplates) {
    const filePath = path.join(templatesDir, fileName);
    if (!fs.existsSync(filePath)) {
      failures.push(`Required template is missing: ${path.relative(repoRoot, filePath)}`);
    }
  }

  for (const fileName of requiredRecipes) {
    const filePath = path.join(recipesDir, fileName);
    if (!fs.existsSync(filePath)) {
      failures.push(`Required recipe template is missing: ${path.relative(repoRoot, filePath)}`);
    }
  }

  for (const fileName of requiredProjectScripts) {
    const filePath = path.join(templatesDir, 'scripts', fileName);
    if (!fs.existsSync(filePath)) {
      failures.push(`Required project script template is missing: ${path.relative(repoRoot, filePath)}`);
    }
  }

  const stalePatterns = [
    /All 32 Features/i,
    /Thirty-two features/i,
    /32 features/i,
    /three SecondEye Critic/i,
    /three-model parallel/i,
  ];
  const textFiles = [
    path.join(repoRoot, 'README.md'),
    path.join(repoRoot, 'AGENTS.md'),
    ...walkFiles(path.join(repoRoot, 'docs'), (filePath) => filePath.endsWith('.html')),
    ...walkFiles(path.join(repoRoot, '.cortex', 'skills'), (filePath) => filePath.endsWith('.md')),
  ];

  for (const filePath of textFiles) {
    const content = readFile(filePath);
    for (const pattern of stalePatterns) {
      if (pattern.test(content)) {
        failures.push(`Stale reference "${pattern.source}" found in ${path.relative(repoRoot, filePath)}`);
      }
    }
  }

  const hookFiles = listFiles(hooksDir, '.js');
  const spawnedAgents = new Set();

  for (const hookFile of hookFiles) {
    const content = readFile(hookFile);
    const matches = content.matchAll(/agent:\s*'([^']+)'/g);
    for (const match of matches) {
      spawnedAgents.add(match[1]);
    }
  }

  for (const agentId of spawnedAgents) {
    if (!(plugin.agents || []).includes(agentId)) {
      failures.push(`Hook-spawned agent "${agentId}" is not registered in plugin.json`);
    }
    const agentFile = path.join(agentsDir, `${agentId}.agent.md`);
    if (!fs.existsSync(agentFile)) {
      failures.push(`Hook-spawned agent "${agentId}" is missing file ${path.relative(repoRoot, agentFile)}`);
    }
  }

  const writeIntentPatterns = [
    /write findings/i,
    /append to/i,
    /write exactly one timestamped snapshot/i,
    /write .*report/i,
  ];

  for (const agentFile of listFiles(agentsDir, '.agent.md')) {
    const content = readFile(agentFile);
    const tools = parseFrontmatterTools(agentFile);
    const declaresWriteIntent = writeIntentPatterns.some((pattern) => pattern.test(content));
    if (declaresWriteIntent && !tools.includes('Write') && !tools.includes('Edit')) {
      failures.push(`Agent ${path.basename(agentFile)} instructs writes but lacks Write/Edit tool`);
    }
  }

  if (failures.length > 0) {
    console.error('CocoPlus validation failed:\n');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('CocoPlus validation passed.');
}

main();
