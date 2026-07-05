'use strict';

/**
 * recall-import.js — CocoRecall SQLite index builder and query engine
 *
 * Uses Node's built-in `node:sqlite` module (stable from Node 22.5+) rather
 * than a native-binary dependency like better-sqlite3 — CocoPlus hooks and
 * scripts must stay pure Node with no compiled addons. If node:sqlite is
 * unavailable (older Node runtime), this script fails gracefully with a
 * clear message rather than crashing the calling hook.
 *
 * Modes:
 *   --import [--since <date>]        Rebuild/update recall.db from transcripts
 *   --query "<text>" [--all] [--session <id>]   Search the index
 *   --status                         Report index health
 *
 * Schema: sessions(id, start_time, end_time, phase_context, entity_tags),
 *         turns(id, session_id, speaker_role, seq, summary, text_hash, tags, text),
 *         entities(name, type, session_id, turn_id),
 *         citations(query, session_id, turn_id, source_exists, ts)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const DB_PATH = path.join(COCOPLUS_DIR, 'recall.db');
const TRANSCRIPTS_DIR = path.join(os.homedir(), '.snowflake', 'cortex', 'conversations');
const SOURCES_PATH = path.resolve(process.cwd(), 'cocoplus', 'recall-sources.json');

function loadSqlite() {
  try {
    return require('node:sqlite');
  } catch (_) {
    return null;
  }
}

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function parseArgs(argv) {
  const args = { all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--import') args.import = true;
    else if (a === '--query') args.query = argv[++i];
    else if (a === '--status') args.status = true;
    else if (a === '--since') args.since = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--session') args.session = argv[++i];
  }
  return args;
}

function openDb(sqlite) {
  fs.mkdirSync(COCOPLUS_DIR, { recursive: true });
  const db = new sqlite.DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      start_time TEXT,
      end_time TEXT,
      phase_context TEXT,
      entity_tags TEXT
    );
    CREATE TABLE IF NOT EXISTS turns (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      speaker_role TEXT,
      seq INTEGER,
      summary TEXT,
      text_hash TEXT,
      tags TEXT,
      text TEXT
    );
    CREATE TABLE IF NOT EXISTS entities (
      name TEXT,
      type TEXT,
      session_id TEXT,
      turn_id TEXT
    );
    CREATE TABLE IF NOT EXISTS citations (
      query TEXT,
      session_id TEXT,
      turn_id TEXT,
      source_exists INTEGER,
      ts TEXT
    );
    CREATE TABLE IF NOT EXISTS import_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  return db;
}

// Non-LLM extractive summary: first sentence, capped.
function extractiveSummary(text) {
  const firstSentence = (text || '').split(/(?<=[.!?])\s/)[0] || '';
  return firstSentence.slice(0, 240);
}

// Deterministic entity extraction: capitalized identifiers, function-call-shaped
// tokens, and known Snowflake object keywords. No LLM.
const ENTITY_KEYWORDS = /\b(TABLE|VIEW|TASK|STREAM|DYNAMIC TABLE|ALERT|PROCEDURE|FUNCTION|POLICY)\b/gi;
function extractEntities(text) {
  const found = new Set();
  const fnCalls = (text || '').match(/\b[a-z_][a-z0-9_]*\s*\(/gi) || [];
  for (const call of fnCalls) found.add(call.replace(/\s*\($/, '').toLowerCase());
  const keywords = (text || '').match(ENTITY_KEYWORDS) || [];
  for (const kw of keywords) found.add(kw.toUpperCase());
  return [...found];
}

function listTranscriptFiles(sinceDate) {
  if (!fs.existsSync(TRANSCRIPTS_DIR)) return [];
  const files = fs.readdirSync(TRANSCRIPTS_DIR).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));
  if (!sinceDate) return files;
  const sinceTime = new Date(sinceDate).getTime();
  return files.filter(f => {
    try {
      return fs.statSync(path.join(TRANSCRIPTS_DIR, f)).mtimeMs >= sinceTime;
    } catch (_) {
      return false;
    }
  });
}

function runImport(db, args) {
  const files = listTranscriptFiles(args.since);
  let sessionCount = 0;
  let turnCount = 0;

  const upsertSession = db.prepare(`
    INSERT INTO sessions (id, start_time, end_time, phase_context, entity_tags)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET end_time=excluded.end_time, phase_context=excluded.phase_context, entity_tags=excluded.entity_tags
  `);
  const upsertTurn = db.prepare(`
    INSERT INTO turns (id, session_id, speaker_role, seq, summary, text_hash, tags, text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET summary=excluded.summary, text_hash=excluded.text_hash, tags=excluded.tags, text=excluded.text
  `);
  const insertEntity = db.prepare(`INSERT INTO entities (name, type, session_id, turn_id) VALUES (?, ?, ?, ?)`);
  const clearEntitiesForSession = db.prepare(`DELETE FROM entities WHERE session_id = ?`);

  for (const file of files) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(TRANSCRIPTS_DIR, file), 'utf8'));
    } catch (_) {
      continue; // corrupt or unreadable transcript — skip, do not fail the whole import
    }
    const sessionId = raw.session_id || path.basename(file, path.extname(file));
    const turns = Array.isArray(raw.turns) ? raw.turns : [];
    const allEntityTags = new Set();

    clearEntitiesForSession.run(sessionId);

    turns.forEach((turn, idx) => {
      const text = turn.text || turn.content || '';
      const turnId = `${sessionId}:${idx}`;
      const entities = extractEntities(text);
      entities.forEach(e => allEntityTags.add(e));

      upsertTurn.run(
        turnId,
        sessionId,
        turn.role || turn.speaker || 'unknown',
        idx,
        extractiveSummary(text),
        crypto.createHash('sha256').update(text).digest('hex'),
        entities.join(','),
        text
      );
      turnCount++;

      for (const entity of entities) {
        insertEntity.run(entity, /\(/.test(entity) ? 'function' : 'snowflake_object', sessionId, turnId);
      }
    });

    upsertSession.run(
      sessionId,
      raw.start_time || null,
      raw.end_time || null,
      raw.phase_context || null,
      [...allEntityTags].join(',')
    );
    sessionCount++;
  }

  db.prepare(`INSERT INTO import_meta (key, value) VALUES ('last_import', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`)
    .run(new Date().toISOString());

  console.log(JSON.stringify({ imported_sessions: sessionCount, imported_turns: turnCount }, null, 2));
}

function lexicalScore(text, tags, terms) {
  const haystack = `${text} ${tags}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function recencyScore(startTime) {
  if (!startTime) return 0;
  const ageDays = (Date.now() - new Date(startTime).getTime()) / 86400000;
  return Math.max(0, 1 - ageDays / 90); // linear decay over ~90 days
}

function runQuery(db, args) {
  const terms = args.query.toLowerCase().split(/\s+/).filter(Boolean);
  let sql = `SELECT t.id as turn_id, t.session_id, t.text, t.tags, s.start_time, s.phase_context
             FROM turns t JOIN sessions s ON s.id = t.session_id`;
  const params = [];
  if (args.session) {
    sql += ` WHERE t.session_id = ?`;
    params.push(args.session);
  }
  const rows = db.prepare(sql).all(...params);

  const scored = rows
    .map(row => ({
      ...row,
      score: lexicalScore(row.text, row.tags, terms) + recencyScore(row.start_time),
    }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score);

  let results = scored;
  if (!args.all) {
    const seen = new Set();
    results = scored.filter(row => {
      if (seen.has(row.session_id)) return false;
      seen.add(row.session_id);
      return true;
    });
  }

  const now = new Date().toISOString();
  const insertCitation = db.prepare(`INSERT INTO citations (query, session_id, turn_id, source_exists, ts) VALUES (?, ?, ?, ?, ?)`);

  const output = results.slice(0, 20).map(row => {
    const transcriptPath = path.join(TRANSCRIPTS_DIR, `${row.session_id}.json`);
    const sourceExists = fs.existsSync(transcriptPath);
    insertCitation.run(args.query, row.session_id, row.turn_id, sourceExists ? 1 : 0, now);
    const tagList = (row.tags || '').split(',').filter(Boolean);
    return {
      session_id: row.session_id,
      turn_id: row.turn_id,
      text: row.text,
      source_exists: sourceExists,
      suggested_follow_up: tagList.length ? `search for \`${tagList[0]}\` to find related decisions in other sessions` : null,
    };
  });

  console.log(JSON.stringify({ query: args.query, results: output }, null, 2));
}

function runStatus(db) {
  const sessionCount = db.prepare('SELECT COUNT(*) as c FROM sessions').get().c;
  const turnCount = db.prepare('SELECT COUNT(*) as c FROM turns').get().c;
  let lastImport = null;
  try {
    lastImport = db.prepare(`SELECT value FROM import_meta WHERE key = 'last_import'`).get().value;
  } catch (_) { /* no import run yet */ }

  const availableFiles = listTranscriptFiles(null).length;

  console.log(JSON.stringify({
    sessions_indexed: sessionCount,
    turns_indexed: turnCount,
    last_import: lastImport,
    sessions_available_at_source: availableFiles,
  }, null, 2));
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) fail('CocoPlus not initialized. Run $pod init first.');

  const sqlite = loadSqlite();
  if (!sqlite) {
    fail('node:sqlite is not available in this Node runtime (requires Node 22.5+). CocoRecall cannot build its index. Upgrade Node to use $recall.');
  }

  const args = parseArgs(process.argv.slice(2));
  const db = openDb(sqlite);

  try {
    if (args.import) runImport(db, args);
    else if (args.query) runQuery(db, args);
    else if (args.status) runStatus(db);
    else fail('Specify one of --import, --query "<text>", or --status');
  } finally {
    db.close();
  }
}

main();
