---
name: "flow-status"
description: "Show the current execution state of the CocoFlow pipeline: per-stage status, completion percentage, failed stages with error details, and the next stage to run."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
---

Your objective is to display the current pipeline execution state.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

Read `.cocoplus/flow.json`. Count stages by status:
- Total stages
- completed: status == "completed"
- running: status == "running"
- failed: status == "failed"
- skipped: status == "skipped"
- pending: status == "pending" or no status field

Output:

```
# Pipeline Status: [pipeline name]

Overall: [completed count]/[total] complete ([%])

| Stage | Name | Persona | Status | Started | Duration |
|-------|------|---------|--------|---------|----------|
[one row per stage]

Paused: [yes/no — check for .cocoplus/flow.pause flag]
Next action: [name of next pending stage to run, or "All complete" or "Stopped — manual intervention required"]
```

For failed stages, add:
```
## Failures
### [stage-id]: [stage name]
Checkpoint failed: [pattern]
on_failure: stop
Action required: Fix issue and run `/flow run [stage-id]`
```
