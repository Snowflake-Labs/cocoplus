---
name: "build"
description: "Enter the Build phase of CocoBrew. Reads plan.md, invokes CocoHarvest to decompose the plan into parallel workstreams, assigns personas, generates flow.json stages, and begins execution via /flow run. Must have /plan completed and approved first."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Build phase (3/6) of CocoBrew. Your objective is to transform the approved plan into executing workstreams.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Read `.cocoplus/lifecycle/meta.json`. Verify `phases_completed` contains both `"spec"` and `"plan"`.
If not: output "The Spec and Plan phases must be completed before building. Check `/pod status` for current state." Then stop.

## SecondEye Gate Check

Scan `.cocoplus/lifecycle/` for any files matching `secondeye-*.md`.
For each file found, check YAML frontmatter for `critical_open: true` and `acknowledged: false`.
If any such file exists:
- Output: "Unacknowledged critical findings from SecondEye review. Run `/secondeye acknowledge` to review and acknowledge before building."
- List the finding summaries.
- Stop.

## Complexity Assessment

Read `.cocoplus/lifecycle/plan.md`. Assess complexity:
- Count workstreams listed in the plan
- Identify if multiple personas are required
- Check if any stages have external dependencies

If 3 or more workstreams OR multiple personas required:
→ Complexity = HIGH → invoke CocoHarvest automatically

If fewer than 3 workstreams AND single persona sufficient:
→ Complexity = LOW → offer simple execution without CocoHarvest

Tell the developer the complexity assessment and proceed accordingly.

## Invoke CocoHarvest (for HIGH complexity)

Activate the `cocoharvest` skill to:
1. Decompose plan.md into parallel workstreams
2. Assign personas
3. Generate flow.json stages
4. Create per-stage prompt files in `.cocoplus/prompts/`

## Update Build State

Update `.cocoplus/lifecycle/meta.json` — add build to phases_completed.

Append to AGENTS.md (keep ≤200 lines):
```
Phase: Build (3/6)
Build started: [timestamp]
CocoHarvest: [invoked/skipped]
```

Create git commit:
```
git add .cocoplus/lifecycle/meta.json .cocoplus/AGENTS.md .cocoplus/flow.json
git commit -m "build: begin build phase — CocoHarvest pipeline initialized"
```

## Begin Execution

If HIGH complexity: Activate `flow-run` skill to begin pipeline execution.
If LOW complexity: Execute the plan directly using the appropriate persona.

Output: "Build phase initiated. Use `/flow status` to monitor pipeline progress."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip SecondEye gate check and proceed directly to build | Unacknowledged Critical findings represent unresolved risks — building on top of them silently buries problems |
| Always invoke CocoHarvest regardless of complexity | Low-complexity plans don't need full pipeline decomposition; over-engineering wastes tokens and adds unnecessary stages |
| Mark build as complete before flow-run finishes | Build phase is only complete when execution has started, not just when CocoHarvest generates flow.json |

## Exit Criteria

- [ ] `.cocoplus/lifecycle/meta.json` `phases_completed` array contains `"build"`
- [ ] `.cocoplus/flow.json` has non-empty `stages` array (for HIGH complexity) or execution is underway
- [ ] Git commit with message `build: begin build phase` exists in log
- [ ] No unacknowledged SecondEye files with `critical_open: true` exist in `.cocoplus/lifecycle/`
