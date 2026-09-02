#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { appendLine, ensureDir } = require('./_script-utils.js');

const command = process.argv[2] || 'timeline';
const auditPath = path.join('.cocoplus', 'lifecycle', 'audit.md');
ensureDir(path.dirname(auditPath));

if (command === 'add') {
  const text = process.argv.slice(3).join(' ');
  appendLine(auditPath, `- ${new Date().toISOString()} Manual Entry: ${text}`);
  console.log(JSON.stringify({ event: 'manual', text }));
} else if (command === 'timeline') {
  console.log(fs.existsSync(auditPath) ? fs.readFileSync(auditPath, 'utf8') : '');
} else {
  console.error(`Unknown audit-events command: ${command}`);
  process.exit(1);
}
