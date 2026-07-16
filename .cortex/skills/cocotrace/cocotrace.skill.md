---
name: cocotrace
description: Build and query the SHA-256 requirements-to-implementation traceability graph across lifecycle artifacts
version: "1.1.0"
author: sgsshankar
tags: [traceability, quality, sha256, audit, lifecycle]
commands: ["$trace build", "$trace gaps", "$trace show", "$trace blast", "$trace check", "$trace health", "$trace compare"]
user-invocable: true
---

# CocoTrace — Requirements-to-Implementation Traceability

## Overview
CocoTrace maintains a directed dependency graph: `bloom.md → discuss.md → spec.md → plan.md → build-output → eval-results`. SHA-256 content hashes detect genuine changes (not timestamp drift from git operations). Staleness propagates downstream from any changed node.

**Why SHA-256, not timestamps:** Rebase and cherry-pick change file mtimes without changing content. SHA-256 only signals real changes.

## Commands

### `$trace build`

<<<<<<< HEAD
1. Run `node scripts/trace-check.js` (deterministic, no LLM, Tier 2 async)
=======
1. Execute the `cocotrace/trace-check` contract (deterministic, no LLM, Tier 2 async)
>>>>>>> feature/cocoplus-v2.0.0
2. Read output `lifecycle/trace.json`
3. Display summary table:

   ```
   Artifact        Status    SHA-256
   ──────────────  ────────  ──────────
   bloom.md        current   abc12345
   discuss.md      stale     def67890
   spec.md         stale     (downstream of discuss.md)
   plan.md         missing   —
   build-output    missing   —
   eval-results    missing   —
   ```

4. Create git commit: `chore(cocotrace): update artifact traceability graph`
5. Output: "[N] current, [M] stale, [P] missing"

**Idempotent:** Running twice on unchanged content produces bit-identical `trace.json`.

### `$trace gaps`

1. Read `lifecycle/trace.json`
2. Read `lifecycle/spec.md`
   - If spec.md has no `##` section headings: output "spec.md has no section structure — gap analysis requires structured sections" and exit gracefully
3. Extract requirement sections (all `## ` headings in spec.md)
4. Check `lifecycle/build/` for corresponding implementation files
5. Report:

   ```
   ## Traceability Gap Analysis

   ### Orphaned Requirements (in spec.md, no build artifact)
   - § 3.2 Model Selection Criteria — no matching build artifact found

   ### Uncovered Code (in build/, no traceable requirement)
   - lifecycle/build/helper-utils.sql — not referenced in spec.md

   ### Coverage
   Requirements covered: 4/6 (67%)
   Implementation traced: 3/4 (75%)
   ```

### `$trace show <artifact>`

1. Read `lifecycle/trace.json`
2. Trace backward from `<artifact>`: which upstream nodes inform it?
3. Trace forward: which downstream nodes it produces?
4. Display ASCII dependency chain with YOU ARE HERE marker:

   ```
   bloom.md [current]
     └── discuss.md [current]
           └── spec.md [← YOU ARE HERE] [current]
                 └── plan.md [stale]
                       └── build-output [missing]
                             └── eval-results [missing]
   ```

### `$trace blast <object>`

Computes the blast radius for a named Snowflake object (table, view, column, or Cortex model identifier) — all Cortex functions in the CocoPod that depend on it.

<<<<<<< HEAD
1. Run `node scripts/trace-blast.js --object "<object>"`. The script reads `snowflake-deps.json` (the reverse index of function → object dependencies, maintained by `$trace sync`) and returns every function that depends on `<object>`.
=======
1. Execute the `cocotrace/trace-blast` contract for `<object>`. It reads `snowflake-deps.json` (the reverse index of function → object dependencies, maintained by `$trace sync`) and returns every function that depends on `<object>`.
>>>>>>> feature/cocoplus-v2.0.0
2. For each affected function, report the dependency type (`read`, `write`, or `structural`), the downstream traceability chain to its CocoBloom commitment and CocoSpec outcome statement, and whether its CocoContract evidence is stale relative to the object's current state.
3. Display:

   ```
   ## Blast Radius: customer_events (table)

   | Function              | Dependency | Chain                                    | Contract Evidence |
   |------------------------|-----------|-------------------------------------------|--------------------|
   | classify_sentiment     | read      | bloom → spec § 2.1 → build/classify.sql   | STALE — reprove required |
   | enrich_customer_profile| write     | bloom → spec § 3.4 → build/enrich.sql     | current |

   2 functions affected. 1 requires CocoContract re-proof after this change.
   ```

<<<<<<< HEAD
`snowflake-deps.json` is committed to the CocoPod repository and updated by `$trace sync` (extends `trace-check.js`) whenever a build artifact changes — it records, per function, the objects read, the objects written, and the Cortex API features depended on.
=======
`snowflake-deps.json` is committed to the CocoPod repository and updated by `$trace sync` whenever a build artifact changes — it records, per function, the objects read, the objects written, and the Cortex API features depended on.
>>>>>>> feature/cocoplus-v2.0.0

### `$trace check --before-change "<change description>"`

A pre-change impact gate, not a permission gate — it does not block the change. Runs the blast radius computation for the objects implied by `<change description>`, generates a human-readable impact summary, and records the gate event in `lifecycle/audit.md` via CocoAudit (proving blast radius was assessed before the change was applied). Output the same blast radius table as `$trace blast`, prefixed with the change description and an audit confirmation line: "Recorded to lifecycle/audit.md as a pre-change impact assessment."

### `$trace health`

Compute the Snowflake asset health grade for the current dependency graph. Run:

```text
node scripts/health-grader.js --input .cocoplus/trace/snowflake-assets.json
```

The grade is A-F and combines dead asset percentage, circular dependencies, coupling, security findings, layer violations, and churn hotspots. Dead assets include zero-caller UDFs, unqueried views, and stale tables. Layer violations include staging objects consumed directly by BI, raw sources updated by application code, and production assets accessed from development contexts.

If `[trace].show_grade = false` in `cocoplus.toml`, suppress the letter grade but still show the underlying metrics.

### `$trace compare <before.json> <after.json>`

Run:

```text
node scripts/health-grader.js --compare <before.json> <after.json>
```

Display the thermal receipt line exactly as a before/after delta, for example:

```text
blast radius 23 -> 18 v / health B+ -> A- ^
```

## SessionStart Integration
<<<<<<< HEAD
`trace-check.js` runs at SessionStart (Tier 2 async — non-blocking). If any artifact is stale, a non-blocking advisory appears:
=======
SessionStart appends a `cocotrace/trace-check` request (Tier 2 async — non-blocking). If any artifact is stale, a non-blocking advisory appears:
>>>>>>> feature/cocoplus-v2.0.0

```
⚠️  CocoTrace: discuss.md changed since spec.md was last traced.
    Run `$trace build` to update the traceability graph.
```

## Key Constraints
<<<<<<< HEAD
- `trace-check.js` is DETERMINISTIC — no LLM, no inference
=======
- `cocotrace/trace-check` is DETERMINISTIC — no LLM, no inference
>>>>>>> feature/cocoplus-v2.0.0
- SHA-256 computed from file CONTENT, not metadata
- `trace.json` records git branch and commit metadata for the trace run
- Staleness propagates in `walk_order` — downstream always stale if upstream changed
- SessionStart advisory is NON-BLOCKING — never prevents session start
- `lifecycle/trace.json` committed to git — team-visible

## Git Behavior
`lifecycle/trace.json` committed after `$trace build`: `chore(cocotrace): update artifact traceability graph`

## Export

Trace reports such as `trace-gaps.md` or blast-radius summaries can be exported through the shared exporter:

```text
node scripts/report-export.js --source <trace-report.md> --format <markdown|html|pdf> --out-dir .cocoplus/trace/exports
```

PDF requests report renderer availability; Markdown and HTML are local deterministic exports.

## Exit Criteria
- [ ] `$trace build` produces identical `trace.json` on two consecutive runs with no file changes
- [ ] `trace.json` includes the git branch and commit SHA observed during the trace run
- [ ] Modifying `bloom.md` causes `discuss.md`, `spec.md`, `plan.md` to show `stale`
- [ ] `$trace gaps` handles missing section headings gracefully
- [ ] SessionStart surfaces staleness advisory non-blockingly
- [ ] `$trace blast <object>` returns affected functions with dependency type and CocoContract staleness flag, sourced from `snowflake-deps.json`
- [ ] `$trace check --before-change` records the gate event to `lifecycle/audit.md` without blocking the change
- [ ] `$trace health` reports grade inputs and honors `[trace].show_grade = false`
- [ ] `$trace compare` prints blast-radius and health-grade before/after deltas

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Use file timestamps | Timestamps change on git operations without content change — SHA-256 only |
| Mark only the changed node stale | Downstream must also be stale — requirement traceability demands it |
| Block SessionStart until trace runs | Tier 2 async — never blocks the developer prompt |
| Re-run LLM to validate staleness | Staleness is a content-hash comparison — deterministic, no LLM needed |
