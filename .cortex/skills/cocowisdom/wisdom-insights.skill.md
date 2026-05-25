---
name: wisdom-insights
description: CocoWisdom insights — invokes Haiku synthesis to produce a structured analysis of project rejection patterns. Writes date-stamped insights file. Invoked via $wisdom insights.
version: "1.0.0"
author: CocoPlus
tags:
  - cocowisdom
  - institutional-memory
  - analytics
user-invocable: true
blocking: false
---

## Objective

Generate a structured insights report from CocoWisdom rejection history using a Haiku sub-agent synthesis.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Read Rejections

Read `.cocoplus/wisdom/rejections.jsonl`. If absent or fewer than 3 records, output: "Not enough rejection data for insights (minimum 3 records needed). Current count: <n>." Then stop.

## Step 2 — Prepare Analytics Data

Compute the following deterministically before invoking any sub-agent:
- Total records by gate
- Total records by dimension
- Records by dimension for last 30 days vs prior 30 days (trend per dimension)
- Sessions with rejections vs sessions without (from distinct session_ids in record set and recent sessions)
- Most improved dimension (highest reduction in last 30 days)
- Most persistent dimension (most records, no reduction)

## Step 3 — Spawn Haiku Synthesis Sub-Agent

Pass the pre-computed analytics data to a Haiku sub-agent with this mandate:

"Read the provided rejection analytics data and produce a structured insights report. The report must:
1. Name the most frequently blocked dimension and explain the pattern from the evidence (do not speculate — cite actual rejection reasons)
2. Describe the quality trend (improving/degrading/stable) with specific session counts
3. Produce a per-dimension health table
4. Provide 2-3 actionable recommendations based on the patterns observed

Do not produce vague generalities. Every statement must be supported by the analytics data provided."

## Step 4 — Write Insights File

Write the sub-agent output to `.cocoplus/wisdom/insights-<YYYY-MM-DD>.md` with header:

```markdown
# CocoWisdom Insights — <date>
Generated: <ISO8601 timestamp>
Records analyzed: <total count>
```

## Step 5 — Output Confirmation

Display: "CocoWisdom insights written to `.cocoplus/wisdom/insights-<date>.md`"
Show the first 20 lines of the insights file as a preview.

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Write insights to stdout only | Insights are a project artifact — the file is the persistent record, stdout is transient |
| Skip sub-agent for small datasets | Synthesis is only meaningful when patterns exist; minimum record count gate prevents meaningless output |
| Let LLM compute the statistics | Statistics are deterministic — compute them in skill, let LLM interpret them |

## Exit Criteria

- Insights file written to date-stamped path in `.cocoplus/wisdom/`
- File includes pre-computed statistics and narrative interpretation
- Developer sees preview of insights file
