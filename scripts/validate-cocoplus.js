#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const pluginPath = path.join(repoRoot, 'plugin.json');
const agentsDir = path.join(repoRoot, '.cortex', 'agents');
const hooksDir = path.join(repoRoot, '.cortex', 'hooks');

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

  for (const agentId of plugin.agents || []) {
    const agentFile = path.join(agentsDir, `${agentId}.agent.md`);
    if (!fs.existsSync(agentFile)) {
      failures.push(`Manifest agent "${agentId}" is missing file ${path.relative(repoRoot, agentFile)}`);
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
