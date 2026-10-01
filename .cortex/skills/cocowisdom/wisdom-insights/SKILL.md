---
name: wisdom-insights
description: CocoWisdom insights — invokes Haiku synthesis to produce a structured analysis of project rejection patterns. Carries forward prior thesis and extends it incrementally — never replaces. Writes date-stamped insights file. Invoked via $wisdom insights.
version: "1.1.0"
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

## Step 1 — Read Rejections and Prior Thesis

Read `.cocoplus/wisdom/rejections.jsonl`. If absent or fewer than 3 records, output: "Not enough rejection data for insights (minimum 3 records needed). Current count: <n>." Then stop.

**Load prior thesis (carry-forward):** Glob for `insights-*.md` files in `.cocoplus/wisdom/`. If any exist, read the most recent one (by filename date). Extract the `## Thesis` section. Store as `prior_thesis`. If no prior insights file exists, `prior_thesis` is null (first-run case).

## Step 2 — Prepare Analytics Data

Compute the following deterministically before invoking any sub-agent:
- Total records by gate
- Total records by dimension
- Records by dimension for last 30 days vs prior 30 days (trend per dimension)
- Sessions with rejections vs sessions without (from distinct session_ids in record set and recent sessions)
- Most improved dimension (highest reduction in last 30 days)
- Most persistent dimension (most records, no reduction)

## Step 3 — Spawn Haiku Synthesis Sub-Agent

Pass the pre-computed analytics data AND `prior_thesis` to a Haiku sub-agent with this mandate:

"Read the provided rejection analytics data and produce a structured insights report. The report must:
1. Name the most frequently blocked dimension and explain the pattern from the evidence (do not speculate — cite actual rejection reasons)
2. Describe the quality trend (improving/degrading/stable) with specific session counts
3. Produce a per-dimension health table
4. Provide 2-3 actionable recommendations based on the patterns observed

**Carry-forward thesis rule (mandatory):**
- If `prior_thesis` is provided: your `## Thesis` section MUST begin with the prior thesis verbatim, then add a `### New Evidence` subsection that extends or refines it based on the new records. Never replace the prior thesis — only extend it.
- If `prior_thesis` is null (first run): write a fresh `## Thesis` section.
- The thesis is the project's accumulated quality narrative. It must grow incrementally across insight runs, not reset.

Do not produce vague generalities. Every statement must be supported by the analytics data provided."

## Step 4 — Write Insights File

Write the sub-agent output to `.cocoplus/wisdom/insights-<YYYY-MM-DD>.md` with header:

```markdown
# CocoWisdom Insights — <date>
Generated: <ISO8601 timestamp>
Records analyzed: <total count>
Prior thesis carried from: <prior insights filename, or "none — first run">

## Thesis
[Prior thesis verbatim (if any), followed by ### New Evidence subsection]

## Dimension Health
[per-dimension health table]

## Trend
[quality trend narrative with session counts]

## Recommendations
[2-3 actionable items]
```

**Invariant:** Never overwrite an existing `insights-<YYYY-MM-DD>.md` file if one already exists for today. If a same-day file exists, write to `insights-<YYYY-MM-DD>-<HHmmss>.md` instead.

## Step 5 — Output Confirmation

Display: "CocoWisdom insights written to `.cocoplus/wisdom/insights-<date>.md`"
Show the first 20 lines of the insights file as a preview.

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Write insights to stdout only | Insights are a project artifact — the file is the persistent record, stdout is transient |
| Skip sub-agent for small datasets | Synthesis is only meaningful when patterns exist; minimum record count gate prevents meaningless output |
| Let LLM compute the statistics | Statistics are deterministic — compute them in skill, let LLM interpret them |
| Replace prior thesis with new narrative | Thesis is the accumulated quality story — replacing destroys institutional memory; always extend |
| Skip prior thesis load when file is large | Prior thesis is one section of one file — read cost is negligible vs. the memory lost by skipping |

## Exit Criteria

- Insights file written to date-stamped path in `.cocoplus/wisdom/`
- File includes pre-computed statistics and narrative interpretation
- `## Thesis` section present: extends prior thesis if one exists, or fresh thesis on first run
- Developer sees preview of insights file
