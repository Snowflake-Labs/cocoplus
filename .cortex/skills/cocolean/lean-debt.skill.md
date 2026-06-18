---
name: lean-debt
description: CocoLean shortcut debt ledger — harvests cocoplus: comment markers across the CocoPod and produces a ranked deferral report sorted by ceiling imminence and age.
version: "1.0.0"
author: sgsshankar
tags:
  - cocolean
  - technical-debt
  - delivery-discipline
user-invocable: true
blocking: true
---

## Objective

You are executing `$lean debt` — the CocoLean shortcut debt ledger. Harvest all `cocoplus:` comment markers across the CocoPod, assess ceiling imminence, and produce a ranked deferral report. Run this before sprint planning and before any release gate.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Run Deterministic Marker Harvest

```
node scripts/lean-debt.js
```

The script:
1. Scans all `.sql`, `.js`, `.md`, `.yaml`, `.json` files in the CocoPod for `cocoplus:` comment markers
2. Extracts the three required fields from each marker: **what was simplified**, **ceiling condition**, **upgrade trigger**
3. Calculates ceiling imminence from current project metrics (from `dora-snapshot.json`, `flow.json`, `meta.json`)
4. Outputs a JSON array of debt records sorted by `(ceiling_imminence × days_since_annotation)`

Read the JSON output.

## Step 2 — The cocoplus: Comment Protocol

A valid `cocoplus:` marker looks like this:

```sql
-- cocoplus: simplified=single-warehouse routing; ceiling=will fail when concurrent agent count >20; trigger=when $build spawns >20 agents in one run
```

```javascript
// cocoplus: simplified=linear scan for seed matching; ceiling=scan time exceeds 5s above 500 seeds; trigger=when $seed list reports >500 entries
```

Three required fields (pipe-delimited or semicolon-delimited):
- `simplified=` — one sentence describing the shortcut taken and why
- `ceiling=` — the condition under which this shortcut fails or requires rework
- `trigger=` — the specific event that should prompt addressing the ceiling

Markers missing any required field are reported as malformed but not blocked.

## Step 3 — Produce Ranked Deferral Report

Write the report to `.cocoplus/lifecycle/lean-debt.md` and display a summary:

```markdown
# CocoLean Debt Ledger
Generated: [ISO 8601 timestamp]
CocoPod: [project name from meta.json]

## Summary
Total markers: [N]
High imminence (address this sprint): [N]
Medium imminence (address this quarter): [N]
Low imminence (monitor): [N]
Malformed markers (missing fields): [N]

---

## High Imminence

### [1] scripts/session-start.js:47
**Simplified:** Single-threaded seed evaluation — evaluates all seeds synchronously on session start
**Ceiling:** Session start latency exceeds 500ms when seed count exceeds 200
**Trigger:** When `$seed list` reports more than 200 entries
**Age:** 43 days since annotation
**Ceiling Imminence:** HIGH — current seed count: 187 (94% of ceiling)
**Recommended Action:** Migrate seed evaluation to async Tier 2 pattern before next sprint

---

## Medium Imminence

### [2] skills/cocoflow/flow-run.skill.md:23
**Simplified:** In-memory stage dependency graph — rebuilt from flow.json on every $flow run
**Ceiling:** Rebuild time exceeds 2s for pipelines with >50 stages
**Trigger:** When any flow.json exceeds 50 stages
**Age:** 12 days since annotation
**Ceiling Imminence:** MEDIUM — current max stage count: 18 (36% of ceiling)

---

## Low Imminence

[remaining entries]

---

## Malformed Markers

[file:line] — missing field: [field name]
```

## Step 4 — Commit the Report

Create git commit:
```
chore(lean): update shortcut debt ledger [timestamp]
```

## Step 5 — LLM Summary Layer

After the deterministic harvest, use Haiku to generate a one-paragraph narrative assessment:
- Which debt items represent the most systemic risk?
- Are there patterns in the type of shortcuts taken (all performance shortcuts? all scale shortcuts?)
- What does the age distribution suggest about the team's debt repayment cadence?

Append this narrative to the end of `lean-debt.md` under `## Narrative Assessment`.

## Exit Criteria

- `lean-debt.js` executed across full CocoPod
- All `cocoplus:` markers harvested and classified by imminence
- Report ranked by `(ceiling_imminence × days_since_annotation)`
- Report written to `.cocoplus/lifecycle/lean-debt.md` and committed
- Malformed markers surfaced without blocking
- Haiku narrative assessment appended

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Condemn shortcuts with HIGH imminence as mistakes | The ledger records reasonable decisions at the time — the shortcut was right when made; only the ceiling date has changed |
| Skip the report if the debt count is low | Zero markers may mean no shortcuts were taken, or may mean `cocoplus:` protocol was not followed — surface which it is |
| Omit the LLM narrative because the deterministic output is sufficient | The deterministic output ranks by formula; the narrative identifies systemic patterns the formula cannot see |
