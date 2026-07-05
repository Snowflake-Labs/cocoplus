---
name: wisdom
description: CocoWisdom — displays project quality rejection history summary. Shows total rejection count, most frequent gate, most blocked dimension, last rejection, and quality trend. Invoked via $wisdom.
version: "1.1.0"
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

## `$wisdom route` — Correction Routing (Feature 37 Enhancement)

Routes CocoCupper's auto-captured corrections (`.cocoplus/cupper/auto-captured.json`) to proposed skill-file edits, closing the loop between "the developer corrected the agent" and "the skill that caused it gets fixed."

1. Run `node scripts/wisdom-route.js`. It reads `.cocoplus/cupper/auto-captured.json` entries that carry a `skill_context` field, groups them by skill file, and applies a routing classification per group:
   - **incorrect-behavior** — the skill's instructions produced an action the developer reversed
   - **missing-variant** — the correction asks for an option or mode the skill doesn't support
   - **agent-misapplication** — the skill or persona was invoked in a context it doesn't fit
   
   This classification may invoke Haiku (Tier 3, async) since it requires judging correction intent — unlike CocoCupper's Tier 1 capture, which is pure regex.

2. For each group, `wisdom-route.js` generates a proposed edit (the specific skill section and suggested change) but does not apply it.

3. Present each proposed edit to the developer for explicit confirmation:

   ```
   CocoWisdom Route — [skill-file].skill.md
   Routing: incorrect-behavior (3 corrections)
   Proposed edit: [section] — [specific change]

   Apply this edit? (yes/no)
   ```

4. **The routing workflow requires explicit developer confirmation before any file is modified.** No proposed edit is ever applied automatically, regardless of how many corrections support it.

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show "Improving" when only a few sessions exist | Trend requires 8 distinct sessions — fewer sessions cannot establish a pattern |
| Skip reading rejections.jsonl when file is large | The quality trend depends on the last 8 sessions — truncating the read produces wrong counts |
| Auto-apply a routed edit when many corrections agree | Volume of corrections is evidence for review, not authorization to skip developer confirmation — the workflow is structurally confirm-first |

## Exit Criteria

- Summary displays correctly even if only 1 record exists
- Trend shows "Improving" only when zero rejections in last 8 distinct sessions
- `$wisdom route` groups auto-captured corrections by skill file and applies one of the three routing classifications to each group
- No skill file is modified by `$wisdom route` without explicit developer confirmation of the specific proposed edit
