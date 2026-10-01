---
name: pod-checkpoint
description: Write a structured recovery snapshot to lifecycle/checkpoint.md before context reset — captures phase, stage, decisions, and pending items so $pod resume can restore precise context
version: 1.0.2
user-invocable: true
command: $pod checkpoint
author: "CocoPlus"
tags:
  - cocoplus
feature: CocoHealth (Feature 27) — CocoPod subcommand
---

# $pod checkpoint

Write a structured recovery snapshot to `.cocoplus/lifecycle/checkpoint.md`. Use this before `$clear` to ensure `$pod resume` can restore your exact position.

## Preconditions

- `.cocoplus/` directory must exist (run `$pod init` first)
- No arguments accepted

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." and exit.

2. **Read current lifecycle phase:** Read `.cocoplus/lifecycle/meta.json`. Extract: current phase, phase ID, completion timestamps.

3. **Read in-progress flow stage:** Read `.cocoplus/flow.json`. Find the stage with `status: "running"` or the next `status: "pending"` stage. Extract: stage ID, stage name, checkpoint validation status.

4. **Read last 5 decisions:** Read `.cocoplus/memory/decisions.md`. Extract the 5 most recent entries (newest first) — capture ID, brief description, date.

5. **Read open must-fix items:** Read `.cocoplus/lifecycle/review.md` if it exists. Extract any must-fix findings that have not been resolved.

6. **Read active HITL stages:** Read `.cocoplus/flow.json`. Find all stages with `"hitl": true` and `status: "pending"` awaiting developer approval.

7. **Read triggered seeds:** Scan `.cocoplus/seeds/*.yaml` for entries with `status: triggered`.

8. **Read CocoHarvest status:** Read `.cocoplus/harvest/` directory for any `*-tasks.json` files with in-progress stages. Extract harvest ID and agent summary.

9. **Assess context utilization:** Read `.cocoplus/meter/current-session.json` if it exists. Approximate utilization from token accumulation. If context utilization data is unavailable, omit this field gracefully.

10. **Write checkpoint file:** Write all gathered state to `.cocoplus/lifecycle/checkpoint.md` (overwrite if it exists):

```markdown
---
checkpoint_date: [ISO8601]
lifecycle_phase: [phase name]
phase_id: [phase-id or null]
context_utilization: [percentage or "unavailable"]
---

# CocoPlus Checkpoint — [ISO8601]

## Lifecycle State
- **Phase:** [current phase] (ID: [phase-id])
- **Last completed:** [last phase completed with timestamp]

## In-Progress Flow Stage
- **Stage:** [stage-id] — [stage name]
- **Persona:** [assigned persona]
- **Checkpoints validated:** [N / total]
- **Status:** [running / pending]

## Last 5 Decisions
1. [[decision-id]] [brief description] — [date]
2. ...

## Pending Must-Fix Items
[List from review.md, or "None"]

## HITL Stages Awaiting Approval
[List of hitl: true stages with pending status, or "None"]

## Active CocoHarvest Run
- **Harvest ID:** [run-id or "None active"]
- **Agents:** [summary of in-progress agents]

## Triggered Seeds Ready for Promotion
[List of triggered seeds, or "None"]
```

11. **Confirm to developer:**
```
✓ Checkpoint saved to lifecycle/checkpoint.md
  Phase: [current phase]
  Stage: [in-progress stage or "none"]
  Decisions captured: [N]

Next steps:
  1. Run $clear to reset the context window
  2. Run $pod resume to continue from this checkpoint
```

12. **Recovery Decision Matrix (when context is at/near 70%):** If context utilization is ≥70% or if checkpoint is triggered by CocoHealth alert, additionally evaluate the following and append the recommended action:

| Uncommitted Changes | Recent Phase Commits | Checkpoint Exists | Recommended Action |
|---|---|---|---|
| No | Yes | Any | `Resume from last commit` — no work at risk; start new session |
| Yes (< 20 lines) | Any | Yes | `Commit partial + resume` — commit current state, resume from checkpoint |
| Yes (≥ 20 lines) | Any | Yes | `Checkpoint + new session` — run `$clear` then `$pod resume` |
| Yes | No | No | `Emergency commit` — commit all modified files with `chore(recovery): emergency state preservation` |
| No | No | No | `Clean restart` — `.cocoplus/` state files are the recovery source |

Run `git status --porcelain` and `git log --oneline -5` to assess the matrix row. Output the recommendation alongside the checkpoint confirmation.

## Output Format

```
✓ Checkpoint saved to .cocoplus/lifecycle/checkpoint.md

  Phase: [current phase]
  In-progress stage: [stage-id: stage-name] or "none"
  Decisions captured: [N]
  Must-fix items: [N]
  HITL stages pending: [N]
  Seeds ready: [N]

Recovery recommendation: [action from matrix, or "Run $clear then $pod resume"]

Run $clear to reset context, then $pod resume to continue.
```

## Error Cases

- **`.cocoplus/` not initialized:** Output message and exit; do not create checkpoint
- **`meta.json` missing:** Note "lifecycle phase unavailable" in checkpoint; continue
- **`flow.json` missing:** Note "no pipeline active" in checkpoint; continue
- **Cannot write checkpoint file:** Output filesystem error; do not create partial file

## Exit Criteria

This skill is complete when:
- `lifecycle/checkpoint.md` is written with all available state
- Developer has received the confirmation message and recovery recommendation

## Anti-Rationalization

Do NOT:
- Create a git commit for the checkpoint (checkpoint is committed with the next CocoBrew phase commit)
- Skip writing the file if some state sections are unavailable — write what is available, note what is missing
- Block the developer from continuing work after checkpoint is written
