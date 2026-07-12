---
name: cocosketch
description: Generate visual draw.io diagrams from CocoPlus artifacts via a deterministic seven-step pipeline
version: "1.0.0"
author: sgsshankar
tags: [visual, diagram, drawio, schema, pipeline, deps]
commands: ["$sketch schema", "$sketch flow", "$sketch deps"]
user-invocable: true
blocking: false
when-not-to-use: |
  For quick inline diagrams in GitHub markdown, use Mermaid (`graph LR`, `erDiagram`, `flowchart TD`).
  For single-table schemas, a text description is faster.
  CocoSketch is best for: multi-table schemas (5+ tables), full pipeline flows, dependency graphs (10+ nodes).
---

# CocoSketch — Visual Artifact Generation Pipeline

## Core Principle
Diagram quality requires a pipeline, not a single prompt. The AI generates XML; deterministic scripts validate and repair. Never skip validation or repair steps.

## Seven-Step Pipeline (ALL modes)

```
Step 1: Resolve style preset
Step 2: Check draw.io CLI availability (resolve binary once, use verbatim)
Step 3: Plan layout — shapes, relationships, groups; run sketch-autolayout.js for >15 nodes
Step 4: Generate draw.io XML → run sketch-validate.js → STOP pipeline if FAIL
Step 5: Export PREVIEW PNG (NO -e flag) capped at 2000px
Step 6: Self-check preview via vision — auto-fix overlaps/clipped labels (max 2 rounds)
Step 7: Export FINAL PNG (WITH -e flag) → run sketch-repair.js → deliver to developer
```

**NEVER skip Steps 4 or 7. NEVER add -e to Step 5. NEVER omit -e from Step 7.**

## Step 1 — Resolve Style Preset
Check `~/.cocoplus/sketch-styles/` first, then `.cortex/sketch/styles/built-in/`.
Available built-in styles: `default`, `corporate`, `handdrawn`.
Default: `default.json`. Load and apply to all generated cells.

## Step 2 — Check draw.io CLI
Try in order: `drawio --version`, `draw.io --version`, OS-specific paths.
Resolve binary name ONCE. Store as `DRAWIO_BIN`. Use `DRAWIO_BIN` verbatim in Steps 5 and 7.

**Fallback chain (if draw.io unavailable):**
1. Generate Mermaid markup → write `<name>.mmd`, inform developer
2. If Mermaid not applicable: deliver raw `.drawio` XML with open-in-browser instructions

## Step 3 — Plan Layout
- Direction: **LR** for sequences/pipelines, **TB** for hierarchies/schemas
- For >15 nodes: run `node scripts/sketch-autolayout.js <input.json> <layout.json>`
- For ≤15 nodes: hand-place coordinates with reasonable spacing (120px wide × 60px tall, 50px H-gap, 40px V-gap)
- Groups: use swimlane cells to visually cluster related nodes

## Step 4 — Generate XML + Validate
Required XML structure:
```xml
<mxGraphModel>
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    <!-- shape cells: parent="1", unique id each -->
  </root>
</mxGraphModel>
```
Run: `node scripts/sketch-validate.js <file.drawio>`
**If FAIL: stop immediately. Report structural errors. Do not proceed to Step 5.**

## Step 5 — Export Preview PNG (NO -e)
```bash
$DRAWIO_BIN -x -f png --width 2000 -o <name>-preview.png <file.drawio>
```
No `-e` flag. Preview is for agent vision API — embedded XML produces a truncated IEND that vision APIs reject.

## Step 6 — Self-Check
Read `<name>-preview.png` using vision capability.
Identify: overlapping nodes, clipped labels, missing edge connections.
Auto-fix in the `.drawio` XML source. Maximum 2 correction rounds.
After round 2: proceed and note any remaining issues in output.

## Step 7 — Final Export + Repair
```bash
$DRAWIO_BIN -x -f png -e --width 2000 -o <name>.png <file.drawio>
node scripts/sketch-repair.js <name>.png
```
`-e` flag embeds diagram XML in PNG — developer can open in draw.io directly.
`sketch-repair.js` restores truncated IEND chunk that `-e` can produce.
Output: `<name>.png` and `<name>.drawio` written to `.cocoplus/diagrams/`.

Record the exact final PNG path in the command output. If Mermaid fallback is used, output the `.mmd` path instead and clearly state that PNG export was unavailable.

---

## Mode: `$sketch schema [--tables <list>]`

1. Query Snowflake: `SHOW TABLES` (full schema) or scoped to `--tables` list
2. Query: `SHOW COLUMNS IN TABLE <name>` for each table
3. Build table relationship graph:
   - FK references → directed edges
   - Shared key column names → undirected edges (dashed)
   - View dependencies → directed edges (dotted)
4. Apply transitive reduction to relationship graph
5. Execute seven-step pipeline
6. Output: `.cocoplus/diagrams/schema-[timestamp].png`

## Mode: `$sketch flow [file]`

1. Read `flow.json` (default: `.cocoplus/flow.json`; use `[file]` if provided)
2. Map each stage → node (label = stage name, subtitle = persona + model)
3. Map stage dependencies → directed edges
4. Mark HITL gates with ⊛ on the connecting edge label
5. Mark MANDATORY checkpoints with double-border on nodes
6. Execute seven-step pipeline
7. Output: `.cocoplus/diagrams/flow-[timestamp].png`

## Mode: `$sketch deps [--reduce]`

1. Read `.cocoplus/map/coco-map.json` structural dependency view
2. Build node/edge graph from function dependencies
3. Default (`--reduce` on): run `node scripts/map-reduce.js <input.json> <reduced.json>` before layout
4. `--reduce off`: use full transitive closure
5. Execute seven-step pipeline
6. Compute and report dependency metrics: node count, edge count before reduction, edge count after reduction, and reduction percentage
7. Output: `.cocoplus/diagrams/deps-[timestamp].png`

---

## Exit Criteria
- [ ] `sketch-validate.js` runs before Step 5 on every invocation; pipeline stops on FAIL
- [ ] `sketch-repair.js` runs after Step 7 on every invocation
- [ ] Preview PNG (Step 5) has NO `-e` flag
- [ ] Final PNG (Step 7) HAS `-e` flag
- [ ] `$sketch deps` applies transitive reduction by default; `--reduce off` skips it
- [ ] `$sketch deps` reports node count, original edge count, reduced edge count, and reduction percentage
- [ ] Command output includes the final PNG path or fallback `.mmd` path
- [ ] User style in `~/.cocoplus/sketch-styles/` takes precedence over built-in styles
- [ ] For >15 nodes, `sketch-autolayout.js` is called in Step 3
- [ ] Fallback chain (Mermaid → raw XML) executes when draw.io CLI unavailable

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Skip `sketch-validate.js` | Invalid XML produces blank or corrupt diagrams without error |
| Use `-e` for preview PNG | `-e` truncates IEND; vision APIs reject the PNG |
| Skip `sketch-repair.js` | Truncated IEND corrupts the PNG in several common viewers |
| Generate in one LLM shot without pipeline | Single-shot generation produces bad layouts and structural errors |
| Reuse draw.io binary name without checking | Binary name varies by OS and install method — resolve once |
| Say "diagram generated" without a path | Users need the exact artifact path to inspect or attach the diagram |
