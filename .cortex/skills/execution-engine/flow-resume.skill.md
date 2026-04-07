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
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

Check if `.cocoplus/flow.pause` exists. If not:
Output: "Pipeline is not paused. Run `/flow run` to start or continue execution." Then stop.

If a stage-id argument is provided: resume from that specific stage (mark all preceding pending stages as skipped).
If no argument: resume from the next pending stage.

Remove pause flag: `rm .cocoplus/flow.pause`

Output: "Pipeline resumed. Continuing from [stage name]. Run `/flow status` to monitor."

Activate the `flow-run` skill to begin execution.
