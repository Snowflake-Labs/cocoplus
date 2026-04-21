#!/usr/bin/env node
/**
 * CocoPlus Notification hook — cross-platform (Node.js)
 * Fires when Coco emits a notification event.
 * Responsibilities: log all notifications, deduplicate within 60s,
 * route high-priority events to ui-notifications.jsonl.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isoUtc, appendJsonLine, logError } = require('./_common.js');

const COCOPLUS_DIR = '.cocoplus';
const HOOK_LOG     = path.join(COCOPLUS_DIR, 'hook-log.jsonl');

/** Notification types that should surface in UI */
const UI_EVENTS = new Set([
  'phase_transition',
  'agent_completion',
  'safety_gate_trigger',
  'cupper_findings_ready',
  'meter_budget_threshold',
  'flow_stage_completion',
]);

/** Simple hash for deduplication key */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) return;

  const ts           = isoUtc();
  const notifType    = process.env.COCO_NOTIFICATION_TYPE    || 'unknown';
  const notifPayload = process.env.COCO_NOTIFICATION_PAYLOAD || '';
  const nowEpoch     = Math.floor(Date.now() / 1000);
  const dedupeFile   = path.join(COCOPLUS_DIR, '.notification-dedupe');

  appendJsonLine(HOOK_LOG, { hook: 'notification', type: notifType, ts });

  // Deduplicate: skip if same type+payload was seen within 60 seconds
  const notifKey = simpleHash(`${notifType}|${notifPayload}`);
  let lastEpoch  = 0;

  if (fs.existsSync(dedupeFile)) {
    const lines = fs.readFileSync(dedupeFile, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      const parts = line.split(' ');
      if (parts[0] === notifKey) lastEpoch = parseInt(parts[1], 10) || 0;
    }
  }

  if (nowEpoch - lastEpoch < 60) {
    appendJsonLine(HOOK_LOG, { hook: 'notification', type: notifType, ts, deduped: true });
    return;
  }

  // Log to notifications.log (human-readable)
  try {
    fs.appendFileSync(path.join(COCOPLUS_DIR, 'notifications.log'), `[${ts}] ${notifType}: ${notifPayload}\n`);
  } catch (_) { /* non-fatal */ }

  // Update dedupe file
  try {
    const existing = fs.existsSync(dedupeFile) ? fs.readFileSync(dedupeFile, 'utf8').split('\n').filter(l => l && !l.startsWith(notifKey)) : [];
    fs.writeFileSync(dedupeFile, [...existing, `${notifKey} ${nowEpoch}`].join('\n') + '\n');
  } catch (_) { /* non-fatal */ }

  // Route high-priority events to UI notifications feed
  if (UI_EVENTS.has(notifType)) {
    appendJsonLine(path.join(COCOPLUS_DIR, 'ui-notifications.jsonl'), {
      notify:  notifType,
      payload: notifPayload,
      ts,
    });
  }
}

try {
  main();
} catch (err) {
  logError('notification', err.message);
}
