#!/usr/bin/env node
/**
 * CocoPlus PreCompact hook — cross-platform (Node.js)
 * Fires before Coco compacts the conversation context.
 * Responsibilities: flush in-memory decision buffer to warm memory layer.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, logError } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts = isoUtc();

  appendJsonLine(HOOK_LOG, { hook: 'pre-compact', ts });

  // Flush decision buffer to decisions.md before context is compacted
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'memory.on'))) {
    const bufferFile    = path.join(COCOPLUS_DIR, '.decision-buffer');
    const decisionsFile = path.join(COCOPLUS_DIR, 'memory', 'decisions.md');

    if (fs.existsSync(bufferFile)) {
      const buf = fs.readFileSync(bufferFile, 'utf8').trim();
      if (buf) {
        fs.appendFileSync(decisionsFile, `\n## Session ${ts}\n${buf}\n`);
        try { fs.unlinkSync(bufferFile); } catch (_) { /* ignore */ }
        appendJsonLine(HOOK_LOG, { hook: 'pre-compact', action: 'decisions_flushed', ts });
      }
    }
  }
}

try {
  main();
} catch (err) {
  logError('pre-compact', err.message);
}
