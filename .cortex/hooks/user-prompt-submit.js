#!/usr/bin/env node
/**
 * CocoPlus UserPromptSubmit hook — cross-platform (Node.js)
 * Fires when the user submits a prompt.
 * Responsibilities: Context Mode — inject lifecycle phase awareness into prompt context.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, logError, readJsonString } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts = isoUtc();

  appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', ts });

  // Context Mode — log that phase context was prepended
  if (fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'context-mode.on'))) {
    let phase = 'unknown';
    const metaPath = path.join(COCOPLUS_DIR, 'lifecycle', 'meta.json');
    if (fs.existsSync(metaPath)) {
      phase = readJsonString(metaPath, 'current_phase') || 'unknown';
    }
    appendJsonLine(HOOK_LOG, { hook: 'user-prompt-submit', action: 'context_prepended', phase, ts });
  }
}

try {
  main();
} catch (err) {
  logError('user-prompt-submit', err.message);
}
