---
name: "dream"
description: "Distill prompt iteration patterns from past sessions into reviewed lesson candidates. Requires at least one function with 3+ prompt versions in .cocoplus/prompts/. Launches CocoCupper subagent to cluster patterns and writes candidates to .cocoplus/grove/dream-<timestamp>.md for developer review."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cododream
---

Your objective is to distill prompt iteration patterns from past sessions into lesson candidates for developer review.

## Pre-flight Check

Check that `.cocoplus/` exists. If not:
Output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Scan for Qualifying Prompt Histories

Scan `.cocoplus/prompts/` for all versioned prompt files and their associated `-meta.json` files.

Group files by function name. A function qualifies if it has **3 or more version files**.

If no qualifying functions found (all functions have < 3 versions):
Output:
```
No functions have enough iteration history for distillation yet.
CocoDream requires at least 3 prompt versions for a function.
Current state: <list each function with its version count>
Continue building with /prompt new and /prompt compare to accumulate iteration history.
```
Then stop.

## Launch Distillation

Activate the `coco-cupper` subagent with all qualifying iteration histories as context. Instruct the subagent to:

1. For each qualifying function, analyse the sequence of prompt versions and their associated evaluation scores from `-meta.json` files
2. Cluster iteration patterns into three categories:
   - **worked-patterns** — changes that produced > 2% improvement in evaluation score
   - **anti-patterns** — changes that produced > 2% regression in evaluation score
   - **neutral** — changes with < 2% delta in either direction
3. For each cluster entry, write a lesson candidate with:
   - Title (short, action-oriented)
   - Category: worked-pattern / anti-pattern / neutral
   - Evidence: which functions and version transitions support this lesson
   - Recommended action: what to do (or avoid) in future prompt work

## Write Dream File

Write all lesson candidates to `.cocoplus/grove/dream-<ISO8601-timestamp>.md`.

Use timestamp format: `YYYY-MM-DDTHH-MM-SSZ` (hyphens instead of colons for filesystem safety).

## Output

```
CocoDream Distillation Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Analysed: <N> functions (<M> prompt versions across <K> sessions)
Lesson candidates: <total> (<w> worked-patterns, <a> anti-patterns, <n> neutral)
Written to: .cocoplus/grove/dream-<timestamp>.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Review the candidates above. For each lesson you find valid, run:
  /patterns promote "<lesson title>"
to add it to CocoGrove for future CocoScout loading.
```

Open the dream file for developer review after outputting the summary.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Auto-promote lessons without developer review | CocoDream is a supervised ceremony — no lesson enters CocoGrove without explicit developer approval |
| Include functions with < 3 versions | Fewer than 3 versions produces spurious pattern detection; the threshold exists to ensure signal over noise |
| Overwrite a previous dream file | Each distillation session gets its own timestamped file — history is preserved for comparison |

## Exit Criteria

- [ ] `.cocoplus/grove/dream-<timestamp>.md` written with at least one lesson candidate per qualifying function
- [ ] Each candidate has Title, Category, Evidence, and Recommended action sections
- [ ] Output confirms function count, version count, and candidate breakdown by category
- [ ] Dream file opened for developer review
- [ ] No lessons auto-promoted to CocoGrove (developer must run `/patterns promote` explicitly)
