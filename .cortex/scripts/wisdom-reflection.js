#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { appendLine, ensureDir, parseArgs, readJson, writeJson } = require('./_script-utils.js');

const ROOT = '.cocoplus';
const WISDOM = path.join(ROOT, 'wisdom');
const PATTERNS = path.join(WISDOM, 'patterns');
const ARCHIVE = path.join(WISDOM, 'archive');
const SESSION = path.join(ROOT, 'session');
const TURNS = path.join(SESSION, 'wisdom-turns.jsonl');
const REFLECTIONS = path.join(WISDOM, 'reflection-requests.jsonl');
const ALLOWED_ACTIONS = new Set(['add', 'merge', 'patch', 'drop-support-file', 'delete']);

function sha(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function appendJsonLine(filePath, value) { appendLine(filePath, JSON.stringify(value)); }
function slug(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
function patternDir(tier, id) { return path.join(PATTERNS, tier, slug(id)); }
function patternMeta(tier, id) { return path.join(patternDir(tier, id), 'pattern.json'); }

function readJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch (_) { return null; } }).filter(Boolean);
}

function observeTurn(turn, options = {}) {
  const cadence = Math.max(1, Number(options.cadence) || 3);
  const record = { ts: new Date().toISOString(), ...turn };
  appendJsonLine(TURNS, record);
  const sessionTurns = readJsonLines(TURNS).filter((item) => String(item.session_id || 'unknown') === String(record.session_id || 'unknown'));
  const countedTurns = sessionTurns.filter((item) => item.countable !== false);
  if (record.countable === false || countedTurns.length % cadence !== 0) return { queued: false, turn_count: countedTurns.length };
  const boundary = countedTurns.slice(-cadence)[0];
  const boundaryIndex = Math.max(0, sessionTurns.findIndex((item) => item.ts === boundary.ts));
  const recent = sessionTurns.slice(boundaryIndex);
  const prior = sessionTurns.slice(0, boundaryIndex);
  const digest = prior.map((item) => `${item.role || item.kind || 'event'}:${String(item.text || item.tool || '').slice(0, 120)}`).join(' | ').slice(-4000);
  const request = {
    id: `reflection-${sha(`${record.session_id}:${countedTurns.length}`).slice(0, 12)}`,
    requested_at: record.ts,
    session_id: record.session_id || 'unknown',
    cadence,
    recent_turns: recent,
    prior_digest: digest,
    allowed_intents: Array.from(ALLOWED_ACTIONS),
    proposer_write_tools: false,
    pattern_index: listPatterns(),
  };
  appendJsonLine(REFLECTIONS, request);
  return { queued: true, turn_count: countedTurns.length, request };
}

function listPatterns() {
  const found = [];
  for (const tier of ['project', 'global']) {
    const dir = path.join(PATTERNS, tier);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const meta = readJson(path.join(dir, entry.name, 'pattern.json'), null);
      if (meta && meta.authorship === 'autonomous') found.push(meta);
    }
  }
  return found;
}

function validateIntent(intent) {
  if (!intent || !ALLOWED_ACTIONS.has(intent.action)) return 'unsupported intent action';
  if (!intent.reason || !intent.evidence) return 'reason and evidence are required';
  if (!['project', 'global'].includes(intent.tier)) return 'tier must be project or global';
  const id = slug(intent.pattern_id || intent.id || intent.title);
  if (!id) return 'pattern_id is required';
  if (intent.action === 'add' && !intent.content) return 'add requires content';
  const existing = readJson(patternMeta(intent.tier, id), null);
  if (existing && existing.authorship !== 'autonomous') return 'self-authored-only gate rejected this target';
  if (intent.action !== 'add' && !existing) return 'target pattern does not exist';
  if (/\.\.|[\\/]/.test(String(intent.support_file || ''))) return 'unsafe support file path';
  return null;
}

function promoteIntent(intent, options = {}) {
  const error = validateIntent(intent);
  if (error) return { accepted: false, reason: error };
  const id = slug(intent.pattern_id || intent.id || intent.title);
  const dir = patternDir(intent.tier, id);
  const metaPath = patternMeta(intent.tier, id);
  const now = new Date().toISOString();
  ensureDir(dir);
  let meta = readJson(metaPath, {
    id,
    title: intent.title || id,
    tier: intent.tier,
    authorship: 'autonomous',
    status: 'probation',
    requests: 0,
    calls: 0,
    adherence_rate: null,
    created_at: now,
    must_keep: false,
  });
  if (intent.action === 'delete') {
    const target = path.join(ARCHIVE, intent.tier, `${id}-${Date.now()}`);
    ensureDir(path.dirname(target));
    fs.renameSync(dir, target);
    appendJsonLine(path.join(target, '.ledger.jsonl'), { ts: now, action: 'archive', reason: intent.reason, evidence_sha256: sha(JSON.stringify(intent.evidence)) });
    return { accepted: true, action: 'archive', pattern_id: id, path: target };
  }
  if (intent.action === 'drop-support-file') {
    const source = path.join(dir, intent.support_file);
    if (!fs.existsSync(source)) return { accepted: false, reason: 'support file does not exist' };
    const target = path.join(dir, '.archive', `${path.basename(source)}-${Date.now()}`);
    ensureDir(path.dirname(target));
    fs.renameSync(source, target);
  } else {
    const contentPath = path.join(dir, 'pattern.md');
    const prior = fs.existsSync(contentPath) ? fs.readFileSync(contentPath, 'utf8') : '';
    const next = intent.action === 'merge' ? `${prior.trim()}\n\n${String(intent.content).trim()}\n` : `${String(intent.content).trim()}\n`;
    fs.writeFileSync(contentPath, next, 'utf8');
  }
  meta.updated_at = now;
  meta.last_action = intent.action;
  writeJson(metaPath, meta);
  appendJsonLine(path.join(dir, '.ledger.jsonl'), {
    ts: now,
    action: intent.action,
    reason: intent.reason,
    evidence_sha256: sha(JSON.stringify(intent.evidence)),
    evidence_reference: intent.evidence,
  });
  enforceCapacity(options);
  return { accepted: true, action: intent.action, pattern_id: id, path: dir };
}

function recordOpportunity(tier, id, followed, options = {}) {
  const metaPath = patternMeta(tier, id);
  const meta = readJson(metaPath, null);
  if (!meta) throw new Error(`Unknown pattern: ${tier}/${id}`);
  meta.requests = Number(meta.requests || 0) + 1;
  if (followed) meta.calls = Number(meta.calls || 0) + 1;
  meta.adherence_rate = meta.calls / meta.requests;
  const maturityGate = tier === 'global' ? Number(options.globalMaturity || 10) : Number(options.projectMaturity || 5);
  if (meta.status === 'probation' && meta.requests >= maturityGate) meta.status = 'mature';
  meta.updated_at = new Date().toISOString();
  writeJson(metaPath, meta);
  enforceCapacity(options);
  return meta;
}

function enforceCapacity(options = {}) {
  for (const tier of ['project', 'global']) {
    const cap = tier === 'global' ? Number(options.globalCap || 20) : Number(options.projectCap || 50);
    const mature = listPatterns().filter((item) => item.tier === tier && item.status === 'mature' && !item.must_keep)
      .sort((a, b) => Number(a.adherence_rate || 0) - Number(b.adherence_rate || 0));
    while (mature.length > cap) {
      const item = mature.shift();
      const source = patternDir(tier, item.id);
      const target = path.join(ARCHIVE, tier, `${item.id}-${Date.now()}`);
      ensureDir(path.dirname(target));
      fs.renameSync(source, target);
      appendJsonLine(path.join(target, '.ledger.jsonl'), { ts: new Date().toISOString(), action: 'capacity_archive', adherence_rate: item.adherence_rate });
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const lifecycleOptions = {
    projectCap: args['project-cap'],
    globalCap: args['global-cap'],
    projectMaturity: args['project-maturity'],
    globalMaturity: args['global-maturity'],
  };
  let output;
  if (command === 'observe') output = observeTurn(readJson(path.resolve(args['turn-file']), {}), { cadence: args.cadence });
  else if (command === 'promote') output = promoteIntent(readJson(path.resolve(args['intent-file']), {}), lifecycleOptions);
  else if (command === 'opportunity') output = recordOpportunity(args.tier, args.pattern, String(args.followed) === 'true', lifecycleOptions);
  else if (command === 'list') output = { patterns: listPatterns() };
  else throw new Error('Expected observe, promote, opportunity, or list');
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

module.exports = { enforceCapacity, listPatterns, observeTurn, promoteIntent, recordOpportunity, validateIntent };
if (require.main === module) main();
