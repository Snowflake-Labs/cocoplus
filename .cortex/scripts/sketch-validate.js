#!/usr/bin/env node
'use strict';
/**
 * sketch-validate.js — Deterministic draw.io XML lint (Feature 42)
 * No LLM. Must run before any PNG export in the CocoSketch pipeline.
 * Usage: node sketch-validate.js <file.drawio>
 * Exit 0 = PASS, Exit 1 = FAIL
 */

const fs   = require('fs');
const path = require('path');

function validate(xmlPath) {
  if (!xmlPath) {
    process.stderr.write('Usage: sketch-validate.js <file.drawio>\n');
    process.exit(1);
  }
  if (!fs.existsSync(xmlPath)) {
    process.stderr.write(`FAIL: File not found: ${xmlPath}\n`);
    process.exit(1);
  }

  const xml    = fs.readFileSync(xmlPath, 'utf8');
  const errors = [];

  // Structural requirements
  if (!xml.includes('<mxGraphModel'))      errors.push('Missing <mxGraphModel> root element');
  if (!xml.includes('</mxGraphModel>'))    errors.push('Unclosed <mxGraphModel> element');
  if (!xml.includes('id="0"'))             errors.push('Missing root cell with id="0" (required by draw.io spec)');
  if (!xml.includes('id="1"'))             errors.push('Missing parent cell with id="1" (required by draw.io spec)');

  // Collect all declared ids
  const idMatches = [...xml.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const idSet     = new Set(idMatches);

  // Check for duplicate ids (causes rendering issues)
  const seen = new Set();
  for (const id of idMatches) {
    if (seen.has(id) && id !== '0' && id !== '1') {
      errors.push(`Duplicate id="${id}" — each cell must have a unique id`);
    }
    seen.add(id);
  }

  // Check orphaned edge endpoints
  const sourceMatches = [...xml.matchAll(/\bsource="([^"]+)"/g)].map(m => m[1]);
  const targetMatches = [...xml.matchAll(/\btarget="([^"]+)"/g)].map(m => m[1]);
  for (const s of sourceMatches) {
    if (!idSet.has(s)) errors.push(`Edge source="${s}" references unknown cell id`);
  }
  for (const t of targetMatches) {
    if (!idSet.has(t)) errors.push(`Edge target="${t}" references unknown cell id`);
  }

  if (errors.length > 0) {
    process.stderr.write('FAIL:\n' + errors.map(e => `  - ${e}`).join('\n') + '\n');
    process.exit(1);
  }

  const cellCount = idMatches.length;
  process.stdout.write(`PASS: ${path.basename(xmlPath)} is valid draw.io XML (${cellCount} cells)\n`);
  process.exit(0);
}

try {
  validate(process.argv[2]);
} catch (err) {
  process.stderr.write(`FAIL: Unexpected error — ${err.message}\n`);
  process.exit(1);
}
