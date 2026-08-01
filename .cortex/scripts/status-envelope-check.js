'use strict';

/**
 * status-envelope-check.js — validates a pod's status envelope at SubagentStop
 * (Tier 1, <200ms, no LLM). Never blocks on a malformed or missing envelope —
 * logs a quality warning to hook-errors.log and continues, since a broken
 * status report must not be allowed to break the whole pipeline.
 *
 * Usage: node status-envelope-check.js --envelope '<json>'
 *        node status-envelope-check.js --output-file <subagent-output.md>
 * Envelope schema: { pod, status, timestamp, duration_seconds, findings_count,
 *   errors: [], skipped_checks: [], findings: [] }
 * status must be one of: COMPLETE, PARTIAL, ERROR, SKIPPED
 */

const path = require('path');
const fs = require('fs');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const POD_STATUS_PATH = path.join(COCOPLUS_DIR, 'pod-status.json');
const HOOK_ERRORS_PATH = path.join(COCOPLUS_DIR, 'hook-errors.log');

const VALID_STATUSES = new Set(['COMPLETE', 'PARTIAL', 'ERROR', 'SKIPPED']);
const REQUIRED_FIELDS = ['pod', 'status', 'timestamp', 'duration_seconds', 'findings_count'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--envelope') args.envelope = argv[++i];
    else if (argv[i] === '--output-file') args.outputFile = argv[++i];
    else if (argv[i] === '--output') args.output = argv[++i];
  }
  return args;
}

function parseScalar(value) {
  const trimmed = String(value || '').trim();
  if (trimmed === '[]') return [];
  if (/^\[.*\]$/.test(trimmed)) {
    return trimmed.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^["']|["']$/g, '');
}

function parseEnvelopeBlock(text) {
  const match = String(text || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const envelope = {};
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (item) envelope[item[1]] = parseScalar(item[2]);
  }
  return envelope;
}

function envelopeFromArgs(args) {
  if (args.envelope) return JSON.parse(args.envelope);
  if (args.outputFile) return parseEnvelopeBlock(fs.readFileSync(args.outputFile, 'utf8'));
  if (args.output) return parseEnvelopeBlock(args.output);
  return null;
}

function logWarning(message) {
  try {
    fs.mkdirSync(path.dirname(HOOK_ERRORS_PATH), { recursive: true });
    fs.appendFileSync(HOOK_ERRORS_PATH, JSON.stringify({ ts: new Date().toISOString(), source: 'status-envelope-check', message }) + '\n');
  } catch (_) { /* logging failure is non-fatal */ }
}

function validateEnvelope(envelope) {
  const warnings = [];

  for (const field of REQUIRED_FIELDS) {
    if (envelope[field] === undefined || envelope[field] === null) {
      warnings.push(`envelope-missing-field: ${field}`);
    }
  }

  if (envelope.status && !VALID_STATUSES.has(envelope.status)) {
    warnings.push(`envelope-invalid-status: ${envelope.status}`);
  }

  if (envelope.status === 'PARTIAL' && (!Array.isArray(envelope.skipped_checks) || envelope.skipped_checks.length === 0)) {
    warnings.push('PARTIAL-without-skipped-checks');
  }

  const declaredCount = envelope.findings_count;
  const actualCount = Array.isArray(envelope.findings) ? envelope.findings.length : undefined;
  if (declaredCount !== undefined && actualCount !== undefined && declaredCount !== actualCount) {
    warnings.push(`count-discrepancy: declared ${declaredCount}, actual ${actualCount}`);
  }

  return warnings;
}

function appendPodStatus(envelope) {
  let records = [];
  try {
    records = JSON.parse(fs.readFileSync(POD_STATUS_PATH, 'utf8'));
    if (!Array.isArray(records)) records = [];
  } catch (_) { /* file doesn't exist yet */ }

  records.push(envelope);

  fs.mkdirSync(path.dirname(POD_STATUS_PATH), { recursive: true });
  const tmp = POD_STATUS_PATH + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2), 'utf8');
  fs.renameSync(tmp, POD_STATUS_PATH);
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const args = parseArgs(process.argv.slice(2));
  if (!args.envelope && !args.outputFile && !args.output) {
    logWarning('envelope-missing: no --envelope argument provided');
    return;
  }

  let envelope;
  try {
    envelope = envelopeFromArgs(args);
    if (!envelope) {
      logWarning('envelope-missing: output did not start with a status envelope');
      return;
    }
  } catch (err) {
    logWarning(`envelope-malformed: ${err.message}`);
    return;
  }

  const warnings = validateEnvelope(envelope);
  for (const w of warnings) logWarning(w);

  // Does not block on missing/malformed envelope — always appends what it has.
  appendPodStatus(envelope);
}

main();
