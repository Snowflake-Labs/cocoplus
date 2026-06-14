---
name: map
description: Build and commit a Cortex function knowledge graph — maps structural dependencies and domain intent relationships across all AI functions in the project. Supports --reduce (default on) for transitive reduction of the dependency graph.
version: 1.1.0
user-invocable: true
command: $map
author: "CocoPlus"
tags:
  - cocoplus
feature: CocoMap (Feature 28)
---

# $map

Build and commit a knowledge graph of all Cortex AI functions in the project. Produces `coco-map.json` with structural dependency data and a domain intent map.

## Flags

| Flag | Effect |
|------|--------|
| (none) | Build full map with transitive reduction applied (default) |
| `--reduce` | Explicit: apply transitive reduction (same as default) |
| `--reduce off` | Skip transitive reduction — store full transitive closure in `coco-map.json` |

## Preconditions

- `.cocoplus/` must be initialized
- At least 2 Cortex AI functions must exist in the project (SQL UDFs using AI_COMPLETE, AI_CLASSIFY, AI_EXTRACT, etc., or Cortex Search configurations, or Semantic Model definitions)
- CocoHarvest must be available for parallel agent coordination

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." and exit.

2. **Count Cortex AI functions:** Scan project SQL files and configuration for functions using: `AI_COMPLETE`, `AI_CLASSIFY`, `AI_EXTRACT`, `AI_FILTER`, `AI_SENTIMENT`, `AI_TRANSLATE`, `AI_EMBED`, `AI_SIMILARITY`, `AI_REDACT`, `AI_PARSE_DOCUMENT`, `AI_TRANSCRIBE`, `AI_AGG`, `AI_COUNT_TOKENS`, Cortex Search service definitions, and Semantic Model files. If fewer than 2 found, output:
   ```
   CocoMap requires at least 2 Cortex AI functions. Only [N] found.
   Add more Cortex AI functions before running $map.
   ```
   and exit.

3. **Create map directories:**
   - `.cocoplus/map/intermediate/` (if not present)
   - `.cocoplus/map/archive/` (if not present)

4. **Archive previous map:** If `.cocoplus/map/coco-map.json` already exists, copy it to `.cocoplus/map/archive/[timestamp]-coco-map.json` before overwriting. This is gitignored — the archive is for debugging, not version history.

5. **Spawn 5 analysis agents in parallel** (each writes intermediate results to `.cocoplus/map/intermediate/` without returning to orchestrator context):

   **Agent 1 — Function Scanner:**
   - Discovers all Cortex AI functions: SQL UDFs using AI_* functions, Cortex Search configurations, Semantic Model definitions
   - Extracts: function name, file path, function signature, Cortex API used, schema/database location
   - Output: `.cocoplus/map/intermediate/function-scanner-results.json`

   **Agent 2 — Dependency Mapper:**
   - Traces call chains: which functions call other functions, which share input schemas, which share evaluation sets, which run on the same warehouse
   - Identifies: direct callers, transitive dependencies, shared infrastructure
   - Output: `.cocoplus/map/intermediate/dependency-mapper-results.json`

   **Agent 3 — Domain Analyzer:**
   - Maps functions to business capabilities from function names, comments, spec files, prompt files
   - Extracts domain vocabulary: business terms used to describe each function's purpose
   - Output: `.cocoplus/map/intermediate/domain-analyzer-results.json`

   **Agent 4 — Evaluation Mapper:**
   - Discovers evaluation configurations: labeled test sets, accuracy baselines, shared evaluation infrastructure
   - Identifies which functions have evaluation coverage and which do not
   - Output: `.cocoplus/map/intermediate/evaluation-mapper-results.json`

   **Agent 5 — Gap Detector:**
   - Identifies isolation risks: functions with no evaluation baseline, functions depended on by others but undocumented, circular dependency chains (depth > 5 hops)
   - Output: `.cocoplus/map/intermediate/gap-detector-results.json`

6. **Wait for all 5 agents to complete.** If an agent times out, proceed with partial results and note the missing analysis in the map metadata.

7. **Transitive Reduction (unless `--reduce off`):**

   Build a simple graph JSON from Dependency Mapper results:
   ```json
   { "nodes": ["F1","F2",...], "edges": [{"from":"F1","to":"F2"},...] }
   ```
   Write to `.cocoplus/map/intermediate/dependency-graph.json`.

   Run:
   ```
   node scripts/map-reduce.js .cocoplus/map/intermediate/dependency-graph.json .cocoplus/map/intermediate/dependency-reduced.json
   ```

   On success: use `dependency-reduced.json` edges as the canonical `structural.dependencies` in the merged map. Store `removed_edges` and `reduction_stats` under `structural.reduction`.

   On failure (non-zero exit, missing script): log warning, fall back to full transitive closure, set `structural.reduction.skipped: true`.

   **If `--reduce off`:** skip this step entirely. Set `structural.reduction.skipped: true, reason: "flag"`.

9. **Merge intermediate results** into `coco-map.json`:
   ```json
   {
     "meta": {
       "generated_at": "[ISO8601]",
       "cocoplus_version": "1.1.0",
       "function_count": [N],
       "analysis_agents_completed": [M of 5]
     },
     "structural": {
       "functions": [...],
       "dependencies": [{"caller": "F1", "callee": "F2", "via": "shared_eval_set"}],
       "reduction": { "removed_edges": [...], "reduction_pct": 0, "skipped": false },
       "warehouses": {...},
       "evaluation_sets": {...}
     },
     "domain": {
       "capabilities": [{"name": "customer_sentiment", "functions": ["F1", "F3"]}],
       "vocabulary": {"churn_propensity": {"functions": ["F2"], "definition": "..."}}
     },
     "gaps": [
       {"type": "no_evaluation_baseline", "function": "F4"},
       {"type": "undocumented_dependency", "caller": "F2", "callee": "F4"},
       {"type": "deep_dependency_chain", "chain": ["F1", "F2", "F3", "F4", "F5", "F6"]}
     ]
   }
   ```

10. **Write merged result** to `.cocoplus/map/coco-map.json` (atomic write: write to `.tmp` then rename).

11. **Clean intermediate directory:** Move files from `.cocoplus/map/intermediate/` to `.cocoplus/map/archive/[timestamp]/` and remove the intermediate directory contents.

12. **Update AGENTS.md** with: map timestamp, function count, dependency count, identified gaps count.

13. **Create git commit:** `docs(map): update Cortex function knowledge graph — [N] functions, [M] dependencies`

14. **Display summary:**
```
CocoMap complete — [timestamp]
  Functions mapped: [N]
  Dependencies: [M]
  Business capabilities: [K]
  Gaps detected: [P]

Map committed to .cocoplus/map/coco-map.json
Run $map diff to analyze impact of pending changes.
Run $map explain <function-name> to understand a specific function.
```

## Error Cases

- **Fewer than 2 functions:** Informational message, no map generated, no commit
- **Analysis agent timeout:** Proceed with partial results; note missing agents in map metadata
- **Merge conflict in coco-map.json:** Preserve previous version, output warning, request developer review
- **Cannot write coco-map.json:** Output filesystem error; do not delete intermediate files

## Exit Criteria

This skill is complete when:
- `coco-map.json` is written and committed to git
- Developer has received the summary output

## Anti-Rationalization

Do NOT:
- Return full analysis results to orchestrator context — agents write to intermediate files only
- Proceed without archiving previous map (if one exists)
- Skip the gap detection pass (gaps are often the most actionable finding)
- Generate a visualization — the committed JSON is the data layer; visualization is handled by `$sketch deps`
- Skip transitive reduction unless `--reduce off` is explicitly passed — transitive closure graphs are unreadable beyond ~10 nodes
- Treat reduction failure as blocking — fall back to full closure with a warning, never abort the map build
