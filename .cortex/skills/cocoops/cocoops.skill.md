---
name: cocoops
description: CocoOps — delivery intelligence dashboard. Dispatches $ops sub-commands for DORA metrics, sprint health, time-aware suggestions, and demo mode. Invoked via $ops [dora|sprint|suggest|demo|refresh].
version: "1.0.0"
author: CocoPlus
tags:
  - cocoops
  - delivery-intelligence
  - dora-metrics
user-invocable: true
blocking: false
---

## Objective

You are the CocoOps dispatch router. Route `$ops` sub-commands to the appropriate CocoOps sub-skills.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Routing Table

| Command | Sub-skill | Description |
|---------|-----------|-------------|
| `$ops dora` | `ops-dora.skill.md` | DORA-adapted delivery metrics |
| `$ops sprint` | `ops-sprint.skill.md` | Current sprint health |
| `$ops suggest` | `ops-suggest.skill.md` | Time-aware operational suggestions |
| `$ops demo` | `ops-demo.skill.md` | Activate demo mode |
| `$ops refresh` | `ops-dora.skill.md` | Re-run DORA computation and update snapshot |
| `$ops` (no args) | Show dashboard summary | Display last dora-snapshot.json summary |

## Default View (no args)

If invoked with no sub-command, display a brief status dashboard:

```
CocoOps — <project> — <date>

Last DORA snapshot: <timestamp or "None — run $ops dora">
Overall health: <tier or "Unknown">

Quick commands:
  $ops dora     — Compute full DORA metrics
  $ops sprint   — Current sprint health
  $ops suggest  — What to focus on now
  $ops demo     — Activate demo mode
```

Read `.cocoplus/ops/dora-snapshot.json` for the summary data. If absent, suggest running `$ops dora`.

## Exit Criteria

- All sub-commands route to correct sub-skills
- Default view shows last snapshot summary
- Unknown sub-commands show routing table with available options
