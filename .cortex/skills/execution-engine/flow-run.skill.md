---
name: "flow-run"
description: "Execute a CocoFlow pipeline from flow.json. If a stage-id is provided, execute only that stage. Otherwise, execute all pending stages in dependency order, running independent stages in parallel. Validates checkpoints after each stage and handles on_failure actions."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
---

Your objective is to execute a CocoFlow pipeline.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

Read `.cocoplus/flow.json`. If `stages` is empty:
Output: "No stages defined in flow.json. Run `/plan` then `/build` to generate the pipeline." Then stop.

Check for `.cocoplus/flow.pause` flag file. If it exists:
Output: "Pipeline is paused. Run `/flow resume` to continue." Then stop.

## Determine Execution Scope

If a stage-id argument is provided (e.g., `/flow run stage-001`):
- Execute only that stage, skip dependency check
- If stage not found: output "Stage [stage-id] not found in flow.json. Available stages: [list]" Then stop.

If no argument: execute all stages with status != "completed" in dependency order.

## Build Execution Order

For full pipeline execution:
1. Build dependency graph from flow.json stages
2. Find all stages with no dependencies (or whose dependencies are all "completed") — these form the first execution group
3. Execute that group (in parallel if multiple stages)
4. After each stage completes, find newly-unblocked stages (all dependencies now "completed")
5. Repeat until all stages complete or one fails with on_failure: stop

## Execute Each Stage

For each stage to execute:

1. **Log start:** Update flow.json stage status to `"running"`, add `started_at` timestamp
2. **Run setup commands** (if stage has setup commands in flow.json)
3. **Read prompt file** from `.cocoplus/prompts/[stage-id]-prompt.md`
4. **Create worktree** if `context: "isolated"`: `git worktree add .git/worktrees/[stage-id] -b agent/[stage-id]`
5. **Invoke persona subagent** with the prompt file content and stage context
6. **Wait for completion**
7. **Validate checkpoints:** for each glob pattern in `checkpoints`, verify at least one matching file exists
8. **Handle result:**
   - If all checkpoints pass: update flow.json stage to `"completed"`, add `completed_at`
   - If any checkpoint fails: apply `on_failure` action

## on_failure Actions

- `"stop"`: Mark stage `"failed"`. Output error with checkpoint that failed. Halt pipeline. Output: "Stage [id] failed. Checkpoint not satisfied: [pattern]. Fix the issue and run `/flow run [stage-id]` to retry."
- `"retry"`: Re-run stage up to `retry_limit` (default: 2) times. Track attempt count in flow.json.
- `"skip"`: Mark stage `"skipped"`. Log reason. Continue to next stage.

## Loop Stages

For stages with `"type": "loop"`:
- Repeat the stage execution up to `until.limit` iterations
- Track iteration count in flow.json as `iteration_count`
- Each iteration can reference previous iteration output

## Create Stage Commit

After each stage completes successfully:
```
git add [deliverable files from stage definition]
git commit -m "build([stage-id]): [stage name] — checkpoints verified"
```

## Final Output

When all stages complete:
Output:
```
Pipeline complete.
Stages: [N] completed, [M] skipped, [K] failed
Time: [duration]
```

## Anti-Rationalization

| Temptation | Why Not |
|------------|---------|
| Skip checkpoint validation | Checkpoints are the quality gate — never skip |
| Proceed past a stop failure | stop means STOP — require manual intervention |
| Mix stage outputs in same git commit | One commit per stage for traceability |
