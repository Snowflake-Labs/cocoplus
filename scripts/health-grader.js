'use strict';

/**
 * health-grader.js - CocoTrace asset health grade calculator.
 *
 * Scores Snowflake object graphs deterministically so $trace can show an A-F
 * grade and before/after receipt without relying on model interpretation.
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--compare') args.compare = [argv[++i], argv[++i]];
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

function hasCycle(edges) {
  const graph = new Map();
  for (const edge of edges || []) {
    if (!graph.has(edge.from)) graph.set(edge.from, []);
    graph.get(edge.from).push(edge.to);
  }
  const visiting = new Set();
  const visited = new Set();
  let cycles = 0;

  function dfs(node) {
    if (visiting.has(node)) {
      cycles += 1;
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const next of graph.get(node) || []) dfs(next);
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) dfs(node);
  return cycles;
}

function isDead(object) {
  const callers = Array.isArray(object.callers) ? object.callers.length : Number(object.callers || 0);
  const queries = Number(object.queries_90d || object.query_count || 0);
  return callers === 0 && queries === 0;
}

function layerViolation(object) {
  if (object.layer === 'staging' && (object.consumers || []).includes('bi')) return true;
  if (object.layer === 'raw' && object.updated_by === 'app') return true;
  if (object.layer === 'prod' && (object.accessed_by || []).includes('dev')) return true;
  return Boolean(object.layer_violation);
}

function gradeFromScore(score) {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

function gradeRank(grade) {
  return { F: 0, D: 1, 'C-': 2, C: 3, 'C+': 4, 'B-': 5, B: 6, 'B+': 7, 'A-': 8, A: 9 }[grade] || 0;
}

function score(input) {
  const objects = input.objects || [];
  const edges = input.edges || [];
  const deadAssets = objects.filter(isDead).length;
  const circularDependencies = hasCycle(edges);
  const layerViolations = objects.filter(layerViolation).length + Number(input.layer_violations || 0);
  const securityFindings = objects.reduce((sum, o) => sum + Number(o.security_findings || 0), 0);
  const churn = objects.filter(o => Number(o.modified_count || 0) >= 7).length;
  const coupling = objects.length ? edges.length / objects.length : 0;
  const deadPct = objects.length ? deadAssets / objects.length : 0;
  const healthScore = Math.max(0, Math.round(100
    - deadPct * 30
    - circularDependencies * 12
    - coupling * 4
    - securityFindings * 8
    - layerViolations * 10
    - churn * 3));
  const blastRadius = Math.round(edges.length * 5 + circularDependencies * 10 + layerViolations * 4 + securityFindings * 3);

  return {
    grade: gradeFromScore(healthScore),
    score: healthScore,
    blast_radius: blastRadius,
    metrics: {
      dead_assets: deadAssets,
      dead_asset_percent: Number((deadPct * 100).toFixed(1)),
      circular_dependencies: circularDependencies,
      coupling: Number(coupling.toFixed(2)),
      security_findings: securityFindings,
      layer_violations: layerViolations,
      churn_hotspots: churn,
    },
  };
}

function compare(beforeFile, afterFile) {
  const before = score(readJson(beforeFile));
  const after = score(readJson(afterFile));
  const blastSymbol = after.blast_radius <= before.blast_radius ? 'v' : '^';
  const gradeSymbol = gradeRank(after.grade) >= gradeRank(before.grade) ? '^' : 'v';
  return {
    before,
    after,
    receipt: `blast radius ${before.blast_radius} -> ${after.blast_radius} ${blastSymbol} / health ${before.grade} -> ${after.grade} ${gradeSymbol}`,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.compare) {
    console.log(JSON.stringify(compare(path.resolve(args.compare[0]), path.resolve(args.compare[1])), null, 2));
    return;
  }
  if (!args.input) fail('--input or --compare is required');
  console.log(JSON.stringify(score(readJson(path.resolve(args.input))), null, 2));
}

if (require.main === module) main();

module.exports = { score, compare };
