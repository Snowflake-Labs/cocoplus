#!/usr/bin/env node
'use strict';
/**
 * trace-check.js — CocoTrace deterministic SHA-256 staleness checker (Feature 41)
 * Tier 2 async — no LLM, no blocking of session start
 * Outputs: "OK" or "STALE:<comma-separated stale node ids>"
 * Writes: .cocoplus/lifecycle/trace.json
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const COCOPLUS_DIR = '.cocoplus';

const ARTIFACT_DEFS = [
  { id: 'bloom.md',     filePath: 'lifecycle/bloom.md' },
  { id: 'discuss.md',   filePath: 'lifecycle/discuss.md' },
  { id: 'spec.md',      filePath: 'lifecycle/spec.md' },
  { id: 'plan.md',      filePath: 'lifecycle/plan.md' },
  { id: 'build-output', filePath: 'lifecycle/build/' },
  { id: 'eval-results', filePath: 'lifecycle/eval/' },
];

const EDGES = [
  { from: 'bloom.md',     to: 'discuss.md' },
  { from: 'discuss.md',   to: 'spec.md' },
  { from: 'spec.md',      to: 'plan.md' },
  { from: 'plan.md',      to: 'build-output' },
  { from: 'build-output', to: 'eval-results' },
];

const WALK_ORDER = ['bloom.md', 'discuss.md', 'spec.md', 'plan.md', 'build-output', 'eval-results'];

function computeSha256(fullPath) {
  if (!fs.existsSync(fullPath)) return null;
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    let files;
    try { files = fs.readdirSync(fullPath).sort(); } catch { return null; }
    if (files.length === 0) return null;
    const hash = crypto.createHash('sha256');
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(fullPath, f));
        hash.update(content);
      } catch { /* skip unreadable files */ }
    }
    return hash.digest('hex');
  }
  try {
    const content = fs.readFileSync(fullPath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch { return null; }
}

// Feature 41 ninth-cycle enhancement: maintain snowflake-deps.json, the
// reverse-index source for trace-blast.js. Deterministic regex extraction —
// no SQL parser, no LLM. Scans lifecycle/build/ artifacts for object
// references keyed by a CREATE FUNCTION/PROCEDURE name in the same file.
function updateSnowflakeDeps() {
  const buildDir = path.join(COCOPLUS_DIR, 'lifecycle', 'build');
  const depsPath = path.join(COCOPLUS_DIR, 'lifecycle', 'snowflake-deps.json');
  if (!fs.existsSync(buildDir)) return;

  let files;
  try { files = fs.readdirSync(buildDir).filter(f => /\.(sql|py)$/i.test(f)); } catch { return; }

  const deps = {};
  for (const file of files) {
    let content;
    try { content = fs.readFileSync(path.join(buildDir, file), 'utf8'); } catch { continue; }

    const fnMatch = content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\s+(\w+)/i);
    if (!fnMatch) continue;
    const functionName = fnMatch[1];

    const reads = new Set();
    const writes = new Set();
    const cortexFeatures = new Set();

    const fromMatches = content.matchAll(/\bFROM\s+([a-zA-Z_][\w.]*)/gi);
    for (const m of fromMatches) reads.add(m[1]);
    const joinMatches = content.matchAll(/\bJOIN\s+([a-zA-Z_][\w.]*)/gi);
    for (const m of joinMatches) reads.add(m[1]);

    const intoMatches = content.matchAll(/\b(?:INSERT\s+INTO|MERGE\s+INTO|UPDATE)\s+([a-zA-Z_][\w.]*)/gi);
    for (const m of intoMatches) writes.add(m[1]);

    const cortexMatches = content.matchAll(/\b(AI_COMPLETE|AI_CLASSIFY|AI_EXTRACT|AI_SUMMARIZE_AGG|SNOWFLAKE\.CORTEX\.\w+)\b/gi);
    for (const m of cortexMatches) cortexFeatures.add(m[1].toUpperCase());

    deps[functionName] = {
      reads: [...reads],
      writes: [...writes],
      cortex_features: [...cortexFeatures],
    };
  }

  if (Object.keys(deps).length > 0) {
    fs.writeFileSync(depsPath, JSON.stringify(deps, null, 2), 'utf8');
  }
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.log('OK');
    return;
  }

  const tracePath = path.join(COCOPLUS_DIR, 'lifecycle', 'trace.json');

  // Load prior trace for staleness comparison
  let priorNodes = {};
  if (fs.existsSync(tracePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
      priorNodes = parsed.nodes || {};
    } catch { /* corrupt trace — start fresh */ }
  }

  // Compute current hashes
  const nodes = {};
  for (const def of ARTIFACT_DEFS) {
    const fullPath = path.join(COCOPLUS_DIR, def.filePath);
    const exists   = fs.existsSync(fullPath);
    const hash     = computeSha256(fullPath);
    nodes[def.id] = {
      path:   def.filePath,
      sha256: hash,
      status: !exists ? 'missing' : (!hash ? 'empty' : 'current'),
    };
  }

  // Identify nodes whose content changed
  const changedIds = new Set();
  for (const id of WALK_ORDER) {
    const prior   = priorNodes[id];
    const current = nodes[id];
    if (
      prior &&
      prior.sha256 !== null &&
      current.sha256 !== null &&
      prior.sha256 !== current.sha256
    ) {
      changedIds.add(id);
    }
  }

  // Propagate staleness downstream along edges
  let propagating = true;
  while (propagating) {
    propagating = false;
    for (const edge of EDGES) {
      if (changedIds.has(edge.from) && !changedIds.has(edge.to)) {
        changedIds.add(edge.to);
        propagating = true;
      }
    }
  }

  // Apply stale status
  for (const id of changedIds) {
    if (nodes[id].status === 'current') {
      nodes[id].status = 'stale';
    }
  }

  // Write trace.json
  const trace = {
    nodes,
    edges:        EDGES,
    walk_order:   WALK_ORDER,
    last_checked: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };

  const lifecycleDir = path.join(COCOPLUS_DIR, 'lifecycle');
  if (!fs.existsSync(lifecycleDir)) fs.mkdirSync(lifecycleDir, { recursive: true });
  fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2), 'utf8');

  updateSnowflakeDeps();

  // Output summary
  const staleNodes = Object.entries(nodes)
    .filter(([, v]) => v.status === 'stale')
    .map(([k]) => k);

  if (staleNodes.length > 0) {
    console.log(`STALE:${staleNodes.join(',')}`);
  } else {
    console.log('OK');
  }
}

try {
  main();
} catch (err) {
  // Non-fatal — session must not be blocked
  process.stderr.write(`trace-check: ${err.message}\n`);
  console.log('OK');
}
