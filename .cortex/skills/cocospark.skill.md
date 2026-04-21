---
name: "spark"
description: "Activate CocoSpark brainstorm mode. Generates multiple divergent approaches, challenges assumptions, and explores what-if scenarios. Output is marked as exploration and does NOT modify spec or lifecycle artifacts. Use /spark to start, /spark-off to end."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocospark
---

You are activating CocoSpark — divergent brainstorm mode.

**IMPORTANT:** CocoSpark output is exploration only. It does NOT modify spec.md, plan.md, or any lifecycle artifacts. Nothing generated in a CocoSpark session creates git commits or updates AGENTS.md phase state.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Activation

Create mode flag: create the file `.cocoplus/modes/coco-spark.on` with empty content using the Write tool (cross-platform — do not use `touch`).

Generate timestamp for the spark session file.
Write `.cocoplus/spark-[timestamp].md` (exploration output will be appended here):

```markdown
# CocoSpark Session — [timestamp]

> **This is an exploration document. Nothing here modifies project spec, plan, or lifecycle state.**

## Topic
[Developer's question or topic]

## Approaches Explored
```

## Brainstorm Mode

You are now in divergent thinking mode. For the developer's question or topic:

1. Generate 3-5 distinct approaches (not variations of the same approach)
2. For each approach: name it, describe it in 2-3 sentences, identify the key trade-off
3. Challenge at least one assumption in the developer's framing
4. Propose one "what if" scenario that challenges the current direction
5. Identify one risk or blind spot not yet considered

Mark each output section with **[EXPLORATION]** prefix.

Append all output to the spark session file.

## Ending a Session

When the developer runs `/spark-off`:
- Remove mode flag: delete `.cocoplus/modes/coco-spark.on` using `node -e "try{require('fs').unlinkSync('.cocoplus/modes/coco-spark.on')}catch(_){}"` via the Bash tool.
- Output: "CocoSpark session ended. Exploration saved to `.cocoplus/spark-[timestamp].md`. Nothing in this session modified project state."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Write brainstorm output directly into spec.md or plan.md | CocoSpark is exploration-only; writing into lifecycle artifacts conflates divergent thinking with committed decisions |
| Skip creating the spark session file and output inline only | Without a session file, the exploration is lost when the conversation ends — the file is the durable record |
| Produce only one approach instead of 3-5 | Single-approach brainstorming is just planning with extra steps; the value of CocoSpark is divergence |

## Exit Criteria

- [ ] `.cocoplus/modes/coco-spark.on` flag exists after activation
- [ ] `.cocoplus/spark-[timestamp].md` file exists with the `[EXPLORATION]` section structure
- [ ] Brainstorm output contains at least 3 distinct approaches, one challenged assumption, and one "what if" scenario
- [ ] No changes to `spec.md`, `plan.md`, or any lifecycle artifact during the session
