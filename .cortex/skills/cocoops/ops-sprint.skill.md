---
name: ops-sprint
description: CocoOps sprint health — computes story velocity, burndown, and completion prediction from git log and sprint window config. Invoked via $ops sprint.
version: "1.0.0"
author: CocoPlus
tags:
  - cocoops
  - sprint-health
  - delivery-intelligence
user-invocable: true
blocking: false
---

## Objective

Compute current sprint health: velocity, burndown, and completion prediction.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Read Sprint Window Config

Read `cocoplus.toml` and extract `[sprint]` section:
- `start_date` — ISO date when current sprint began
- `end_date` — ISO date when current sprint ends (optional; compute 2-week default if absent)
- `feature_prefix` — commit tag prefix identifying feature work (default: `feat`)
- `scope` — optional list of pipeline/module names to scope analysis

If `cocoplus.toml` is absent or `[sprint]` section is missing, use defaults:
- `start_date`: 14 days ago
- `end_date`: today
- `feature_prefix`: `feat`

## Step 2 — Compute Sprint Metrics Deterministically

Run:

```
node .cortex/scripts/dora-metrics.js
```

Then compute sprint-specific metrics from git log directly. Extract:

**Story Velocity:**
```
git log --oneline --since="<start_date>" --until="<end_date>" --grep="^feat"
```
Count commits matching the feature prefix. Each qualifying commit = 1 velocity unit.

**Pipeline PRs (breadth signal):**
```
git log --oneline --since="<start_date>" -- "*.sql" "*.py"
```
Count pipeline-touching commits as proxy for pipeline tasks completed.

**Daily Burn Rate:**
```
velocity_units / elapsed_sprint_days
```

**Completion Prediction:**
```
remaining_days = (end_date - today) in days
projected_additional = daily_burn_rate × remaining_days
predicted_final = velocity_units + projected_additional
```

Write results to `.cocoplus/ops/sprint-health.json` (atomic write via tmp→rename):

```json
{
  "computed_at": "<ISO timestamp>",
  "sprint_window": {
    "start": "<start_date>",
    "end": "<end_date>",
    "elapsed_days": <N>,
    "remaining_days": <N>
  },
  "metrics": {
    "velocity_units": <N>,
    "pipeline_commits": <N>,
    "daily_burn_rate": <float>,
    "predicted_final_velocity": <float>
  },
  "signals": {
    "commits_in_window": <N>,
    "feature_prefix_used": "<prefix>"
  }
}
```

## Step 3 — Spawn Haiku for Sprint Narrative

Pass `sprint-health.json` to a Haiku sub-agent with this mandate:

"Read the sprint health JSON and produce a concise narrative. Every statement MUST cite specific quantities or dates from the data. The narrative must:
1. State current velocity and daily burn rate
2. Project sprint completion based on trend
3. Identify whether pace is ahead, on track, or at risk
4. Suggest 1-2 prioritized actions if at risk

Do not produce vague generalities — cite numbers."

## Step 4 — Commit sprint-health.json

Commit `.cocoplus/ops/sprint-health.json` to git only if the file has changed since the last commit (use `git diff --quiet .cocoplus/ops/sprint-health.json` to check). If unchanged, skip the commit and note: "Snapshot unchanged since last run — no commit needed."

```
git add .cocoplus/ops/sprint-health.json
git commit -m "ops(sprint): update sprint health snapshot <YYYY-MM-DD>"
```

## Step 5 — Display Sprint Health Report

```
CocoOps Sprint Health — <project> — <date>

Sprint Window:   <start_date> → <end_date>  (<elapsed> / <total> days)

Velocity:        <velocity_units> units  (<daily_burn_rate>/day)
Pipeline PRs:    <pipeline_commits> commits
Completion:      Projected <predicted_final_velocity> units by <end_date>

Status: <ON TRACK | AHEAD | AT RISK>

<Haiku narrative — specific numbers, no vague generalities>

Snapshot: .cocoplus/ops/sprint-health.json
```

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Let LLM compute velocity | Metrics must be deterministic — git log counts are a script output, not inference |
| Omit sprint window from config | Without a defined window, velocity numbers are meaningless |
| Skip committing sprint-health.json | Sprint snapshot is a team artifact — teammates must see the same numbers |
| Invent projected velocity without daily burn rate | Projection must use actual measured burn rate, not a guess |

## Exit Criteria

- Sprint window read from `cocoplus.toml` or defaults applied
- `velocity_units`, `daily_burn_rate`, `predicted_final_velocity` computed from git log
- `sprint-health.json` written and committed
- Haiku narrative cites specific numbers
- Report displayed in standard CocoOps format
