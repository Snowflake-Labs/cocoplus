---
name: "cocospark"
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
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

## Activation

Create mode flag: `touch .cocoplus/modes/coco-spark.on`

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
- Remove mode flag: `rm -f .cocoplus/modes/coco-spark.on`
- Output: "CocoSpark session ended. Exploration saved to `.cocoplus/spark-[timestamp].md`. Nothing in this session modified project state."
