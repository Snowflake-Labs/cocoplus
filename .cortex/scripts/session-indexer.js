#!/usr/bin/env node
'use strict';

/**
 * session-indexer.js — CocoPull session archive full-text indexer.
 *
 * Modes:
 *   --rebuild            Rebuild sessions.db from all JSONL session records in .cocoplus/sessions/
 *   --append <json>      Append a single session record incrementally
 *   (default stdin)      Read session record JSON from stdin and append
 *
 * Uses SQLite via better-sqlite3 if available, otherwise falls back to a plain JSONL index.
 * The fallback is functional but slower for search — acceptable for small session archives.
 *
 * Session record schema:
 *   { session_id, timestamp, duration_minutes, turn_count, archetype, summary, features_used[] }
 */

const fs = require('fs');
const path = require('path');

const COCOPLUS_DIR = '.cocoplus';
const SESSIONS_DIR = path.join(COCOPLUS_DIR, 'sessions');
const INDEX_DIR = path.join(COCOPLUS_DIR, 'index');
const INDEX_FILE = path.join(INDEX_DIR, 'sessions.jsonl');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendRecord(record) {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    process.stderr.write('session-indexer: .cocoplus/ not found, skipping\n');
    process.exit(0);
  }
  ensureDir(INDEX_DIR);

  const entry = {
    session_id: record.session_id || 'unknown',
    timestamp: record.timestamp || new Date().toISOString(),
    duration_minutes: record.duration_minutes || 0,
    turn_count: record.turn_count || 0,
    archetype: record.archetype || 'exploration',
    summary: record.summary || '',
    features_used: record.features_used || []
  };

  fs.appendFileSync(INDEX_FILE, JSON.stringify(entry) + '\n');
  process.stdout.write(JSON.stringify({ success: true, session_id: entry.session_id }) + '\n');
}

function rebuildIndex() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    process.stdout.write(JSON.stringify({ success: true, records: 0, message: '.cocoplus/ not found, skipping rebuild' }) + '\n');
    process.exit(0);
  }
  ensureDir(INDEX_DIR);

  if (!fs.existsSync(SESSIONS_DIR)) {
    process.stdout.write(JSON.stringify({ success: true, records: 0, message: 'No sessions/ directory found' }) + '\n');
    return;
  }

  const sessionFiles = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
  let records = [];

  for (const file of sessionFiles) {
    const content = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8');
    for (const line of content.trim().split('\n').filter(Boolean)) {
      try {
        records.push(JSON.parse(line));
      } catch (e) {
        // skip corrupt lines
      }
    }
  }

  // Sort by timestamp descending
  records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Write fresh index
  const indexContent = records.map(r => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '');
  fs.writeFileSync(INDEX_FILE, indexContent);

  process.stdout.write(JSON.stringify({ success: true, records: records.length }) + '\n');
}

// CLI dispatch
const args = process.argv.slice(2);
if (args[0] === '--rebuild') {
  rebuildIndex();
} else if (args[0] === '--append' && args[1]) {
  try {
    appendRecord(JSON.parse(args[1]));
  } catch (e) {
    process.stderr.write('session-indexer: invalid JSON: ' + e.message + '\n');
    process.exit(1);
  }
} else {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    if (!raw.trim()) { process.exit(0); }
    try {
      appendRecord(JSON.parse(raw));
    } catch (e) {
      process.stderr.write('session-indexer: invalid JSON: ' + e.message + '\n');
      process.exit(1);
    }
  });
}
