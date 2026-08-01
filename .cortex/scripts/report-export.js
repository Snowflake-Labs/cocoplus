#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { format: 'markdown', outDir: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--format') args.format = argv[++i];
    else if (argv[i] === '--out-dir') args.outDir = argv[++i];
  }
  return args;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownToHtml(markdown) {
  const body = markdown.split(/\r?\n/).map((line) => {
    if (/^# /.test(line)) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
    if (/^## /.test(line)) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
    if (/^- /.test(line)) return `<li>${escapeHtml(line.slice(2))}</li>`;
    if (!line.trim()) return '';
    return `<p>${escapeHtml(line)}</p>`;
  }).join('\n');
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>CocoPlus Report Export</title>',
    '<style>body{font-family:system-ui,sans-serif;max-width:960px;margin:40px auto;line-height:1.55;color:#172033}main{padding:0 24px}code,pre{background:#f5f7fb}</style>',
    '</head>',
    '<body><main>',
    body,
    '</main></body></html>',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.source) {
    console.error('Usage: report-export.js --source <path> --format markdown|html|pdf [--out-dir <dir>]');
    process.exit(1);
  }
  const source = path.resolve(args.source);
  if (!fs.existsSync(source)) {
    console.error(`Source report not found: ${source}`);
    process.exit(1);
  }

  const format = String(args.format || 'markdown').toLowerCase();
  const outDir = path.resolve(args.outDir || path.join(path.dirname(source), 'exports'));
  fs.mkdirSync(outDir, { recursive: true });

  const base = path.basename(source).replace(/\.[^.]+$/, '');
  const content = fs.readFileSync(source, 'utf8');
  if (format === 'markdown' || format === 'md') {
    const outputPath = path.join(outDir, `${base}.md`);
    fs.copyFileSync(source, outputPath);
    console.log(JSON.stringify({ status: 'ok', format: 'markdown', output_path: outputPath }, null, 2));
    return;
  }
  if (format === 'html') {
    const outputPath = path.join(outDir, `${base}.html`);
    fs.writeFileSync(outputPath, markdownToHtml(content), 'utf8');
    console.log(JSON.stringify({ status: 'ok', format: 'html', output_path: outputPath }, null, 2));
    return;
  }
  if (format === 'pdf') {
    console.log(JSON.stringify({
      status: 'renderer_unavailable',
      format: 'pdf',
      message: 'PDF renderer is not bundled with CocoPlus. Export markdown or html, or configure an external renderer in a future reporting profile.',
      source_path: source,
    }, null, 2));
    return;
  }

  console.error(`Unsupported export format: ${format}`);
  process.exit(1);
}

main();
