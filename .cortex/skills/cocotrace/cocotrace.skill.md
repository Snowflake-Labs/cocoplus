---
name: cocotrace
description: Build and query the SHA-256 requirements-to-implementation traceability graph across lifecycle artifacts
version: "1.1.0"
author: sgsshankar
tags: [traceability, quality, sha256, audit, lifecycle]
commands: ["$trace build", "$trace gaps", "$trace show", "$trace blast", "$trace check"]
user-invocable: true
---

# CocoTrace — Requirements-to-Implementation Traceability

## Overview
CocoTrace maintains a directed dependency graph: `bloom.md → discuss.md → spec.md → plan.md → build-output → eval-results`. SHA-256 content hashes detect genuine changes (not timestamp drift from git operations). Staleness propagates downstream from any changed node.

**Why SHA-256, not timestamps:** Rebase and cherry-pick change file mtimes without changing content. SHA-256 only signals real changes.

## Commands

### `$trace build`

1. Run `node scripts/trace-check.js` (deterministic, no LLM, Tier 2 async)
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

1. Run `node scripts/trace-blast.js --object "<object>"`. The script reads `snowflake-deps.json` (the reverse index of function → object dependencies, maintained by `$trace sync`) and returns every function that depends on `<object>`.
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

`snowflake-deps.json` is committed to the CocoPod repository and updated by `$trace sync` (extends `trace-check.js`) whenever a build artifact changes — it records, per function, the objects read, the objects written, and the Cortex API features depended on.

### `$trace check --before-change "<change description>"`

A pre-change impact gate, not a permission gate — it does not block the change. Runs the blast radius computation for the objects implied by `<change description>`, generates a human-readable impact summary, and records the gate event in `lifecycle/audit.md` via CocoAudit (proving blast radius was assessed before the change was applied). Output the same blast radius table as `$trace blast`, prefixed with the change description and an audit confirmation line: "Recorded to lifecycle/audit.md as a pre-change impact assessment."

## SessionStart Integration
`trace-check.js` runs at SessionStart (Tier 2 async — non-blocking). If any artifact is stale, a non-blocking advisory appears:

```
⚠️  CocoTrace: discuss.md changed since spec.md was last traced.
    Run `$trace build` to update the traceability graph.
```

## Key Constraints
- `trace-check.js` is DETERMINISTIC — no LLM, no inference
- SHA-256 computed from file CONTENT, not metadata
- Staleness propagates in `walk_order` — downstream always stale if upstream changed
- SessionStart advisory is NON-BLOCKING — never prevents session start
- `lifecycle/trace.json` committed to git — team-visible

## Git Behavior
`lifecycle/trace.json` committed after `$trace build`: `chore(cocotrace): update artifact traceability graph`

## Exit Criteria
- [ ] `$trace build` produces identical `trace.json` on two consecutive runs with no file changes
- [ ] Modifying `bloom.md` causes `discuss.md`, `spec.md`, `plan.md` to show `stale`
- [ ] `$trace gaps` handles missing section headings gracefully
- [ ] SessionStart surfaces staleness advisory non-blockingly
- [ ] `$trace blast <object>` returns affected functions with dependency type and CocoContract staleness flag, sourced from `snowflake-deps.json`
- [ ] `$trace check --before-change` records the gate event to `lifecycle/audit.md` without blocking the change

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Use file timestamps | Timestamps change on git operations without content change — SHA-256 only |
| Mark only the changed node stale | Downstream must also be stale — requirement traceability demands it |
| Block SessionStart until trace runs | Tier 2 async — never blocks the developer prompt |
| Re-run LLM to validate staleness | Staleness is a content-hash comparison — deterministic, no LLM needed |
