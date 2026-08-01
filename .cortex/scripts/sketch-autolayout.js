#!/usr/bin/env node
'use strict';
/**
 * sketch-autolayout.js — Algorithmic node positioning for >15-node diagrams (Feature 42)
 * No LLM. Topological sort → LR level assignment → coordinate output.
 * Input (stdin or argv[2]): { "nodes": [{"id":"A",...}], "edges": [{"from":"A","to":"B"}] }
 * Output (stdout or argv[3]): { "nodes": [...with x/y/width/height], "edges": [...] }
 */

'use strict';
const fs = require('fs');

const NODE_W = 120, NODE_H = 60, H_GAP = 50, V_GAP = 40, MARGIN = 30;

function main() {
  const inputPath  = process.argv[2];
  const outputPath = process.argv[3];

  const raw   = inputPath ? fs.readFileSync(inputPath, 'utf8') : fs.readFileSync('/dev/stdin', 'utf8');
  const input = JSON.parse(raw);

  const nodes = input.nodes || [];
  const edges = input.edges || [];

  if (nodes.length === 0) {
    const result = JSON.stringify({ nodes: [], edges }, null, 2);
    if (outputPath) fs.writeFileSync(outputPath, result);
    else process.stdout.write(result);
    process.stdout.write('\nPositioned 0 nodes\n');
    return;
  }

  // Build adjacency map and in-degree
  const adj      = {};
  const inDegree = {};
  for (const n of nodes) { const id = n.id || n.name; adj[id] = []; inDegree[id] = 0; }
  for (const e of edges) {
    if (adj[e.from] !== undefined) {
      adj[e.from].push(e.to);
      inDegree[e.to] = (inDegree[e.to] || 0) + 1;
    }
  }

  // Kahn's algorithm for topological order + level assignment
  const queue  = nodes.map(n => n.id || n.name).filter(id => inDegree[id] === 0);
  const levels = {};
  for (const id of queue) levels[id] = 0;

  const ordered = [];
  while (queue.length) {
    const id = queue.shift();
    ordered.push(id);
    for (const next of (adj[id] || [])) {
      levels[next] = Math.max(levels[next] || 0, (levels[id] || 0) + 1);
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    }
  }

  // Assign column positions within each level
  const levelCounts = {};
  const nodeById    = {};
  for (const n of nodes) nodeById[n.id || n.name] = n;

  const positioned = ordered.map(id => {
    const level = levels[id] || 0;
    const col   = levelCounts[level] || 0;
    levelCounts[level] = col + 1;
    return {
      ...nodeById[id],
      x:      MARGIN + level * (NODE_W + H_GAP),
      y:      MARGIN + col   * (NODE_H + V_GAP),
      width:  NODE_W,
      height: NODE_H,
    };
  });

  // Include any nodes not in topological order (cycles — place at end)
  const positionedIds = new Set(positioned.map(n => n.id || n.name));
  let overflowCol = 0;
  for (const n of nodes) {
    const id = n.id || n.name;
    if (!positionedIds.has(id)) {
      positioned.push({ ...n, x: MARGIN, y: MARGIN + (Object.keys(levelCounts).length + overflowCol) * (NODE_H + V_GAP), width: NODE_W, height: NODE_H });
      overflowCol++;
    }
  }

  const result = JSON.stringify({ nodes: positioned, edges }, null, 2);
  if (outputPath) fs.writeFileSync(outputPath, result);
  else process.stdout.write(result + '\n');

  const levelCount = Object.keys(levelCounts).length;
  process.stderr.write(`Positioned ${positioned.length} nodes across ${levelCount} column(s)\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`sketch-autolayout: ${err.message}\n`);
  process.exit(1);
}
