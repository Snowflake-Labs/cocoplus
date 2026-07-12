#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const AUDIT_PATH = path.join(COCOPLUS_DIR, 'lifecycle', 'audit.md');

function ensureAudit() {
  if (!fs.existsSync(COCOPLUS_DIR)) throw new Error('CocoPlus not initialized. Run $pod init first.');
  if (!fs.existsSync(path.join(COCOPLUS_DIR, 'modes', 'cocoaudit.on'))) throw new Error('CocoAudit is not enabled.');
  fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
  if (!fs.existsSync(AUDIT_PATH)) fs.writeFileSync(AUDIT_PATH, '# CocoAudit\n\n', 'utf8');
}

function addManual(message) {
  if (!message || !message.trim()) throw new Error('Manual audit message is required.');
  ensureAudit();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const block = [
    `## [Manual Entry] ${timestamp}`,
    `**Timestamp**: ${timestamp}`,
    '**Event**: manual',
    '**Source**: $audit add',
    '',
    message.trim(),
    '',
  ].join('\n');
  fs.appendFileSync(AUDIT_PATH, block, 'utf8');
  console.log(JSON.stringify({ event: 'manual', timestamp, audit_path: AUDIT_PATH }, null, 2));
}

function parseEvents() {
  ensureAudit();
  const content = fs.readFileSync(AUDIT_PATH, 'utf8');
  const sections = content.split(/^## \[/m).slice(1);
  return sections.map((section) => {
    const heading = section.split(/\r?\n/)[0].replace(/\]\s*/, '').trim();
    const timestamp = (section.match(/\*\*Timestamp\*\*:\s*([^\n]+)/) || [])[1] || '';
    const event = (section.match(/\*\*Event\*\*:\s*([^\n]+)/) || [])[1] || heading;
    const body = section.split(/\r?\n\r?\n/).slice(1).join('\n').trim();
    const firstBodyLine = body.split(/\r?\n/).find(Boolean) || '';
    return { timestamp: timestamp.trim(), event: event.trim(), summary: firstBodyLine.trim() };
  }).filter(e => e.timestamp);
}

function timeline() {
  const events = parseEvents();
  for (const event of events) {
    const time = event.timestamp.includes('T') ? event.timestamp.slice(11, 16) : event.timestamp;
    console.log(`${time}  ${event.summary || event.event}`);
  }
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  try {
    if (command === 'add') return addManual(rest.join(' '));
    if (command === 'timeline') return timeline();
    console.error('Usage: audit-events.js add "<message>" | timeline');
    process.exit(1);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
