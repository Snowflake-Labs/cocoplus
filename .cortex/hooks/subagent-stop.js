#!/usr/bin/env node
/**
 * CocoPlus SubagentStop hook — cross-platform (Node.js)
 * Fires when a subagent (persona) finishes.
 * Responsibilities: stage completion detection, schedule CocoCupper.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, logError } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts          = isoUtc();
  const subagentId  = process.env.COCO_SUBAGENT_ID   || 'unknown';
  const subagentName = process.env.COCO_SUBAGENT_NAME || 'unknown';

  appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', subagent_id: subagentId, subagent_name: subagentName, ts });

  // Detect stage completion if subagent name follows stage-NNN convention
  const stageMatch = subagentName.match(/stage-(\d+)/);
  if (stageMatch) {
    const stageId = `stage-${stageMatch[1]}`;
    appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', stage: stageId, completed_at: ts });
  }

  // Signal CocoCupper is scheduled
  appendJsonLine(HOOK_LOG, { hook: 'subagent-stop', cupper: 'scheduled', subagent: subagentId, ts });
}

try {
  main();
} catch (err) {
  logError('subagent-stop', err.message);
}
