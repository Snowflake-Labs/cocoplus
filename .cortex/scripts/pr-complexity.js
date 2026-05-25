#!/usr/bin/env node
'use strict';

/**
 * pr-complexity.js — deterministic PR complexity analyzer. No LLM.
 *
 * Formula: size_factor × 0.4 + breadth_factor × 0.2 + coverage_gap × 0.2 + schema_layer_diversity × 0.2
 *
 * Size buckets: XS (<50), S (<200), M (200-400), L (400-800), XL (≥800)
 *
 * Usage:
 *   node pr-complexity.js --file <path>
 *   node pr-complexity.js --diff <diff_text>
 *   echo "<diff>" | node pr-complexity.js
 *
 * Output: JSON to stdout
 */

const fs   = require('fs');
const path = require('path');

const SCHEMA_LAYERS = {
  staging:      /\b(stg_|staging_|raw_|source_)/i,
  intermediate: /\b(int_|intermediate_|prep_|clean_)/i,
  mart:         /\b(mart_|dim_|fct_|fact_|metrics_)/i,
  ml:           /\b(ml_|model_|train_|predict_|feature_)/i,
};

const SECURITY_PATTERNS = [
  /password|secret|token|api[_-]?key|credential/i,
  /masking.policy|row.access.policy/i,
  /pii|personally.identifiable/i,
];

const MIGRATION_PATTERNS = [
  /ALTER\s+TABLE/i,
  /DROP\s+(TABLE|COLUMN|SCHEMA)/i,
  /CREATE\s+OR\s+REPLACE/i,
];

function analyzeDiff(diffText) {
  const lines = diffText.split('\n');
  const addedLines   = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
  const removedLines = lines.filter(l => l.startsWith('-') && !l.startsWith('---'));
  const totalChanges = addedLines.length + removedLines.length;

  // File count — use only 'diff --git' headers to avoid double-counting (each file has one diff header and one +++ header)
  const fileHeaders = lines.filter(l => l.startsWith('diff --git'));
  const fileCount = Math.max(fileHeaders.length, 1);

  // Test ratio: added lines matching test/spec patterns vs all changes
  const testLines = lines.filter(l => /\b(test|spec)\b/i.test(l) && l.startsWith('+'));
  const nonTestChanges = totalChanges - testLines.length;
  const nonTestRatio = totalChanges > 0 ? Math.max(0, nonTestChanges / totalChanges) : 0;

  // Schema layer diversity (Snowflake-specific)
  const touchedLayers = new Set();
  for (const [layer, pattern] of Object.entries(SCHEMA_LAYERS)) {
    if (pattern.test(diffText)) touchedLayers.add(layer);
  }
  const schemaLayerDiversity = touchedLayers.size / 4; // normalized to [0,1]

  // Risk flags
  const riskFlags = [];
  if (MIGRATION_PATTERNS.some(p => p.test(diffText))) riskFlags.push('database_migration_present');
  if (SECURITY_PATTERNS.some(p => p.test(diffText)))  riskFlags.push('security-sensitive');
  if (nonTestRatio > 0.8 && totalChanges > 50)         riskFlags.push('low_test_ratio');
  if (testLines.length === 0 && totalChanges > 50)     riskFlags.push('zero_test_changes');

  // Component scores
  const sizeFactor = Math.min(totalChanges / 800, 1.0);
  const breadthFactor = Math.min(fileCount / 20, 1.0);
  const coverageGap = nonTestRatio;

  const complexityScore = parseFloat(
    (sizeFactor * 0.4 + breadthFactor * 0.2 + coverageGap * 0.2 + schemaLayerDiversity * 0.2).toFixed(2)
  );

  // Size bucket
  let sizeBucket;
  if      (totalChanges < 50)  sizeBucket = 'XS';
  else if (totalChanges < 200) sizeBucket = 'S';
  else if (totalChanges < 400) sizeBucket = 'M';
  else if (totalChanges < 800) sizeBucket = 'L';
  else                         sizeBucket = 'XL';

  // Estimated review minutes based on bucket
  const reviewMinutes = { XS: 5, S: 15, M: 30, L: 45, XL: 90 }[sizeBucket];

  return {
    complexity_score:        complexityScore,
    size_bucket:             sizeBucket,
    total_changes:           totalChanges,
    file_count:              fileCount,
    non_test_ratio:          parseFloat(nonTestRatio.toFixed(2)),
    schema_layer_diversity:  parseFloat(schemaLayerDiversity.toFixed(2)),
    schema_layers_touched:   Array.from(touchedLayers),
    estimated_review_minutes: reviewMinutes,
    risk_flags:              riskFlags,
  };
}

function run(diffText) {
  const result = analyzeDiff(diffText);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

const fileArg = process.argv.indexOf('--file');
const diffArg = process.argv.indexOf('--diff');

if (fileArg !== -1 && process.argv[fileArg + 1]) {
  const filePath = process.argv[fileArg + 1];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // If it looks like a diff, analyze as diff; otherwise analyze as plain file
    const isDiff = content.includes('@@') || content.startsWith('diff --git');
    if (isDiff) {
      run(content);
    } else {
      // Treat entire file as "added" lines for complexity scoring
      const simulatedDiff = content.split('\n').map(l => '+' + l).join('\n');
      run(simulatedDiff);
    }
  } catch (e) {
    process.stderr.write('pr-complexity: cannot read file: ' + e.message + '\n');
    process.exit(1);
  }
} else if (diffArg !== -1 && process.argv[diffArg + 1]) {
  run(process.argv[diffArg + 1]);
} else {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    if (!raw.trim()) {
      run('');
    } else {
      run(raw);
    }
  });
}
