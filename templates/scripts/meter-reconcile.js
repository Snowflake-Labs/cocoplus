#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SEEN_LIMIT = 4096;

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function atomicWriteJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function usageFromRecord(record) {
  const message = record.message || {};
  const usage = record.usage || message.usage || record.message_usage || {};
  return {
    input_tokens: Number(usage.input_tokens || usage.prompt_tokens || 0),
    output_tokens: Number(usage.output_tokens || usage.completion_tokens || 0),
    cache_creation_tokens: Number(usage.cache_creation_input_tokens || usage.cache_creation_tokens || 0),
    cache_read_tokens: Number(usage.cache_read_input_tokens || usage.cache_read_tokens || 0),
  };
}

function tokenTotal(usage) {
  return usage.input_tokens + usage.output_tokens + usage.cache_creation_tokens + usage.cache_read_tokens;
}

function messageId(record) {
  return record.message && record.message.id || record.message_id || record.id || null;
}

function usageFingerprint(usage) {
  return [
    usage.input_tokens,
    usage.output_tokens,
    usage.cache_creation_tokens,
    usage.cache_read_tokens,
  ].join('|');
}

function rememberBounded(set, queue, key) {
  set.add(key);
  queue.push(key);
  while (queue.length > SEEN_LIMIT) {
    const removed = queue.shift();
    set.delete(removed);
  }
}

function transcriptModel(record) {
  const message = record.message || {};
  return message.model || record.model || null;
}

function reconcileTranscript(transcriptText) {
  const seenIds = new Set();
  const seenIdQueue = [];
  const seenFingerprints = new Set();
  const seenFingerprintQueue = [];
  let transcriptDerivedTokens = 0;
  let duplicatesFound = 0;
  let assistantMessages = 0;
  let lastAssistantModel = null;

  for (const line of String(transcriptText || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch (_) {
      continue;
    }

    const type = record.type || record.role || record.message && record.message.role || '';
    if (type !== 'assistant') continue;

    const usage = usageFromRecord(record);
    const total = tokenTotal(usage);
    if (total <= 0) continue;

    assistantMessages++;
    const model = transcriptModel(record);
    if (model) lastAssistantModel = model;

    const id = messageId(record);
    const key = id ? `id:${id}` : `fp:${usageFingerprint(usage)}`;
    const seenSet = id ? seenIds : seenFingerprints;
    const seenQueue = id ? seenIdQueue : seenFingerprintQueue;
    if (seenSet.has(key)) {
      duplicatesFound++;
      continue;
    }
    rememberBounded(seenSet, seenQueue, key);
    transcriptDerivedTokens += total;
  }

  return {
    assistant_messages_seen: assistantMessages,
    transcript_derived_tokens: transcriptDerivedTokens,
    duplicates_found: duplicatesFound,
    last_assistant_model: lastAssistantModel,
  };
}

function tierFromModel(modelName, modelMap = {}) {
  if (!modelName) return null;
  const normalized = String(modelName).toLowerCase();
  for (const [tier, values] of Object.entries(modelMap || {})) {
    const aliases = Array.isArray(values) ? values : [values];
    if (aliases.some((value) => normalized.includes(String(value).toLowerCase()))) return tier;
  }
  if (/opus|ultra|fable-5/.test(normalized)) return 'ultra';
  if (/sonnet|smart/.test(normalized)) return 'smart';
  if (/haiku|smol|small/.test(normalized)) return 'smol';
  return modelName;
}

function runReconciliation(options, deps = {}) {
  const readFile = deps.readFile || ((filePath) => fs.readFileSync(filePath, 'utf8'));
  const readSession = deps.readSession || ((filePath) => readJson(filePath, {}));
  const writeResult = deps.writeResult || atomicWriteJson;
  const transcript = readFile(options.transcriptPath);
  const session = readSession(options.sessionFile);
  const parsed = reconcileTranscript(transcript);
  const agentReportedTokens = Number(session.tokens_consumed || session.total_tokens || 0);
  const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 0.05;
  const gapFraction = agentReportedTokens > 0
    ? Math.abs(agentReportedTokens - parsed.transcript_derived_tokens) / agentReportedTokens
    : parsed.transcript_derived_tokens > 0 ? 1 : 0;
  const status = gapFraction > threshold ? 'gap_corrected' : 'match';
  const configuredTier = session.model_tier_configured || session.model_tier_used || null;
  const actualTier = tierFromModel(parsed.last_assistant_model, options.modelMap || {});
  const result = {
    session_id: options.sessionId || session.session_id || null,
    agent_reported_tokens: agentReportedTokens,
    transcript_derived_tokens: parsed.transcript_derived_tokens,
    authoritative_tokens: status === 'gap_corrected' ? parsed.transcript_derived_tokens : agentReportedTokens,
    gap_fraction: gapFraction,
    duplicates_found: parsed.duplicates_found,
    reconciliation_status: status,
    model_tier_configured: configuredTier,
    model_tier_actual: actualTier,
    model_drift: Boolean(configuredTier && actualTier && configuredTier !== actualTier),
    last_assistant_model: parsed.last_assistant_model,
    generated_at: new Date().toISOString(),
  };
  if (options.outFile) writeResult(options.outFile, result);
  return result;
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--transcript') options.transcriptPath = argv[++i];
    else if (arg === '--session-file') options.sessionFile = argv[++i];
    else if (arg === '--out') options.outFile = argv[++i];
    else if (arg === '--threshold') options.threshold = Number(argv[++i]);
    else if (arg === '--session-id') options.sessionId = argv[++i];
  }
  return options;
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.transcriptPath || !options.sessionFile) {
    process.stderr.write('Usage: node meter-reconcile.js --transcript <jsonl> --session-file <json> [--out <json>] [--threshold 0.05]\n');
    process.exit(2);
  }
  const result = runReconciliation(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = {
  reconcileTranscript,
  runReconciliation,
  tierFromModel,
};
