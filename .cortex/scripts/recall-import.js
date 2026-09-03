#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ensureDir, parseArgs, readJson, writeJson } = require('./_script-utils.js');

const INDEX_PATH = path.join('.cocoplus', 'recall-index.json');

function loadIndex() {
  return readJson(INDEX_PATH, { sessions: [] });
}

function textFor(session) {
  return JSON.stringify(session).toLowerCase();
}

function importSources() {
  const config = readJson(path.join('cocoplus', 'recall-sources.json'), { sources: [] });
  const sessions = [];
  for (const source of config.sources || []) {
    if (!fs.existsSync(source)) continue;
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
      const filePath = path.join(source, entry.name);
      for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean)) {
        const session = JSON.parse(line);
        sessions.push({ ...session, source_path: filePath, source_exists: fs.existsSync(filePath) });
      }
    }
  }
  writeJson(INDEX_PATH, { imported_at: new Date().toISOString(), sessions });
  console.log(JSON.stringify({ imported: sessions.length }));
}

function query(args) {
  const needle = String(args.query || '').toLowerCase();
  const fn = args.function || '';
  const results = loadIndex().sessions
    .filter((session) => !needle || textFor(session).includes(needle))
    .filter((session) => !fn || (session.functions_touched || []).includes(fn))
    .map((session) => ({ ...session, source_exists: fs.existsSync(session.source_path || '') }));
  console.log(JSON.stringify({ results }, null, 2));
}

function show(id) {
  const session = loadIndex().sessions.find((item) => item.session_id === id);
  if (!session) {
    console.error(`Session not found: ${id}`);
    process.exit(1);
  }
  console.log(JSON.stringify(session, null, 2));
}

const args = parseArgs(process.argv.slice(2));
ensureDir('.cocoplus');
if (args.import) importSources();
else if (args.query !== undefined) query(args);
else if (args.show) show(args.show);
else {
  console.error('Usage: recall-import.js --import | --query <text> [--function name] | --show <session-id>');
  process.exit(1);
}
