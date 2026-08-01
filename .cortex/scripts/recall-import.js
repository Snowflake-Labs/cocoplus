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
 *   --query "<text>" [--all] [--session <id>] [--function <name>] [--outcome-type <type>]   Search the index
 *   --show <session-id>            Show a session's full turn sequence
 *   --sources                      List configured session sources
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
    else if (a === '--show') args.show = argv[++i];
    else if (a === '--sources') args.sources = true;
    else if (a === '--since') args.since = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--session') args.session = argv[++i];
    else if (a === '--function') args.function = argv[++i];
    else if (a === '--outcome-type') args.outcomeType = argv[++i];
  }
  return args;
}

function loadSources() {
  const defaults = [TRANSCRIPTS_DIR];
  try {
    const raw = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'));
    if (Array.isArray(raw)) return raw.map(String);
    if (Array.isArray(raw.sources)) return raw.sources.map(source => typeof source === 'string' ? source : source.path).filter(Boolean);
  } catch (_) { /* use default */ }
  return defaults;
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
      entity_tags TEXT,
      source_path TEXT
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
    CREATE TABLE IF NOT EXISTS tool_calls (
      session_id TEXT,
      name TEXT,
      payload TEXT
    );
    CREATE TABLE IF NOT EXISTS function_touches (
      session_id TEXT,
      function_name TEXT
    );
    CREATE TABLE IF NOT EXISTS evaluation_results (
      session_id TEXT,
      metric TEXT,
      value TEXT,
      payload TEXT
    );
    CREATE TABLE IF NOT EXISTS outcome_contracts (
      session_id TEXT,
      function_name TEXT,
      outcome_type TEXT,
      status TEXT,
      payload TEXT
    );
    CREATE TABLE IF NOT EXISTS strategy_usage (
      session_id TEXT,
      strategy_id TEXT
    );
    CREATE TABLE IF NOT EXISTS key_decisions (
      session_id TEXT,
      decision TEXT
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
  try { db.exec('ALTER TABLE sessions ADD COLUMN source_path TEXT'); } catch (_) { /* already exists */ }
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
  const files = [];
  for (const sourceDir of loadSources()) {
    if (!sourceDir || !fs.existsSync(sourceDir)) continue;
    for (const file of fs.readdirSync(sourceDir).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'))) {
      files.push(path.join(sourceDir, file));
    }
  }
  if (!sinceDate) return files;
  const sinceTime = new Date(sinceDate).getTime();
  return files.filter(f => {
    try {
      return fs.statSync(f).mtimeMs >= sinceTime;
    } catch (_) {
      return false;
    }
  });
}

function parseTranscriptFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.jsonl')) {
    const sessions = text.split(/\r?\n/)
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch (_) { return null; }
      })
      .filter(Boolean);
    if (sessions.length === 1) return sessions[0];
    return {
      session_id: path.basename(filePath, path.extname(filePath)),
      turns: sessions.flatMap((entry, idx) => entry.turns || [{ role: entry.role || entry.speaker || 'unknown', text: entry.text || entry.content || JSON.stringify(entry), seq: idx }]),
    };
  }
  return JSON.parse(text);
}

function runImport(db, args) {
  const files = listTranscriptFiles(args.since);
  let sessionCount = 0;
  let turnCount = 0;

  const upsertSession = db.prepare(`
    INSERT INTO sessions (id, start_time, end_time, phase_context, entity_tags, source_path)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET end_time=excluded.end_time, phase_context=excluded.phase_context, entity_tags=excluded.entity_tags, source_path=excluded.source_path
  `);
  const upsertTurn = db.prepare(`
    INSERT INTO turns (id, session_id, speaker_role, seq, summary, text_hash, tags, text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET summary=excluded.summary, text_hash=excluded.text_hash, tags=excluded.tags, text=excluded.text
  `);
  const insertEntity = db.prepare(`INSERT INTO entities (name, type, session_id, turn_id) VALUES (?, ?, ?, ?)`);
  const clearEntitiesForSession = db.prepare(`DELETE FROM entities WHERE session_id = ?`);
  const clearToolCalls = db.prepare(`DELETE FROM tool_calls WHERE session_id = ?`);
  const clearFunctionTouches = db.prepare(`DELETE FROM function_touches WHERE session_id = ?`);
  const clearEvaluationResults = db.prepare(`DELETE FROM evaluation_results WHERE session_id = ?`);
  const clearOutcomeContracts = db.prepare(`DELETE FROM outcome_contracts WHERE session_id = ?`);
  const clearStrategyUsage = db.prepare(`DELETE FROM strategy_usage WHERE session_id = ?`);
  const clearKeyDecisions = db.prepare(`DELETE FROM key_decisions WHERE session_id = ?`);
  const insertToolCall = db.prepare(`INSERT INTO tool_calls (session_id, name, payload) VALUES (?, ?, ?)`);
  const insertFunctionTouch = db.prepare(`INSERT INTO function_touches (session_id, function_name) VALUES (?, ?)`);
  const insertEvaluation = db.prepare(`INSERT INTO evaluation_results (session_id, metric, value, payload) VALUES (?, ?, ?, ?)`);
  const insertOutcome = db.prepare(`INSERT INTO outcome_contracts (session_id, function_name, outcome_type, status, payload) VALUES (?, ?, ?, ?, ?)`);
  const insertStrategy = db.prepare(`INSERT INTO strategy_usage (session_id, strategy_id) VALUES (?, ?)`);
  const insertDecision = db.prepare(`INSERT INTO key_decisions (session_id, decision) VALUES (?, ?)`);

  for (const file of files) {
    let raw;
    try {
      raw = parseTranscriptFile(file);
    } catch (_) {
      continue; // corrupt or unreadable transcript — skip, do not fail the whole import
    }
    const sessionId = raw.session_id || path.basename(file, path.extname(file));
    const turns = Array.isArray(raw.turns) ? raw.turns : [];
    const allEntityTags = new Set();

    clearEntitiesForSession.run(sessionId);
    clearToolCalls.run(sessionId);
    clearFunctionTouches.run(sessionId);
    clearEvaluationResults.run(sessionId);
    clearOutcomeContracts.run(sessionId);
    clearStrategyUsage.run(sessionId);
    clearKeyDecisions.run(sessionId);

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

    for (const call of raw.tool_calls || raw.toolCalls || []) {
      insertToolCall.run(sessionId, call.name || call.tool || 'unknown', JSON.stringify(call));
    }
    for (const fn of raw.functions_touched || raw.functionsTouched || raw.function_names || []) {
      insertFunctionTouch.run(sessionId, String(fn));
    }
    for (const result of raw.evaluation_results || raw.evaluationResults || []) {
      insertEvaluation.run(sessionId, result.metric || result.name || 'unknown', String(result.value ?? result.status ?? ''), JSON.stringify(result));
    }
    for (const contract of raw.outcome_contracts || raw.outcomeContracts || []) {
      insertOutcome.run(sessionId, contract.function || contract.function_name || null, contract.outcome_type || contract.type || null, contract.status || contract.result || null, JSON.stringify(contract));
    }
    for (const strategyId of raw.strategy_ids || raw.strategyIds || []) {
      insertStrategy.run(sessionId, String(strategyId));
    }
    for (const decision of raw.key_decisions || raw.keyDecisions || []) {
      insertDecision.run(sessionId, String(decision));
    }

    upsertSession.run(
      sessionId,
      raw.start_time || null,
      raw.end_time || null,
      raw.phase_context || null,
      [...allEntityTags].join(','),
      file
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
  const terms = (args.query || '').toLowerCase().split(/\s+/).filter(Boolean);
  let sql = `SELECT t.id as turn_id, t.session_id, t.text, t.tags, s.start_time, s.phase_context
             FROM turns t JOIN sessions s ON s.id = t.session_id`;
  const where = [];
  const params = [];
  if (args.session) {
    where.push(`t.session_id = ?`);
    params.push(args.session);
  }
  if (args.function) {
    where.push(`EXISTS (SELECT 1 FROM function_touches ft WHERE ft.session_id = t.session_id AND lower(ft.function_name) = lower(?))`);
    params.push(args.function);
  }
  if (args.outcomeType) {
    where.push(`EXISTS (SELECT 1 FROM outcome_contracts oc WHERE oc.session_id = t.session_id AND lower(oc.outcome_type) = lower(?))`);
    params.push(args.outcomeType);
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  const rows = db.prepare(sql).all(...params);

  const scored = rows
    .map(row => ({
      ...row,
      score: (terms.length ? lexicalScore(row.text, row.tags, terms) : 1) + recencyScore(row.start_time) + phaseScore(row.phase_context),
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
    const session = db.prepare('SELECT source_path FROM sessions WHERE id = ?').get(row.session_id);
    const transcriptPath = session && session.source_path ? session.source_path : path.join(TRANSCRIPTS_DIR, `${row.session_id}.json`);
    const sourceExists = fs.existsSync(transcriptPath);
    insertCitation.run(args.query, row.session_id, row.turn_id, sourceExists ? 1 : 0, now);
    const tagList = (row.tags || '').split(',').filter(Boolean);
    return {
      session_id: row.session_id,
      turn_id: row.turn_id,
      text: row.text,
      source_path: transcriptPath,
      source_exists: sourceExists,
      suggested_follow_up: tagList.length ? `search for \`${tagList[0]}\` to find related decisions in other sessions` : null,
    };
  });

  console.log(JSON.stringify({ query: args.query, results: output }, null, 2));
}

function phaseScore(phaseContext) {
  if (!phaseContext) return 0;
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(COCOPLUS_DIR, 'lifecycle', 'meta.json'), 'utf8'));
    return meta.current_phase && String(phaseContext).toLowerCase().includes(String(meta.current_phase).toLowerCase()) ? 1 : 0;
  } catch (_) {
    return 0;
  }
}

function runShow(db, sessionId) {
  const session = db.prepare('SELECT id, source_path, start_time, end_time, phase_context FROM sessions WHERE id = ?').get(sessionId);
  if (!session) fail(`Session "${sessionId}" was not found in recall.db`);
  const turns = db.prepare('SELECT id, speaker_role, seq, text, tags FROM turns WHERE session_id = ? ORDER BY seq ASC').all(sessionId);
  console.log(JSON.stringify({ session, turns }, null, 2));
}

function runSources(db) {
  const configured = loadSources();
  const indexed = db.prepare('SELECT source_path, COUNT(*) as sessions FROM sessions GROUP BY source_path').all();
  let lastImport = null;
  try {
    const row = db.prepare(`SELECT value FROM import_meta WHERE key = 'last_import'`).get();
    lastImport = row && row.value;
  } catch (_) { /* no import */ }
  console.log(JSON.stringify({ configured_sources: configured, indexed_sources: indexed, last_import: lastImport }, null, 2));
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
    else if (args.show) runShow(db, args.show);
    else if (args.sources) runSources(db);
    else fail('Specify one of --import, --query "<text>", --show <session-id>, --sources, or --status');
  } finally {
    db.close();
  }
}

main();
