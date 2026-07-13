#!/usr/bin/env node
'use strict';

/**
 * invoice-generator.js - writes CocoMeter chargeback invoice HTML and CSV files.
 *
 * Input may be the direct output of chargeback-refresh.js. If records are
 * present, invoices are grouped from records; otherwise existing `invoices`
 * totals are written directly.
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--out-dir') args.outDir = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    fail(`Could not read ${filePath}: ${err.message}`);
  }
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function slug(value) {
  return String(value || 'unknown').replace(/[^A-Za-z0-9_.-]+/g, '_');
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function groupInvoices(input) {
  if (Array.isArray(input.records) && input.records.length > 0) {
    const grouped = new Map();
    for (const record of input.records) {
      const key = record.user || 'unknown';
      const current = grouped.get(key) || {
        user: key,
        cost_center: record.cost_center || 'UNMAPPED',
        token_credits: 0,
        warehouse_credits: 0,
        total_credits: 0,
        amount: 0,
      };
      current.token_credits = round2(current.token_credits + Number(record.token_credits || 0));
      current.warehouse_credits = round2(current.warehouse_credits + Number(record.warehouse_credits || 0));
      current.total_credits = round2(current.total_credits + Number(record.total_credits || 0));
      current.amount = round2(current.amount + Number(record.amount || 0));
      grouped.set(key, current);
    }
    return Array.from(grouped.values());
  }
  return Array.isArray(input.invoices) ? input.invoices : [];
}

function htmlFor(invoice) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>CocoMeter Invoice</title></head>',
    '<body>',
    `<h1>CocoMeter Invoice - ${invoice.user}</h1>`,
    '<table>',
    `<tr><th>Cost center</th><td>${invoice.cost_center || 'UNMAPPED'}</td></tr>`,
    `<tr><th>Token credits</th><td>${round2(invoice.token_credits)}</td></tr>`,
    `<tr><th>Warehouse credits</th><td>${round2(invoice.warehouse_credits)}</td></tr>`,
    `<tr><th>Total credits</th><td>${round2(invoice.total_credits)}</td></tr>`,
    `<tr><th>Amount</th><td>${round2(invoice.amount)}</td></tr>`,
    '</table>',
    '</body>',
    '</html>',
  ].join('\n');
}

function csvFor(invoice) {
  const headers = ['user', 'cost_center', 'token_credits', 'warehouse_credits', 'total_credits', 'amount'];
  const row = headers.map((header) => csvEscape(invoice[header]));
  return `${headers.join(',')}\n${row.join(',')}\n`;
}

function writeInvoices(input, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const invoices = groupInvoices(input);
  const written = [];
  for (const invoice of invoices) {
    const base = slug(invoice.user);
    const htmlPath = path.join(outDir, `${base}.html`);
    const csvPath = path.join(outDir, `${base}.csv`);
    fs.writeFileSync(htmlPath, htmlFor(invoice), 'utf8');
    fs.writeFileSync(csvPath, csvFor(invoice), 'utf8');
    written.push({ user: invoice.user, html: htmlPath, csv: csvPath });
  }
  return written;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) fail('--input is required');
  if (!args.outDir) fail('--out-dir is required');
  const written = writeInvoices(readJson(path.resolve(process.cwd(), args.input)), path.resolve(process.cwd(), args.outDir));
  console.log(JSON.stringify({ invoices_written: written.length, files: written }, null, 2));
}

if (require.main === module) main();

module.exports = { groupInvoices, writeInvoices };
