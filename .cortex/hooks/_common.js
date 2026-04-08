/**
 * CocoPlus hook shared utilities — cross-platform (Node.js)
 * Required by all hook scripts via require('./_common.js')
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

/** Read a string field from a JSON file. Safe to call even if missing. */
function readJsonString(filePath, key) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return String(data[key] || '');
  } catch (_) {
    return '';
  }
}

/** Read a numeric field from a JSON file */
function readJsonNumber(filePath, key) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Number(data[key]) || 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Read all of stdin synchronously as a string.
 * Returns empty string if stdin has no data (e.g. no pipe).
 */
function readStdin() {
  try {
    // Only read if stdin is a pipe (not a TTY)
    if (!process.stdin.isTTY) {
      return fs.readFileSync(process.stdin.fd, 'utf8');
    }
  } catch (_) { /* ignore */ }
  return '';
}

/**
 * Parse stdin as JSON. Returns empty object on parse failure or no input.
 */
function readStdinJson() {
  const raw = readStdin().trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
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
  readStdinJson,
};
