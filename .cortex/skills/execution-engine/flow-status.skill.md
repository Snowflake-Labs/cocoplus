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
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

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

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show stage status without verifying checkpoint glob matches exist | A stage may report "completed" in flow.json but its checkpoint files could have been deleted; verify independently |
| Omit the Next Action line when all stages are complete | Developers need explicit confirmation that the pipeline is done — "All complete" is load-bearing output |

## Exit Criteria

- [ ] Status table with columns Stage, Name, Persona, Status, Started, Duration is output for every stage
- [ ] Overall completion percentage (completed/total) is shown
- [ ] Pause status (checked via `.cocoplus/flow.pause` existence) and Next Action are shown
- [ ] `## Failures` section present for any failed stages with checkpoint details and retry command
