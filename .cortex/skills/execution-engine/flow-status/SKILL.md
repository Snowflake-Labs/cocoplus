---
name: "flow-status"
description: "Show the current execution state of the CocoFlow pipeline: per-stage status, completion percentage, concurrency mode, failed stages with error details, and the next stage to run."
version: "1.1.0"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
---

Your objective is to display the current pipeline execution state.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/flow.json`. Count stages by status:
- Total stages
- completed: status == "completed"
- running: status == "running"
- failed: status == "failed"
- exited: status == "exited"
- skipped: status == "skipped"
- pending: status == "pending" or no status field

Read `flow.json` `runtime.concurrency_mode` (default: `normal` if not set). Read `runtime.harvest_id` to find the dual-file state files in `harvest/`.
Use the canonical status vocabulary for sessions and stages: `running`, `paused`, `completed`, `exited`, `failed`, `idle`, `retired`. Render `completed`, `exited`, and `failed` distinctly; `exited` means structural stop, not pipeline error.

Output:

```
# Pipeline Status: [pipeline name]

Overall: [completed count]/[total] complete ([%])
Concurrency Mode: [normal|caution|single-track] — [trigger event that caused last transition, if any]

| Stage | Name | Persona | HITL | Status | Started | Duration |
|-------|------|---------|------|--------|---------|----------|
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
Action required: Fix issue and run `$flow run [stage-id]`
```

For any stage with `"type": "parallel"`, add a per-pod completion table sourced from `.cocoplus/pod-status.json` (Feature 47 enhancement). Render `PARTIAL` distinctly — never merge it into or display it as `COMPLETE`:

```
## Parallel Step: [stage name]
| Pod | Status | Findings | Skipped Checks |
|-----|--------|----------|-----------------|
| sentinel-pod | COMPLETE | 4 | — |
| review-pod | PARTIAL | 2 | timeout on file 3 of 5 |
| trace-pod | COMPLETE | 1 | — |
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show stage status without verifying checkpoint glob matches exist | A stage may report "completed" in flow.json but its checkpoint files could have been deleted; verify independently |
| Omit the Next Action line when all stages are complete | Developers need explicit confirmation that the pipeline is done — "All complete" is load-bearing output |

## Exit Criteria

- [ ] Status table with columns Stage, Name, Persona, HITL, Status, Started, Duration is output for every stage
- [ ] Overall completion percentage (completed/total) is shown
- [ ] Concurrency Mode field with current mode and last transition trigger is shown
- [ ] Pause status (checked via `.cocoplus/flow.pause` existence) and Next Action are shown
- [ ] `## Failures` section present for any failed stages with checkpoint details and retry command
- [ ] `exited` stages are shown as structural stops with rerun/resume guidance, not as failures
- [ ] `parallel:` stages show a per-pod completion table with `PARTIAL` rendered distinctly from `COMPLETE`
