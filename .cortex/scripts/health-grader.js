#!/usr/bin/env node
'use strict';

const { parseArgs, readJson } = require('./_script-utils.js');

function score(input) {
  const objects = input.objects || [];
  const edges = input.edges || [];
  const deadAssets = objects.filter((item) => (item.callers || []).length === 0 && Number(item.queries_90d || 0) === 0).length;
  const edgeSet = new Set(edges.map((edge) => `${edge.from}->${edge.to}`));
  const circular = edges.filter((edge) => edgeSet.has(`${edge.to}->${edge.from}`)).length / 2;
  const securityFindings = objects.reduce((sum, item) => sum + Number(item.security_findings || 0), 0);
  const churn = objects.reduce((sum, item) => sum + Number(item.modified_count || 0), 0);
  const penalty = deadAssets * 12 + circular * 20 + securityFindings * 15 + Math.max(0, churn - 8);
  const value = Math.max(0, 100 - penalty);
  const grade = value >= 90 ? 'A' : value >= 80 ? 'B' : value >= 70 ? 'C' : value >= 60 ? 'D' : 'F';
  return {
    grade,
    value,
    metrics: {
      dead_assets: deadAssets,
      circular_dependencies: circular,
      security_findings: securityFindings,
      blast_radius: edges.length,
    },
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.compare) {
  const before = score(readJson(args.compare, {}));
  const after = score(readJson(args._[0], {}));
  console.log(JSON.stringify({
    before,
    after,
    receipt: `blast radius ${before.metrics.blast_radius} -> ${after.metrics.blast_radius} v; health ${before.grade} -> ${after.grade} ^`,
  }, null, 2));
} else if (args.input) {
  console.log(JSON.stringify(score(readJson(args.input, {})), null, 2));
} else {
  console.error('Usage: health-grader.js --input file | --compare before after');
  process.exit(1);
}
