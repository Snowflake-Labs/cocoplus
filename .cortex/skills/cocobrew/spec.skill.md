---
name: "spec"
description: "Enter the Spec phase of CocoBrew. Guides the developer through structured requirements capture: goal, success criteria, constraints, personas involved, data sources, and deliverables. Writes spec.md to .cocoplus/lifecycle/ and creates a git commit."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Spec phase (1/6) of the CocoBrew lifecycle. Your objective is to capture complete project requirements through structured dialogue.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Check `.cocoplus/lifecycle/meta.json`. If `current_phase` is not `not_started` and not `spec`:

If `current_phase` is `build`, `test`, `review`, or `shipped`:
Output:
```
⚠️  WARNING: Current phase is [phase]. Re-entering Spec at this stage will invalidate downstream artifacts.

Active git worktrees from CocoHarvest (agent/stage-*) will become stale and out of sync with the new specification. You must clean them up manually with:
  git worktree remove --force agent/stage-<name>
  git worktree prune

To proceed anyway, re-run /spec with the --force flag: /spec --force
```
Then stop — unless the `--force` flag was provided in the invocation arguments. If `--force` was provided, output "Proceeding with forced Spec re-entry. Existing downstream artifacts will be invalidated." and continue.

Otherwise (phase is `plan`): Output "Current phase is [phase]. The Spec phase can only be entered from the beginning or re-entered to update requirements. Proceed? (yes/no)"
If no: stop.

## Requirements Capture Dialogue

Ask each question in sequence. Wait for the developer's response before proceeding to the next question. Do not batch questions.

**Question 1:** What is the primary goal of this project? (Be specific — what problem does it solve and for whom?)

**Question 2:** What are the success criteria? (How will you know this project succeeded? List 2-5 measurable outcomes.)

**Question 3:** What is explicitly out of scope for this work? (List anything the project will not attempt in this phase.)

**Question 4:** Which existing Snowflake objects are involved? (List tables, views, stages, functions, procedures, or schemas already in play. If none, say "None".)

**Question 5:** Who are the target users? (Who will use or benefit from this output? If unknown, say "TBD".)

**Question 6:** What is the target timeline? (If unknown, say "TBD".)

## Write Specification Document

Generate a phase ID: `spec-YYYYMMDD-NNN` (use current date, NNN = 001 unless spec already exists).

Write `.cocoplus/lifecycle/spec.md`:

```markdown
# Project Specification

**Date:** [ISO 8601 timestamp]
**Phase:** Spec (1/6)
**Phase ID:** [generated phase ID]

## Goal
[Developer's answer to Question 1]

## Success Criteria
[Developer's answers to Question 2, formatted as bullet list]

## Out of Scope
[Developer's answers to Question 3, formatted as bullet list]

## Existing Snowflake Objects
[Developer's answers to Question 4, formatted as bullet list]

## Target Users
[Developer's answer to Question 5]

## Timeline
[Developer's answer to Question 6]
```

## Update AGENTS.md

Append to `.cocoplus/AGENTS.md` (do not exceed 200 lines):
```
## CocoBrew Lifecycle
Phase: Spec (1/6)
Phase ID: [phase-id]
Spec completed: [timestamp]
```

## Update lifecycle/meta.json

Update `.cocoplus/lifecycle/meta.json`:
```json
{
  "current_phase": "spec",
  "phases_completed": ["spec"],
  "created_at": "[original timestamp]",
  "phase_history": [
    { "phase": "spec", "phase_id": "[phase-id]", "completed_at": "[timestamp]" }
  ]
}
```

## Create Git Commit

```
git add .cocoplus/lifecycle/spec.md .cocoplus/lifecycle/meta.json .cocoplus/AGENTS.md
git commit -m "feat(spec): initial project specification captured"
```

## Completion Output

Output: "Spec captured. Commit created: `feat(spec): initial project specification captured`. You may now proceed to `/plan`."

## Anti-Rationalization

| Temptation | Why Not |
|------------|---------|
| Ask all 6 questions at once | Batched questions reduce answer quality — always one at a time |
| Skip questions if developer seems impatient | All 6 are required — spec.md must be complete |
| Skip git commit | Every phase must commit for rollback traceability |

## Exit Criteria

- [ ] `.cocoplus/lifecycle/spec.md` exists with all six sections (Goal, Success Criteria, Out of Scope, Existing Snowflake Objects, Target Users, Timeline)
- [ ] `.cocoplus/lifecycle/spec.md` has a valid Phase ID in format `spec-YYYYMMDD-NNN`
- [ ] `.cocoplus/lifecycle/meta.json` `phases_completed` array contains `"spec"` and `current_phase` is `"spec"`
- [ ] Git commit with message `feat(spec): initial project specification captured` exists in log
