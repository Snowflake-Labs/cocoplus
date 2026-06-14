#!/usr/bin/env node
/**
 * CocoMap Transitive Reduction
 *
 * Reads a dependency graph from coco-map.json (or a supplied input JSON),
 * computes the transitive reduction using standard path-existence algorithm,
 * and writes the reduced graph to an output JSON.
 *
 * Algorithm (O(V * E)):
 *   For each edge (u -> v): remove it if there exists an alternative path
 *   from u to v through at least one intermediate node.
 *
 * No LLM. Deterministic. Exit 0 on success, exit 1 on error.
 *
 * Usage:
 *   node scripts/map-reduce.js <input.json> <output.json>
 *
 * Input JSON shape:
 *   { "nodes": ["F1","F2",...], "edges": [{"from":"F1","to":"F2"},...]  }
 *   OR the full coco-map.json (reads structural.dependencies, maps caller/callee)
 *
 * Output JSON shape:
 *   { "nodes": [...], "edges": [...], "removed_edges": [...], "reduction_stats": {...} }
 */

'use strict';

const fs   = require('fs');
const path = require('path');

function parseArgs() {
  const [,, inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error('Usage: node map-reduce.js <input.json> <output.json>');
    process.exit(1);
  }
  return { inputPath, outputPath };
}

function loadGraph(inputPath) {
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  // Accept full coco-map.json format
  if (raw.structural && Array.isArray(raw.structural.dependencies)) {
    const nodes = (raw.structural.functions || []).map(f => f.name || f);
    const edges = raw.structural.dependencies.map(d => ({ from: d.caller, to: d.callee }));
    return { nodes, edges };
  }

  // Accept simple { nodes, edges } format
  if (Array.isArray(raw.nodes) && Array.isArray(raw.edges)) {
    return { nodes: raw.nodes, edges: raw.edges };
  }

  console.error('Unrecognised input format. Expected { nodes, edges } or coco-map.json.');
  process.exit(1);
}

/**
 * Build adjacency set for fast reachability queries.
 * Returns Map<node, Set<node>> of direct successors.
 */
function buildAdj(nodes, edges) {
  const adj = new Map();
  for (const n of nodes) adj.set(n, new Set());
  for (const { from, to } of edges) {
    if (!adj.has(from)) adj.set(from, new Set());
    adj.get(from).add(to);
  }
  return adj;
}

/**
 * BFS/DFS reachability: can we reach `target` from `start`
 * WITHOUT using the direct edge start->target?
 */
function reachableViaAlternative(adj, start, target) {
  const visited = new Set();
  const queue   = [];

  // Seed with start's neighbors excluding direct target
  for (const neighbor of (adj.get(start) || [])) {
    if (neighbor !== target && !visited.has(neighbor)) {
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === target) return true;
    for (const neighbor of (adj.get(current) || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

function transitiveReduction(nodes, edges) {
  const adj          = buildAdj(nodes, edges);
  const keptEdges    = [];
  const removedEdges = [];

  for (const edge of edges) {
    const { from, to } = edge;
    if (reachableViaAlternative(adj, from, to)) {
      removedEdges.push(edge);
    } else {
      keptEdges.push(edge);
    }
  }

  return { keptEdges, removedEdges };
}

function main() {
  const { inputPath, outputPath } = parseArgs();

  let graph;
  try {
    graph = loadGraph(inputPath);
  } catch (err) {
    console.error(`Failed to load input: ${err.message}`);
    process.exit(1);
  }

  const { nodes, edges } = graph;
  const { keptEdges, removedEdges } = transitiveReduction(nodes, edges);

  const output = {
    nodes,
    edges: keptEdges,
    removed_edges: removedEdges,
    reduction_stats: {
      input_edge_count:   edges.length,
      output_edge_count:  keptEdges.length,
      removed_edge_count: removedEdges.length,
      reduction_pct: edges.length > 0
        ? Math.round((removedEdges.length / edges.length) * 100)
        : 0,
    },
  };

  try {
    const tmpPath = outputPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(output, null, 2));
    fs.renameSync(tmpPath, outputPath);
  } catch (err) {
    console.error(`Failed to write output: ${err.message}`);
    process.exit(1);
  }

  const s = output.reduction_stats;
  console.log(
    `Transitive reduction: ${s.input_edge_count} edges → ${s.output_edge_count} kept, ` +
    `${s.removed_edge_count} removed (${s.reduction_pct}% reduced)`
  );
}

main();
