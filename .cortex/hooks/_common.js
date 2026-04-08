/**
 * CocoPlus hook shared utilities — cross-platform (Windows/Mac/Linux)
 * Required by all hook scripts. Sourced via require('./_common.js')
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/** ISO 8601 UTC timestamp */
function isoUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Escape a string for safe embedding in a JSON string value */
function jsonEscape(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g,  '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * Append a JSON-lines record to a file. Creates parent dirs as needed.
 * Never throws — all errors are silently swallowed to keep hooks non-fatal.
 */
function appendJsonLine(filePath, record) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n');
  } catch (_) { /* non-fatal */ }
}

/**
 * Write content to a file atomically (write to .tmp then rename).
 * Creates parent dirs as needed.
 */
function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp.' + process.pid;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (_) {
    try { fs.unlinkSync(tmp); } catch (_2) { /* ignore */ }
  }
}

/** Log an error to the CocoPlus hook error log */
function logError(hookName, message) {
  appendJsonLine('.cocoplus/hook-errors.log', {
    ts:    isoUtc(),
    hook:  hookName,
    error: message,
  });
}

/**
 * Read a string field from a flat JSON file without a full JSON parse.
 * Safe to call even if the file doesn't exist.
 */
function readJsonString(filePath, key) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return String(data[key] || '');
  } catch (_) {
    return '';
  }
}

/** Read a numeric field from a flat JSON file */
function readJsonNumber(filePath, key) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return Number(data[key]) || 0;
  } catch (_) {
    return 0;
  }
}

/** Read all of stdin as a string (synchronous) */
function readStdin() {
  try {
    return fs.readFileSync('/dev/stdin', 'utf8');
  } catch (_) {
    try {
      // Windows fallback
      return fs.readFileSync('\\\\.\\CON', 'utf8');
    } catch (_2) {
      return '';
    }
  }
}

module.exports = {
  isoUtc,
  jsonEscape,
  appendJsonLine,
  atomicWrite,
  logError,
  readJsonString,
  readJsonNumber,
  readStdin,
};
