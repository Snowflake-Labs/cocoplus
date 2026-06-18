'use strict';

/**
 * lean-debt.js — CocoLean shortcut debt ledger harvester
 *
 * Scans all project files for `cocoplus:` comment markers, extracts the
 * three required fields (simplified/ceiling/trigger), calculates ceiling
 * imminence from current project metrics, and outputs a ranked JSON array
 * sorted by (ceiling_imminence × days_since_annotation).
 *
 * No LLM — deterministic only. Tier 1 latency.
 *
 * Output schema:
 * { records: Array<DebtRecord>, summary: { total, high, medium, low, malformed }, generated_at: ISO8601 }
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.cwd();
const COCOPLUS_DIR = path.join(PROJECT_ROOT, '.cocoplus');

const SCAN_EXTENSIONS = ['.sql', '.js', '.md', '.yaml', '.yml', '.json', '.toml'];
const EXCLUDE_DIRS = ['node_modules', '.git', '.cocoplus/meter', '.cocoplus/grove', 'docs'];

// Scan file extensions and exclusions
function shouldScan(filePath) {
  const ext = path.extname(filePath);
  if (!SCAN_EXTENSIONS.includes(ext)) return false;
  for (const excl of EXCLUDE_DIRS) {
    if (filePath.includes(excl)) return false;
  }
  return true;
}

function walkDir(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.some(e => full.endsWith(e))) walkDir(full, results);
    } else if (entry.isFile() && shouldScan(full)) {
      results.push(full);
    }
  }
  return results;
}

// Parse a cocoplus: marker line into fields
function parseMarker(raw) {
  // Support both semicolon and pipe delimiters
  const normalized = raw.replace(/\|/g, ';');
  const fields = {};
  for (const part of normalized.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      const key = part.slice(0, eq).trim().toLowerCase();
      const val = part.slice(eq + 1).trim();
      fields[key] = val;
    }
  }
  return fields;
}

// Get git blame date for a specific line
function getAnnotationDate(filePath, lineNum) {
  try {
    const rel = path.relative(PROJECT_ROOT, filePath);
    const out = execSync(`git blame -L ${lineNum},${lineNum} --porcelain -- "${rel}"`, { encoding: 'utf8' });
    const match = out.match(/^author-time (\d+)/m);
    if (match) return new Date(parseInt(match[1], 10) * 1000);
    return new Date();
  } catch {
    return new Date();
  }
}

// Load current project metrics for imminence calculation
function loadProjectMetrics() {
  const metrics = {};

  // Seed count
  const seedsDir = path.join(COCOPLUS_DIR, 'seeds');
  if (fs.existsSync(seedsDir)) {
    metrics.seed_count = fs.readdirSync(seedsDir).filter(f => f.endsWith('.yaml')).length;
  }

  // Flow stage count
  const flowPath = path.join(COCOPLUS_DIR, 'flow.json');
  if (fs.existsSync(flowPath)) {
    try {
      const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      metrics.flow_stage_count = Array.isArray(flow.stages) ? flow.stages.length : 0;
    } catch { /* ignore */ }
  }

  // DORA snapshot for agent count proxy
  const doraPath = path.join(COCOPLUS_DIR, 'ops', 'dora-snapshot.json');
  if (fs.existsSync(doraPath)) {
    try {
      const dora = JSON.parse(fs.readFileSync(doraPath, 'utf8'));
      metrics.last_build_agents = dora.avg_parallel_agents || 0;
    } catch { /* ignore */ }
  }

  return metrics;
}

// Calculate ceiling imminence (0.0–1.0) by matching ceiling text against metrics
function calcImminence(ceiling, metrics) {
  if (!ceiling) return 0.1;

  // Extract numeric thresholds from ceiling text
  const numMatch = ceiling.match(/(\d+)/g);
  if (!numMatch) return 0.2;

  const threshold = parseInt(numMatch[0], 10);

  // Try to match ceiling to a known metric
  if (/seed/i.test(ceiling) && metrics.seed_count != null) {
    return Math.min(metrics.seed_count / threshold, 1.0);
  }
  if (/stage/i.test(ceiling) && metrics.flow_stage_count != null) {
    return Math.min(metrics.flow_stage_count / threshold, 1.0);
  }
  if (/agent/i.test(ceiling) && metrics.last_build_agents != null) {
    return Math.min(metrics.last_build_agents / threshold, 1.0);
  }

  // Default: low imminence when we can't measure
  return 0.1;
}

function immLabel(score) {
  if (score >= 0.8) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
}

function daysSince(date) {
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function harvestMarkers() {
  const files = walkDir(PROJECT_ROOT);
  const records = [];
  const malformed = [];
  const metrics = loadProjectMetrics();

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const markerIdx = line.toLowerCase().indexOf('cocoplus:');
      if (markerIdx < 0) return;

      const raw = line.slice(markerIdx + 'cocoplus:'.length).trim();
      const fields = parseMarker(raw);

      const lineNum = idx + 1;
      const relPath = path.relative(PROJECT_ROOT, filePath);

      if (!fields.simplified || !fields.ceiling || !fields.trigger) {
        malformed.push({ file: relPath, line: lineNum, raw, missing: ['simplified', 'ceiling', 'trigger'].filter(f => !fields[f]) });
        return;
      }

      const annotationDate = getAnnotationDate(filePath, lineNum);
      const imminence = calcImminence(fields.ceiling, metrics);
      const age = daysSince(annotationDate);
      const rank = imminence * age;

      records.push({
        file: relPath,
        line: lineNum,
        simplified: fields.simplified,
        ceiling: fields.ceiling,
        trigger: fields.trigger,
        annotation_date: annotationDate.toISOString().split('T')[0],
        age_days: age,
        ceiling_imminence: Math.round(imminence * 100) / 100,
        imminence_label: immLabel(imminence),
        rank,
      });
    });
  }

  // Sort by rank descending
  records.sort((a, b) => b.rank - a.rank);

  const summary = {
    total: records.length + malformed.length,
    high: records.filter(r => r.imminence_label === 'HIGH').length,
    medium: records.filter(r => r.imminence_label === 'MEDIUM').length,
    low: records.filter(r => r.imminence_label === 'LOW').length,
    malformed: malformed.length,
  };

  return { records, malformed, summary, generated_at: new Date().toISOString(), metrics };
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const result = harvestMarkers();
  console.log(JSON.stringify(result, null, 2));
}

main();
