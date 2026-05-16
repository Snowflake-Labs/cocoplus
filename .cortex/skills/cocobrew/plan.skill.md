---
name: "plan"
description: "Enter the Plan phase of CocoBrew. Runs CocoSpec quality gate pre-flight, reads spec.md and discuss.md (if present), invokes Coco native plan mode as a mandatory gate, captures the approved plan to plan.md, creates initial flow.json template, and commits. Must have $spec completed first."
version: "1.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Plan phase (2/6) of CocoBrew. Your objective is to transform the approved specification into an executable plan.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/lifecycle/meta.json`. Verify `phases_completed` contains `"spec"`.
If not: output "The Spec phase must be completed before planning. Run `$spec` to capture requirements first." Then stop.

## CocoSpec Pre-Flight Quality Gate

Before entering plan mode, run the CocoSpec scoring gate. Spawn a background Haiku subagent (read-only) to score `spec.md` and `discuss.md` (if it exists) against five dimensions:

| Dimension | Score 0 | Score 1 | Score 2 |
|-----------|---------|---------|---------|
| **Value** | No rationale | Rationale present but benefits not measurable | Clear rationale with verifiable success metrics |
| **Scope** | No scope definition | MVP defined but out-of-scope not stated | Both MVP and explicit out-of-scope defined |
| **Acceptance** | No acceptance criteria | Criteria stated but not testable | Testable criteria with clear pass/fail determination |
| **Boundaries** | None addressed | Partial coverage | All four (error handling, performance, compatibility, security) addressed |
| **Risk** | No risk assessment | Risks identified but no mitigation | Risks identified with explicit mitigation or escalation plan |

The scoring agent writes the score and per-dimension rationale to `lifecycle/spec-score.md`.

**Gate behavior:**
- Score ≥9: Gate passes. Check Quick Mode eligibility (see below).
- Score 8: Hold. Show which dimension scored below 2. Ask developer to address the gap before proceeding.
- Score ≤7: Hold. Output an Uncertainty Declaration for every sub-2 dimension — name each assumption being made rather than stated. Developer must address before planning proceeds.

**Uncertainty Declaration format (for score ≤7):**
```
UNCERTAIN: [dimension description] | ASSUMPTION: [what is being assumed]
```

**Quick Mode check (score ≥9 only):** If score ≥9 AND spec scope is ≤3 files (detectable from spec.md's Deliverables section) AND no EHRB indicators in the planned operations: offer Quick Mode — "Your specification qualifies for Quick Mode. Skip Plan phase and proceed directly to Build?" Quick Mode requires explicit developer confirmation. If accepted, record `"quick_mode": true` in `lifecycle/meta.json` and add `"plan"` to `phases_completed` with a note, then skip to Build.

## Read the Specification

Read `.cocoplus/lifecycle/spec.md` completely. If `lifecycle/discuss.md` exists, also read it and extract any additional decisions (evaluation methodology, accuracy threshold, model selection, warehouse assignment, production safety requirements) that must be honored in the plan.

Extract from spec:
- Goal
- Deliverables
- Personas list
- Constraints

## Invoke Coco Native Plan Mode (MANDATORY)

This is a hard gate. You MUST invoke Coco's native `$plan` mode. You cannot skip this step.

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

Output: "Plan captured and approved. Commit created: `feat(plan): approved execution plan v1`. You may now proceed to `$build`."

## Anti-Rationalization

| Temptation | Why Not |
|------------|---------|
| Skip CocoSpec gate | CocoSpec is a pre-flight check that prevents plan-time decisions from filling in missing spec content silently; never skip |
| Skip Coco native plan mode | Plan mode is a HARD GATE — it is not optional under any circumstances |
| Proceed without explicit developer approval | Developer must approve before plan.md is written |
| Create detailed flow.json stages here | CocoHarvest creates stages — plan.skill.md only creates the empty skeleton |
| Ignore discuss.md when it exists | Decisions captured in $discuss must be traceable into the plan and are checked again at review time |

## Exit Criteria

- [ ] `lifecycle/spec-score.md` exists with CocoSpec scores for all five dimensions and the total score
- [ ] CocoSpec gate passed (score ≥9) or developer explicitly addressed gaps before proceeding
- [ ] `.cocoplus/lifecycle/plan.md` exists with YAML-like header fields (Date, Phase, Phase ID, Spec ID) and a `## Workstreams` section
- [ ] If `discuss.md` exists, plan.md reflects the key decisions from it (evaluation target, model, threshold, warehouse, safety requirements)
- [ ] `.cocoplus/flow.json` exists with `meta.phase` set to `"plan"` and an empty `"stages": []` array
- [ ] `.cocoplus/lifecycle/meta.json` `phases_completed` array contains `"plan"`
- [ ] Git commit with message `feat(plan): approved execution plan v1` exists in log
