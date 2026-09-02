#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ensureDir, htmlEscape, parseArgs } = require('./_script-utils.js');

const args = parseArgs(process.argv.slice(2));
const source = args.source;
const format = args.format || 'markdown';
const outDir = args['out-dir'] || path.join('.cocoplus', 'exports');
if (!source) {
  console.error('Missing --source');
  process.exit(1);
}

ensureDir(outDir);
const base = path.basename(source).replace(/\.[^.]+$/, '');
const content = fs.readFileSync(source, 'utf8');

if (format === 'markdown') {
  const output = path.join(outDir, `${base}.md`);
  fs.copyFileSync(source, output);
  console.log(JSON.stringify({ format, output_path: output }));
} else if (format === 'html') {
  const output = path.join(outDir, `${base}.html`);
  fs.writeFileSync(output, `<!doctype html><html><body><main><pre>${htmlEscape(content)}</pre></main></body></html>\n`, 'utf8');
  console.log(JSON.stringify({ format, output_path: output }));
} else if (format === 'pdf') {
  console.log(JSON.stringify({ format, status: 'renderer_unavailable', message: 'PDF renderer is not available in this runtime.' }));
} else {
  console.error(`Unsupported format: ${format}`);
  process.exit(1);
}
