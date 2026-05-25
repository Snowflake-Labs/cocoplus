---
name: ops-demo
description: CocoOps demo mode activator — populates .cocoplus/ops/demo/ with realistic mock data and sets cocoplus.toml [demo] enabled = true. Invoked via $ops demo.
version: "1.0.0"
author: CocoPlus
tags:
  - cocoops
  - demo-mode
  - delivery-intelligence
user-invocable: true
blocking: false
---

## Objective

Activate CocoOps demo mode with a realistic mock dataset so evaluators can explore DORA metrics and sprint health without production Snowflake access.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Check Current Demo Status

Read `cocoplus.toml` and check `[demo] enabled`. If already `true`, output:

```
CocoOps demo mode is already active.
Run $ops dora to view the demo DORA report.
Run $ops demo --reset to regenerate the demo dataset.
Run $ops demo --off to deactivate demo mode.
```

Then stop (unless `--reset` flag provided).

## Step 2 — Create Demo Dataset Directory

Ensure `.cocoplus/ops/demo/` exists. Create it if absent.

## Step 3 — Write Demo Metrics Dataset

Write `.cocoplus/ops/demo/metrics.json` with a realistic 30-day dataset showing DORA metric progression. The dataset must:

- Include representative pipeline names (not generic "pipeline_1" — use realistic names like `stg_orders_load`, `int_customer_metrics`, `mart_revenue_daily`, `ml_churn_predict`)
- Show a credible improvement arc: early period has higher failure rate and recovery times; later period shows improvement
- Cover all four DORA metrics with plausible values for a data engineering team at High tier (not Elite — believable, not perfect)

```json
{
  "dataset_version": "1.0",
  "period_days": 30,
  "generated_at": "<ISO timestamp>",
  "metrics": {
    "run_frequency": {
      "value": 1.4,
      "unit": "per_day",
      "tier": "High",
      "source": "demo"
    },
    "lead_time": {
      "value": 18.5,
      "unit": "hours",
      "tier": "High",
      "source": "demo"
    },
    "recovery_time": {
      "value": 210,
      "unit": "minutes",
      "tier": "High",
      "source": "demo"
    },
    "quality_failure_rate": {
      "value": 7.2,
      "unit": "percent",
      "tier": "High",
      "source": "demo"
    }
  },
  "pipeline_signals": [
    {
      "name": "stg_orders_load",
      "runs": 38,
      "failures": 3,
      "avg_lead_time_hours": 14.2,
      "last_failure": "2024-01-18T03:22:00Z",
      "recovery_minutes": 85
    },
    {
      "name": "int_customer_metrics",
      "runs": 30,
      "failures": 4,
      "avg_lead_time_hours": 22.1,
      "last_failure": "2024-01-21T07:45:00Z",
      "recovery_minutes": 310
    },
    {
      "name": "mart_revenue_daily",
      "runs": 28,
      "failures": 1,
      "avg_lead_time_hours": 19.8,
      "last_failure": "2024-01-09T23:11:00Z",
      "recovery_minutes": 42
    },
    {
      "name": "ml_churn_predict",
      "runs": 14,
      "failures": 4,
      "avg_lead_time_hours": 31.4,
      "last_failure": "2024-01-23T11:30:00Z",
      "recovery_minutes": 480
    }
  ],
  "git_signals": {
    "commits_14d": 18,
    "pipeline_prs": 6
  },
  "sprint": {
    "start": "2024-01-15",
    "end": "2024-01-29",
    "velocity_units": 9,
    "daily_burn_rate": 0.9,
    "predicted_final_velocity": 12.6
  },
  "overall_health": "High"
}
```

## Step 4 — Write .gitignore Entry

Ensure `.cocoplus/ops/demo/` is gitignored. Append to `.cocoplus/.gitignore` if it exists, or note this in output:

```
# CocoOps demo data — not committed
ops/demo/
```

## Step 5 — Activate Demo Mode in cocoplus.toml

Read `cocoplus.toml`. If absent, create a minimal one. Set or add:

```toml
[demo]
enabled = true
activated_at = "<ISO timestamp>"
dataset = ".cocoplus/ops/demo/metrics.json"
```

Write the updated `cocoplus.toml`.

## Step 6 — Confirm Activation

Output:

```
CocoOps demo mode activated.

Dataset: .cocoplus/ops/demo/metrics.json
Pipelines: stg_orders_load, int_customer_metrics, mart_revenue_daily, ml_churn_predict
Overall health tier: High

Try:
  $ops dora     — View DORA metrics report (uses demo data)
  $ops sprint   — View sprint health (uses demo data)
  $ops suggest  — Time-aware operational suggestions

Deactivate with: $ops demo --off
```

## Flag: --off

If invoked as `$ops demo --off`:
1. Read `cocoplus.toml` and set `[demo] enabled = false`
2. Write updated `cocoplus.toml`
3. Output: "CocoOps demo mode deactivated. $ops dora will now use live data sources."

## Flag: --reset

If invoked as `$ops demo --reset`:
1. Regenerate `.cocoplus/ops/demo/metrics.json` (same structure, updated `generated_at` timestamp)
2. Output: "Demo dataset regenerated."

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Use trivially minimal demo data | Demo is a first-class feature for evaluators — minimal data defeats its purpose |
| Use generic pipeline names | Realistic names are required so evaluators can imagine their own pipelines |
| Skip gitignore entry | Demo data must never pollute team repos — production teams will reject the tool |
| Let demo mode persist silently | User must know demo is active — always show `[DEMO]` label in $ops output when enabled |

## Exit Criteria

- `.cocoplus/ops/demo/metrics.json` written with 4 named pipelines and realistic High-tier values
- `cocoplus.toml` updated with `[demo] enabled = true`
- `.gitignore` entry present for `ops/demo/`
- Activation confirmation displayed with next-step commands
