---
name: wisdom
description: CocoWisdom — displays project quality rejection history summary. Shows total rejection count, most frequent gate, most blocked dimension, last rejection, and quality trend. Invoked via $wisdom.
version: "1.0.0"
author: CocoPlus
tags:
  - cocowisdom
  - institutional-memory
  - quality-gate
user-invocable: true
blocking: false
---

## Objective

Display a CocoWisdom status summary for the current project.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Read Rejections Store

Read `.cocoplus/wisdom/rejections.jsonl`. If it does not exist or is empty, output:

```
CocoWisdom — No rejection records yet.
Quality gates have not produced any BLOCKED outcomes in this project.
Run $sentinel <file> or $secondeye to begin evaluating artifacts.
```
Then stop.

## Step 2 — Compute Summary Statistics

Parse all JSONL records. Compute:
- Total record count (excluding `type: "retraction"` records)
- Count by gate: secondeye, sentinel, da_critic
- Most frequent gate (highest count)
- Count by dimension across all gates
- Most blocked dimension (highest count)
- Most recent record by timestamp
- Sessions in last 8: count records from last 8 distinct `session_id` values — if count is 0, trend is "Improving"

## Step 3 — Output Summary

```
CocoWisdom — Project: <project name from .cocoplus/ or directory name>
Total rejection records: <count>
Most frequent gate: <gate> (<count> records)
Most blocked dimension: <dimension> (<count> records)
Last rejection: <date> | <gate> | <dimension>
Quality trend: <Improving (no rejection in last 8 sessions) | Active (<count> in last 8 sessions)>
```

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show "Improving" when only a few sessions exist | Trend requires 8 distinct sessions — fewer sessions cannot establish a pattern |
| Skip reading rejections.jsonl when file is large | The quality trend depends on the last 8 sessions — truncating the read produces wrong counts |

## Exit Criteria

- Summary displays correctly even if only 1 record exists
- Trend shows "Improving" only when zero rejections in last 8 distinct sessions
