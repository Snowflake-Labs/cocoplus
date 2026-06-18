---
name: lean-review
description: CocoLean diff-scoped over-engineering audit — scans uncommitted git diff and applies five classification tags (delete/stdlib/native/yagni/shrink) to identify unnecessary surface area before commit.
version: "1.0.0"
author: sgsshankar
tags:
  - cocolean
  - complexity-prevention
  - code-review
user-invocable: true
blocking: true
---

## Objective

You are executing `$lean review` — a diff-scoped over-engineering audit. Scan the uncommitted git diff and apply five CocoLean classification tags to each introduced construct. The audit is scoped to the current diff only — not the entire codebase. Feedback must be actionable at the moment of highest receptivity: before the commit.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Run Deterministic Diff Scanner

```
node .cortex/scripts/lean-review.js
```

The script reads `git diff` (unstaged and staged changes), applies AST-level pattern matching, and outputs a JSON finding list. Read the JSON output.

If no uncommitted changes exist, output: "No uncommitted changes found. `$lean review` operates on the current diff — stage or modify files first." Then stop.

## Step 2 — Classify Findings by Tag

Apply the five CocoLean classification tags in severity order:

**Tier 1 — Existence-level (surface first):**

- **`delete`** — Code with no callers, no tests, and no declared future use in `spec.md` or `discuss.md`. It should not exist yet. Severity: `blocking` if it touches a trust boundary; `important` otherwise.

- **`yagni`** — Abstractions, configuration flags, extension points, or generalization layers added speculatively for requirements not in the current spec. "You Aren't Gonna Need It." Severity: `nit` if no security risk; `important` if it expands the attack surface or adds untested code paths.

**Tier 2 — Correctness-level (surface second):**

- **`stdlib`** — Logic that reimplements functionality already present in Snowflake built-in functions or standard SQL. Include the specific replacement construct in the finding. Severity: `important`.

- **`native`** — A custom AI function performing a task more correctly expressed as a native Snowflake object (materialized view, stream, task, dynamic table, policy, alert). Include the recommended native object type. Severity: `important`.

**Tier 3 — Style-level (surface last):**

- **`shrink`** — Functions performing one logical operation expressed in more code than the operation requires. Implementation is correct but verbose beyond the need. Severity: `nit`.

## Step 3 — Surface Findings

Display findings in severity order (Tier 1 first, Tier 3 last):

```
CocoLean Review — [N] findings in current diff

[delete] classify_v2.sql:47 — IMPORTANT
  Function `classify_sentiment_v2` has no callers in this diff and no
  reference in spec.md. Does not belong in this commit.
  Action: Remove or move to a separate branch.

[yagni] pipeline.sql:23 — NIT
  `enable_multi_model` flag has no corresponding requirement in spec.md.
  Current spec defines a single-model classifier.
  Action: Remove flag; reintroduce if spec changes.

[stdlib] extract_json.sql:12 — IMPORTANT
  Manual JSON key extraction reimplements Snowflake's GET_PATH() built-in.
  Replacement: GET_PATH(obj, 'key.subkey')
  Action: Replace implementation with built-in.

[native] sentiment_monitor.sql:88 — IMPORTANT
  Alert logic implemented as a scheduled AI_COMPLETE call in a stored procedure.
  More correctly expressed as a Snowflake ALERT object with a CONDITION query.
  Action: Convert to native ALERT.

[shrink] format_output.sql:34 — NIT
  Twelve-line CASE expression produces three possible string outputs.
  IFF() or a two-branch CASE covers the same logic in three lines.
  Action: Simplify to IFF(condition, 'A', IFF(condition2, 'B', 'C')).
```

If no findings: "CocoLean Review — clean diff. No over-engineering findings in current changes."

## Step 4 — Carve-Out Check

Before displaying any finding, verify it does not target a carve-out construct. If the flagged code is:
- A trust boundary validation
- A data loss prevention mechanism
- A security control
- A regulatory compliance requirement
- Error handling preventing silent data corruption
- A capability explicitly requested in `spec.md`

→ Drop the finding silently. Carve-outs are never surfaced as CocoLean findings.

## Step 5 — Mode-Dependent Behavior

Read `.cocoplus/modes/lean.mode`:

- **`lite`** — Display findings as advisory. Developer may proceed to commit regardless.
- **`full`** — Display findings. Recommend addressing Tier 1 (`delete`, `yagni`) before committing. Tier 2 and 3 are advisory.
- **`ultra`** — Any `blocking` finding prevents commit until resolved. `important` findings require explicit acknowledgment ("I understand this finding and am committing anyway: [reason]").

## Exit Criteria

- `lean-review.js` executed against current git diff
- Findings surfaced in severity order (Tier 1 → Tier 2 → Tier 3)
- Carve-out constructs excluded from findings
- Mode-appropriate enforcement applied

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Run on the full codebase, not just the diff | Diff scope is intentional — whole-codebase audit produces noise; diff scope produces actionable signal at commit time |
| Flag security validation as `delete` because it has no callers yet | Carve-outs apply — trust boundary code is always exempt |
| Skip `stdlib` findings because the reimplementation "works" | Correct but redundant code is still unnecessary complexity — replace with the built-in |
