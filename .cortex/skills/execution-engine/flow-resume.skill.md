---
name: "flow-resume"
description: "Resume a paused CocoFlow pipeline. Removes the pause flag and continues from the next pending stage or the specified stage-id."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
---

Your objective is to resume a paused CocoFlow pipeline.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Check if `.cocoplus/flow.pause` exists. If not:
Output: "Pipeline is not paused. Run `/flow run` to start or continue execution." Then stop.

If a stage-id argument is provided: resume from that specific stage (mark all preceding pending stages as skipped).
If no argument: resume from the next pending stage.

Remove pause flag: `rm .cocoplus/flow.pause`

Output: "Pipeline resumed. Continuing from [stage name]. Run `/flow status` to monitor."

Activate the `flow-run` skill to begin execution.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Resume from the beginning instead of the next pending stage | Already-completed stages would run again, duplicating deliverables and corrupting stage state |
| Remove the pause flag but not activate flow-run | Removing the flag without resuming execution leaves the pipeline stuck — the developer sees no feedback |

## Exit Criteria

- [ ] `.cocoplus/flow.pause` flag file does NOT exist
- [ ] `flow-run` skill is activated to continue execution from the next pending stage
- [ ] Output identifies which stage execution is resuming from
