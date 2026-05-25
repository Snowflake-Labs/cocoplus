#!/usr/bin/env node
'use strict';

/**
 * wisdom-writer.js — synchronous CocoWisdom rejection record writer.
 *
 * Accepts a JSON record on stdin or via --record flag.
 * Appends to .cocoplus/wisdom/rejections.jsonl (append-only invariant).
 * Updates .cocoplus/wisdom/wisdom-index.db SQLite FTS if available.
 * Must complete in <20ms. No LLM invocation.
 *
 * Usage:
 *   echo '{"gate":"sentinel","dimension":"B",...}' | node wisdom-writer.js
 *   node wisdom-writer.js --record '{"gate":"sentinel",...}'
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COCOPLUS_DIR = '.cocoplus';
const WISDOM_DIR = path.join(COCOPLUS_DIR, 'wisdom');
const REJECTIONS_FILE = path.join(WISDOM_DIR, 'rejections.jsonl');
const PENDING_LOCK = path.join(WISDOM_DIR, 'pending-write.lock');

function exitClean(code, msg) {
  if (msg) process.stderr.write(msg + '\n');
  process.exit(code);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function nextRecordId() {
  if (!fs.existsSync(REJECTIONS_FILE)) return 'rej-0001';
  const lines = fs.readFileSync(REJECTIONS_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const count = lines.length + 1;
  return `rej-${String(count).padStart(4, '0')}`;
}

function writeRecord(inputData) {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    exitClean(0, 'wisdom-writer: .cocoplus/ not found, skipping');
  }

  ensureDir(WISDOM_DIR);

  try {
    // Create lock inside try so finally always runs cleanup
    fs.writeFileSync(PENDING_LOCK, '');
    const record = {
      record_id: nextRecordId(),
      timestamp: new Date().toISOString(),
      session_id: process.env.COCO_SESSION_ID || 'unknown',
      gate: inputData.gate || 'unknown',
      phase: inputData.phase || null,
      dimension: inputData.dimension || null,
      severity: inputData.severity || 'BLOCKING',
      rejection_reason: inputData.rejection_reason || inputData.evidence || '',
      artifact_reference: inputData.artifact_reference || inputData.artifact_path || null,
      da_rebuttal_score: inputData.da_rebuttal_score || null
    };

    // Append-only: never modify existing records
    fs.appendFileSync(REJECTIONS_FILE, JSON.stringify(record) + '\n');

    // Output the written record for callers that need the record_id
    process.stdout.write(JSON.stringify({ success: true, record_id: record.record_id }) + '\n');
  } finally {
    // Always delete lock after write attempt (success or failure)
    if (fs.existsSync(PENDING_LOCK)) {
      fs.unlinkSync(PENDING_LOCK);
    }
  }
}

// Parse input
let inputData = {};
const recordArg = process.argv.indexOf('--record');
if (recordArg !== -1 && process.argv[recordArg + 1]) {
  try {
    inputData = JSON.parse(process.argv[recordArg + 1]);
    writeRecord(inputData);
  } catch (e) {
    exitClean(1, 'wisdom-writer: invalid JSON in --record argument: ' + e.message);
  }
} else {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => {
    if (!raw.trim()) {
      exitClean(0, 'wisdom-writer: no input provided, skipping');
    }
    try {
      inputData = JSON.parse(raw);
      writeRecord(inputData);
    } catch (e) {
      exitClean(1, 'wisdom-writer: invalid JSON input: ' + e.message);
    }
  });
}
