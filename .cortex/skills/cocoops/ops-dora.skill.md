---
name: ops-dora
description: CocoOps DORA metrics — computes four DORA-adapted delivery metrics from Snowflake task history and git log. Invoked via $ops dora.
version: "1.0.0"
author: CocoPlus
tags:
  - cocoops
  - dora-metrics
  - delivery-intelligence
user-invocable: true
blocking: false
---

## Objective

Compute the four DORA-adapted CocoOps metrics and produce a delivery intelligence report.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Check Demo Mode

Read `cocoplus.toml` if it exists and check `[demo] enabled`. If demo mode is active, read data from `.cocoplus/ops/demo/` instead of production sources.

## Step 2 — Run Deterministic Metrics Computation

Execute `scripts/dora-metrics.js`:

```
node .cortex/scripts/dora-metrics.js
```

This script reads Snowflake task history (via `SnowflakeSqlExecute`) and `git log` output, computes the four metrics, and writes `.cocoplus/ops/dora-snapshot.json`.

If the script fails (Snowflake unavailable, no git history), output: "CocoOps: unable to compute metrics — [reason]. Run `$ops demo` to activate demo mode for evaluation." Then stop.

## Step 3 — Read Snapshot

Read `.cocoplus/ops/dora-snapshot.json` for the computed metrics.

## Step 4 — Spawn Haiku Narrative Synthesis

Pass the pre-computed metrics snapshot to a Haiku sub-agent with this mandate:

"Read the DORA metrics snapshot and produce a narrative report. Every statement MUST cite specific pipeline names, dates, or quantities from the data — no vague generalities. The report must:
1. State the overall health tier (Elite/High/Medium/Low)
2. Highlight notable signals with specific named pipelines and dates
3. Identify the top contributor to each below-tier metric
4. Suggest 2-3 prioritized actions based on the data

Do not produce: 'your pipelines may be slow' — instead produce: 'pipeline X has p95 time of Y hours over last Z days'."

## Step 5 — Write and Commit

Write insights to `.cocoplus/ops/dora-insights-<YYYY-MM-DD>.md`. Commit both `dora-snapshot.json` and the insights file only if either file has changed since the last commit (use `git diff --quiet` to check before committing). If neither file changed, skip the commit and note: "Snapshot unchanged since last run — no commit needed."

## Step 6 — Display Report

```
CocoOps DORA Report — <project> — <date>

Pipeline Run Frequency:    <value> / day   [<tier> tier]
Data Availability Lead:    <value> hours   [<tier> tier]
Failure Recovery Time:     <value> min     [<tier> tier]
Data Quality Failure Rate: <value>%        [<tier> tier]

Overall health: <ELITE | HIGH | MEDIUM | LOW>

Notable signals:
• <specific pipeline name>: <specific finding with numbers>
• <specific signal with date reference>
```

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Let LLM compute the metrics | Metrics must be deterministic — same inputs always produce same numbers |
| Omit pipeline names from narrative | Vague generalities are useless — citations are a constraint, not a preference |
| Skip committing dora-snapshot.json | Snapshot is a team artifact — it must be in git for team members to see it |

## Exit Criteria

- `dora-metrics.js` runs before any LLM work
- Haiku narrative cites specific pipeline names, dates, quantities
- `dora-snapshot.json` committed to git
- Insights file written to date-stamped path
