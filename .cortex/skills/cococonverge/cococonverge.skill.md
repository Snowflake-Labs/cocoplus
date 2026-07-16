---
name: cococonverge
description: CocoPivot — multi-pod convergence synthesizer. Deterministically deduplicates findings from N parallel pod outputs into one prioritized, coordinated action plan. Invoked via $pivot run/show/status/clear.
version: "1.0.0"
author: sgsshankar
tags:
  - cococonverge
  - cocopivot
  - convergence
  - orchestration
user-invocable: true
blocking: false
---

## Objective

You are executing a CocoPivot command. When N CocoPods inspect the same codebase in parallel, they produce N separate findings lists — often the same underlying issue described three different ways from three different lenses. CocoPivot's discipline is to be the **sole author of `lifecycle/FINDINGS.md`**, so the developer has exactly one authoritative source for what needs addressing and in what order. Without CocoPivot, parallel pods produce parallel noise. With it, they produce coordinated signal.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Commands

### `$pivot run`

<<<<<<< HEAD
Run `node scripts/pivot-merge.js run`. Reads all pod output files produced by the most recent CocoFlow `parallel:` step execution (from `pod-status.json`), applies the three-pass deduplication algorithm below, assigns priority tiers and effort estimates, and writes `lifecycle/FINDINGS.md` and `lifecycle/findings-state.json`. If the upstream flow used `on_partial: skip_partial`, pass `--skip-partial`.

### `$pivot run --since <timestamp>`

Run `node scripts/pivot-merge.js run --since <timestamp>`. Targets only pod outputs that completed after `<timestamp>`. Useful for re-running convergence when additional pods have completed since the last run.

### `$pivot show`

Run `node scripts/pivot-merge.js show`. Display the current `lifecycle/FINDINGS.md`, grouped by priority tier. Include the Coverage Note section if any contributing pod was PARTIAL.

### `$pivot status`

Run `node scripts/pivot-merge.js status`. Summary view: total unique findings, count by priority tier (P1/P2/P3/P4), count by severity (BLOCKING/IMPORTANT/MINOR/ADVISORY), list of contributing pods with completion status (COMPLETE/PARTIAL/ERROR), and timestamp of the last convergence run.

### `$pivot clear`

Run `node scripts/pivot-merge.js clear`. Archive the current `FINDINGS.md` to `lifecycle/findings-archive/<timestamp>-FINDINGS.md` and reset `findings-state.json` in preparation for a new convergence run.

## Deduplication Algorithm (Deterministic — No LLM)

`pivot-merge.js` applies three passes, in order, to all upstream pod outputs:
=======
Use the `cococonverge/pivot-merge` contract in `run` mode. Read all pod output files produced by the most recent CocoFlow `parallel:` step execution (from `pod-status.json`), apply the three-pass deduplication algorithm below, assign priority tiers and effort estimates, and write `lifecycle/FINDINGS.md` and `lifecycle/findings-state.json`. If the upstream flow used `on_partial: skip_partial`, exclude PARTIAL pod outputs.

### `$pivot run --since <timestamp>`

Use the `cococonverge/pivot-merge` contract in `run` mode and target only pod outputs that completed after `<timestamp>`. Useful for re-running convergence when additional pods have completed since the last run.

### `$pivot show`

Display the current `lifecycle/FINDINGS.md`, grouped by priority tier. Include the Coverage Note section if any contributing pod was PARTIAL.

### `$pivot status`

Read `lifecycle/findings-state.json` and display: total unique findings, count by priority tier (P1/P2/P3/P4), count by severity (BLOCKING/IMPORTANT/MINOR/ADVISORY), list of contributing pods with completion status (COMPLETE/PARTIAL/ERROR), and timestamp of the last convergence run.

### `$pivot clear`

Archive the current `FINDINGS.md` to `lifecycle/findings-archive/<timestamp>-FINDINGS.md` and reset `findings-state.json` in preparation for a new convergence run.

## Deduplication Algorithm (Deterministic — No LLM)

The V2-native convergence contract applies three passes, in order, to all upstream pod outputs:
>>>>>>> feature/cocoplus-v2.0.0

**Pass 1 — Same file:line match:** Two findings referencing the same file at the same line number are the same underlying issue. Take the highest severity from contributing sources, keep the most detailed description, cite all contributing pod names and their original finding IDs.

**Pass 2 — Same issue type within the same file:** Two findings from the same file referencing the same issue type (e.g. "SQL injection", "missing null check", "N+1 query pattern") are the same issue even when line numbers differ slightly. Merge into one finding with consolidated citations; keep the description that most precisely localizes the issue.

**Pass 3 — Similar code snippet reference:** Two findings referencing substantially similar code snippets are the same issue described at different levels of specificity. Merge, preferring the more specific description.

Finding IDs (`PIVOT-NNN`) are stable within a session — `PIVOT-001` in `findings-state.json` always corresponds to the same finding in `FINDINGS.md`.

## Priority and Effort Assignment

After deduplication, each merged finding is assigned:

- **Priority tier** (P1–P4, with time horizon) — inherited as the **highest** priority tier among contributing sources
- **Effort estimate** (XS–XL) — inherited as the **largest** effort estimate among contributing sources, since combined remediation may exceed any single source's estimate
- **Severity** — highest among contributing sources

## PARTIAL Source Transparency

When any contributing pod emitted PARTIAL status, `FINDINGS.md`'s header includes:

```
> **Coverage Note:** [pod-name] completed partial checks (skipped: [check-list]). Findings from
> this source may not reflect complete coverage of its declared territory.
```

`$pivot status` also lists PARTIAL sources explicitly.

## Scope Anomaly Detection

Read the `excludes:` frontmatter field from each contributing pod's `.agent.md` definition. If a pod's output contains a finding whose concern class appears in that pod's own `excludes:` list, log a scope anomaly:

```
Pod [name] produced a finding in concern class [class] which appears in its declared
exclusions. Finding excluded from FINDINGS.md; scope anomaly recorded in findings-state.json.
```

The finding is excluded from `FINDINGS.md` but the anomaly itself is recorded in `findings-state.json` for review — this prevents scope accumulation from compounding silently through the convergence step. A pod without any `excludes:` declaration cannot be evaluated for scope discipline, because its boundary is undefined; such pods are recorded as "unscoped" in the convergence report, not silently trusted.

## Output Artifacts

- **`lifecycle/FINDINGS.md`** (committed) — authoritative, human-readable, sorted P1→P4 then by severity within tier. Each finding includes: `PIVOT-NNN` ID, severity, priority tier + time horizon, effort estimate, description, contributing sources with their original finding IDs, file:line reference, and suggested remediation.
- **`lifecycle/findings-state.json`** (gitignored) — machine-readable equivalent for hook consumption and programmatic processing.
- **`lifecycle/findings-archive/`** — historical `FINDINGS.md` versions created by `$pivot clear`.

## Integration with CocoFlow

CocoPivot is the canonical handler for the `converge:` step type. When a flow definition includes `handler: cococonverge`, `$pivot run` is invoked automatically as the fan-in operation once all parallel pods in the preceding `parallel:` step reach terminal status. Manual invocation remains available for ad-hoc multi-pod audit sessions outside a defined CocoFlow.

## Exit Criteria

- `$pivot run` produces `FINDINGS.md` from N pod outputs with zero duplicate entries for identical file:line findings
<<<<<<< HEAD
- `$pivot show`, `$pivot status`, and `$pivot clear` are backed by explicit `pivot-merge.js` subcommands
- PARTIAL-source pods are flagged in the `FINDINGS.md` header, never silently merged as if COMPLETE
- Scope anomalies are detected against each pod's `excludes:` declaration and excluded from `FINDINGS.md`, with the anomaly itself recorded in `findings-state.json`
- `pivot-merge.js` is deterministic — identical inputs always produce identical `FINDINGS.md` and `findings-state.json`
=======
- `$pivot show`, `$pivot status`, and `$pivot clear` use the V2-native convergence contract and committed/ignored artifacts
- PARTIAL-source pods are flagged in the `FINDINGS.md` header, never silently merged as if COMPLETE
- Scope anomalies are detected against each pod's `excludes:` declaration and excluded from `FINDINGS.md`, with the anomaly itself recorded in `findings-state.json`
- The convergence algorithm is deterministic — identical inputs always produce identical `FINDINGS.md` and `findings-state.json`
>>>>>>> feature/cocoplus-v2.0.0
- Merged findings inherit the highest priority tier and largest effort estimate among contributing sources
- `$pivot clear` archives rather than deletes the current `FINDINGS.md`

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Use LLM judgment to decide whether two findings are "close enough" to merge | The three-pass algorithm is deterministic by design — introducing LLM judgment here reintroduces the non-reproducibility CocoPivot exists to eliminate |
| Present a PARTIAL pod's zero findings as equivalent to a COMPLETE pod's zero findings | These represent structurally different confidence levels — presenting them identically is dishonest about coverage |
| Silently drop a scope-anomalous finding without recording it | The anomaly itself is signal — a pod that keeps producing excluded-class findings needs its prompt or tool scope revisited, and that requires a visible record |
| Delete `FINDINGS.md` instead of archiving on `$pivot clear` | Prior convergence runs are historical record — `findings-archive/` preserves them for trend analysis |
