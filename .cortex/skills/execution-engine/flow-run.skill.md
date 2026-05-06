---
name: "flow-run"
description: "Execute a CocoFlow pipeline from flow.json. Supports adaptive parallelism (--concurrency flag), dual-file state recovery, intermediate result persistence for parallel evaluation runs, and HITL stage pausing. If a stage-id is provided, execute only that stage."
version: "1.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
---

Your objective is to execute a CocoFlow pipeline.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Read `.cocoplus/flow.json`. If `stages` is empty:
Output: "No stages defined in flow.json. Run `/plan` then `/build` to generate the pipeline." Then stop.

Check for `.cocoplus/flow.pause` flag file. If it exists:
Output: "Pipeline is paused. Run `/flow resume` to continue." Then stop.

## Parse Arguments

- `--model <haiku|sonnet|opus>`: pipeline-level model default (Tier 2). Without `--stage`, applies to all stages.
- `--model <value> --stage <stage-id>`: stage-level override (Tier 3). Does not modify `flow.json`.
- `--concurrency <normal|caution|single-track>`: force concurrency mode for this run. Overrides the mode inferred from SubagentStop signals. Not persisted — next `/flow run` resumes inference from signals.

## Check Dual-File State for Recovery

Read `flow.json` `runtime.harvest_id` (if present). If a `harvest/[harvest-id]-tasks.json` file exists, read it:
- Stages with `status: "completed"` and validated `validation_commands` are not re-run.
- Stages with `status: "in_progress"`: if checkpoint artifacts exist, mark completed; if not, reset to pending.
- Read the last 20 entries of `harvest/[harvest-id]-progress.txt` for narrative context and log a `SESSION_BOUNDARY` entry.

## Determine Execution Scope

If a stage-id argument is provided (e.g., `/flow run stage-001`):
- Execute only that stage, skip dependency check
- If stage not found: output "Stage [stage-id] not found in flow.json. Available stages: [list]" Then stop.

If no argument: execute all stages with status != "completed" in dependency order.

## Build Execution Order

For full pipeline execution:
1. Read `runtime.concurrency_mode` from `flow.json` (or apply `--concurrency` override)
2. Build dependency graph from flow.json stages
3. Find all stages with no dependencies (or whose dependencies are all "completed") — these form the first execution group
4. Apply concurrency mode:
   - **normal**: spawn all ready stages simultaneously
   - **caution**: spawn at most 2 stages simultaneously; wait for at least 1 to complete before spawning another
   - **single-track**: spawn 1 stage at a time; wait for completion and checkpoint validation before spawning next
5. After each stage completes, find newly-unblocked stages (all dependencies now "completed")
6. Repeat until all stages complete or one fails with on_failure: stop

## Execute Each Stage

For each stage to execute:

1. **Log start:** Update flow.json stage status to `"running"`, add `started_at` timestamp. Append `STAGE_STARTED` entry to `harvest/[run-id]-progress.txt`. Write updated `harvest/[run-id]-tasks.json` atomically.
2. **Run setup commands** (if stage has setup commands in flow.json)
3. **Read prompt file** from `.cocoplus/prompts/[stage-id]-prompt.md`
4. **Create worktree** if `context: "isolated"` or `isolated: true`: `git worktree add .git/worktrees/[stage-id] -b agent/[stage-id]`
5. **Inject shell identity:** set `COCOPLUS_FUNCTION`, `COCOPLUS_PERSONA`, `COCOPLUS_EVAL_ID`, `COCOPLUS_HARVEST_ID` in the subagent shell environment
6. **Invoke persona subagent** with the prompt file content and stage context
7. **Wait for completion**
8. **Intermediate result persistence** (for evaluation stages with `isolated: true`): if the subagent is a Data Scientist running evaluation work, require detailed results to be written to `.cocoplus/harvest/intermediate/[agent-id]-results.json`; only a summary (accuracy score, pass/fail, function name, anomalies) returns to orchestrator context
9. **Validate checkpoints:** for each glob pattern in `checkpoints`, verify at least one matching file exists
10. **Handle result:**
    - If all checkpoints pass: update flow.json stage to `"completed"`, add `completed_at`. Append `STAGE_COMPLETED` to progress.txt. Reset `consecutive_failure_count` to 0 in tasks.json.
    - If any checkpoint fails: increment `consecutive_failure_count` in tasks.json. Append `STAGE_FAILED` to progress.txt. Apply `on_failure` action. If `consecutive_failure_count` reaches `maxConsecutiveFailures`, append `ESCALATED` and halt with full escalation message.
11. **HITL pause** (if `hitl: true`): after successful completion, output the stage results and ask developer to confirm before spawning downstream stages

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
| Skip dual-file state updates | Without state updates, a context reset leaves the pipeline unrecoverable from files |
| Let evaluation agents return full results to orchestrator context | Full results from 5 parallel agents saturate orchestrator context; only summaries return, details go to intermediate files |
| Ignore HITL stage pausing | Downstream stages of a HITL stage may depend on a human decision that hasn't been made |

## Exit Criteria

- [ ] Each completed stage has `status: "completed"` and a `completed_at` timestamp in `flow.json`
- [ ] Each completed stage has a corresponding git commit with message `build([stage-id]): [stage name] — checkpoints verified`
- [ ] All checkpoint glob patterns for each completed stage matched at least one file
- [ ] `harvest/[run-id]-progress.txt` has `STAGE_COMPLETED` entry for each completed stage
- [ ] `harvest/[run-id]-tasks.json` reflects current task state, written atomically
- [ ] HITL stages paused for developer review before downstream stages were spawned
- [ ] If consecutive failures reached `maxConsecutiveFailures`, pipeline halted with escalation message
- [ ] If any stage had `on_failure: stop` and failed, the pipeline halted immediately with an actionable error message
