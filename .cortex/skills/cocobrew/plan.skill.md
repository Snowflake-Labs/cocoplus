---
name: "plan"
description: "Enter the Plan phase of CocoBrew. Reads spec.md, presents planning options, invokes Coco native plan mode as a mandatory gate, captures the approved plan to plan.md, creates initial flow.json template, and commits. Must have /spec completed first."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Plan phase (2/6) of CocoBrew. Your objective is to transform the approved specification into an executable plan.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus is not initialized in this directory. Run `/pod init` to set up the CocoPlus project bundle and try again." Then stop.

Read `.cocoplus/lifecycle/meta.json`. Verify `phases_completed` contains `"spec"`.
If not: output "The Spec phase must be completed before planning. Run `/spec` to capture requirements first." Then stop.

## Read the Specification

Read `.cocoplus/lifecycle/spec.md` completely. Extract:
- Goal
- Deliverables
- Personas list
- Constraints

## Invoke Coco Native Plan Mode (MANDATORY)

This is a hard gate. You MUST invoke Coco's native `/plan` mode. You cannot skip this step.

Tell the developer:
"Entering Coco plan mode to generate the execution plan. This will structure the work into a reviewable plan before any code is written."

Enter Coco's native plan mode with the spec context loaded. The plan mode will:
1. Analyze the specification
2. Generate a structured execution plan
3. Present it to the developer for review and approval

Wait for developer approval. Do NOT proceed until the developer explicitly approves.

## Capture the Approved Plan

Generate a plan ID: `plan-YYYYMMDD-NNN`.

Write `.cocoplus/lifecycle/plan.md`:

```markdown
# Execution Plan

**Date:** [ISO 8601 timestamp]
**Phase:** Plan (2/6)
**Phase ID:** [plan ID]
**Spec ID:** [spec ID from meta.json]

## Overview
[Summary of the approved plan from Coco plan mode]

## Workstreams
[Numbered list of workstreams from the plan]

## Dependencies
[Dependency relationships between workstreams]

## Estimated Duration
[Developer-provided or inferred estimate]

## Personas Required
[Which personas will work on which workstreams]

## Approved By
Developer — [timestamp]
```

## Initialize flow.json Template

Update `.cocoplus/flow.json` to add metadata (stages remain empty — CocoHarvest fills them in Build phase):

```json
{
  "meta": {
    "name": "[project name from project.md]",
    "version": "1.0",
    "phase": "plan",
    "plan_id": "[plan ID]",
    "spec_id": "[spec ID]",
    "created": "[timestamp]"
  },
  "defaults": {
    "model": "claude-sonnet-4-20250514",
    "context": "isolated",
    "on_failure": "stop"
  },
  "stages": []
}
```

## Update AGENTS.md and meta.json

Append to AGENTS.md (keep ≤200 lines):
```
Phase: Plan (2/6)
Plan ID: [plan-id]
Plan completed: [timestamp]
```

Update `lifecycle/meta.json` — add plan to phases_completed and phase_history.

## Create Git Commit

```
git add .cocoplus/lifecycle/plan.md .cocoplus/flow.json .cocoplus/lifecycle/meta.json .cocoplus/AGENTS.md
git commit -m "feat(plan): approved execution plan v1"
```

## Completion Output

Output: "Plan captured and approved. Commit created: `feat(plan): approved execution plan v1`. You may now proceed to `/build`."

## Anti-Rationalization

| Temptation | Why Not |
|------------|---------|
| Skip Coco native plan mode | Plan mode is a HARD GATE — it is not optional under any circumstances |
| Proceed without explicit developer approval | Developer must approve before plan.md is written |
| Create detailed flow.json stages here | CocoHarvest creates stages — plan.skill.md only creates the empty skeleton |
