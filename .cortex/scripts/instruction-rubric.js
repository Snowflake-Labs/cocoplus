#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { appendLine, ensureDir, parseArgs, readJson, writeJson } = require('./_script-utils.js');

const ROOT = '.cocoplus';
const LIFECYCLE = path.join(ROOT, 'lifecycle');
const SOURCE = path.join(LIFECYCLE, 'cocopod-instructions.md');
const RUBRIC = path.join(LIFECYCLE, 'rubric.json');
const RESULTS = path.join(LIFECYCLE, 'rubric-results.jsonl');
const NOTES = path.join(LIFECYCLE, 'rubric-notes.jsonl');
const AUDIT = path.join(LIFECYCLE, 'audit.md');
const PENDING_REPAIR = path.join(ROOT, 'session', 'pending-rubric-repair.json');

function sha(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function appendJsonLine(filePath, value) {
  appendLine(filePath, JSON.stringify(value));
}

function auditMiss(rule, reason, ts = new Date().toISOString()) {
  appendLine(AUDIT, `- ${ts} rubric_check_missed rule=${rule || 'unresolved'} reason=${String(reason).replace(/\s+/g, ' ').slice(0, 240)}`);
}

function parseRule(raw, lineNumber) {
  let text = raw.trim();
  if (!text || /^#/.test(text)) return null;
  text = text.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
  if (!text || text.length < 8) return null;
  const directive = text.match(/^\[(operation|stage)(?:\s*;\s*scope=([^\]]+))?\]\s*/i);
  const phase = directive ? directive[1].toLowerCase() : 'operation';
  const scopes = directive && directive[2]
    ? directive[2].split(',').map((item) => item.trim()).filter(Boolean)
    : ['*'];
  if (directive) text = text.slice(directive[0].length).trim();
  return {
    id: `rule-${sha(`${lineNumber}:${text}`).slice(0, 12)}`,
    rule: text,
    phase,
    scope: scopes,
    source: { file: 'lifecycle/cocopod-instructions.md', line: lineNumber },
    calibration: { status: 'uncalibrated', samples: 0, max_probability: null },
  };
}

function compileRubric(force = false) {
  if (!fs.existsSync(SOURCE)) throw new Error('Missing .cocoplus/lifecycle/cocopod-instructions.md');
  const sourceText = fs.readFileSync(SOURCE, 'utf8');
  const sourceSha256 = sha(sourceText);
  const existing = readJson(RUBRIC, {});
  if (!force && existing.source_sha256 === sourceSha256 && Array.isArray(existing.rules)) return existing;
  const rules = sourceText.split(/\r?\n/)
    .map((line, index) => parseRule(line, index + 1))
    .filter(Boolean);
  const rubric = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    source_file: 'lifecycle/cocopod-instructions.md',
    source_sha256: sourceSha256,
    rules,
  };
  writeJson(RUBRIC, rubric);
  return rubric;
}

function globMatches(glob, value) {
  if (!glob || glob === '*') return true;
  const escaped = String(glob).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  try { return new RegExp(`^${escaped}$`, 'i').test(String(value || '')); } catch (_) { return false; }
}

function applicableRules(rubric, action) {
  const phase = action.phase || 'operation';
  const candidates = [action.operation, action.file, action.file_type].filter(Boolean);
  return (rubric.rules || []).filter((rule) => rule.phase === phase &&
    (rule.scope || ['*']).some((scope) => scope === '*' || candidates.some((value) => globMatches(scope, value))));
}

function normalizeScores(scores) {
  if (!Array.isArray(scores)) return new Map();
  return new Map(scores.map((item) => [String(item.rule_id || item.id || ''), item]));
}

function evaluateAction(action, scores) {
  const ts = action.ts || new Date().toISOString();
  let rubric;
  try {
    rubric = compileRubric(false);
  } catch (err) {
    auditMiss('rubric', err.message, ts);
    return { status: 'missed', fail_open: true, reason: err.message, results: [] };
  }
  const scoreMap = normalizeScores(scores);
  const rules = applicableRules(rubric, action);
  const results = [];
  for (const rule of rules) {
    const score = scoreMap.get(rule.id);
    if (!score || !Number.isFinite(Number(score.probability))) {
      auditMiss(rule.id, 'semantic evaluator returned no probability', ts);
      results.push({ rule_id: rule.id, outcome: 'missed', fail_open: true });
      continue;
    }
    const probability = Math.max(0, Math.min(1, Number(score.probability)));
    const violation = score.violation !== false;
    const outcome = !violation || probability < 0.5 ? 'silent' : probability >= 0.8 ? 'repair' : 'note';
    const result = {
      ts,
      rule_id: rule.id,
      rule: rule.rule,
      source: rule.source,
      phase: rule.phase,
      probability,
      violation,
      outcome,
      reason: String(score.reason || '').slice(0, 500),
      operation: action.operation || 'unknown',
      file: action.file || null,
    };
    appendJsonLine(RESULTS, result);
    if (outcome === 'note') appendJsonLine(NOTES, result);
    if (outcome === 'repair') {
      const repair = {
        ...result,
        repair_id: `repair-${sha(`${rule.id}:${ts}:${action.operation || ''}`).slice(0, 12)}`,
        status: 'pending',
        directive: `Repair the violation of "${rule.rule}" (${rule.source.file}:${rule.source.line}) before continuing. ${result.reason}`.trim(),
      };
      writeJson(PENDING_REPAIR, repair);
      result.repair_id = repair.repair_id;
    }
    results.push(result);
  }
  return { status: 'evaluated', fail_open: false, results };
}

function completeRepair(repairId) {
  const pending = readJson(PENDING_REPAIR, null);
  if (!pending || pending.repair_id !== repairId) return false;
  pending.status = 'completed';
  pending.completed_at = new Date().toISOString();
  appendJsonLine(RESULTS, pending);
  fs.unlinkSync(PENDING_REPAIR);
  return true;
}

function calibrateRubric() {
  const rubric = compileRubric(false);
  const records = fs.existsSync(RESULTS)
    ? fs.readFileSync(RESULTS, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { try { return JSON.parse(line); } catch (_) { return null; } }).filter(Boolean)
    : [];
  for (const rule of rubric.rules) {
    const samples = records.filter((record) => record.rule_id === rule.id && Number.isFinite(Number(record.probability)));
    const maximum = samples.length ? Math.max(...samples.map((record) => Number(record.probability))) : null;
    rule.calibration = {
      status: samples.length > 0 && maximum <= 0.4 ? 'never_fires' : samples.length ? 'active' : 'insufficient_evidence',
      samples: samples.length,
      max_probability: maximum,
      calibrated_at: new Date().toISOString(),
    };
  }
  writeJson(RUBRIC, rubric);
  return rubric;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'compile';
  let output;
  if (command === 'compile') output = compileRubric(Boolean(args.force));
  else if (command === 'evaluate') {
    const action = args['action-file'] ? readJson(path.resolve(args['action-file']), {}) : readJson(0, {});
    const scores = args['scores-file'] ? readJson(path.resolve(args['scores-file']), []) : action.scores;
    output = evaluateAction(action, scores);
  } else if (command === 'calibrate') output = calibrateRubric();
  else if (command === 'complete-repair') output = { completed: completeRepair(String(args.id || '')) };
  else throw new Error(`Unknown instruction-rubric command: ${command}`);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

module.exports = { applicableRules, calibrateRubric, compileRubric, completeRepair, evaluateAction };

if (require.main === module) {
  try { main(); } catch (err) { auditMiss('runtime', err.message); process.stdout.write(`${JSON.stringify({ status: 'missed', fail_open: true, reason: err.message })}\n`); }
}
