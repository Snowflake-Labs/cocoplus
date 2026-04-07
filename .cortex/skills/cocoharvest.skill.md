---
name: "cocoharvest"
description: "Decompose an approved plan into parallel workstreams, assign specialist personas to each, generate flow.json stages with checkpoints, and create per-stage prompt files. Invoked automatically at Build phase for complex plans, or manually with /harvest."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - task-decomposition
---

Your objective is to decompose the approved plan into parallel workstreams and generate a complete flow.json pipeline.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus is not initialized in this directory. Run `/pod init` first." Then stop.

Read `.cocoplus/lifecycle/plan.md`. If it does not exist or is empty:
Output: "No approved plan found. Run `/plan` to create an execution plan first." Then stop.

## Step 1: Parse Workstreams

Read `.cocoplus/lifecycle/plan.md` section `## Workstreams`.
Extract each workstream as a discrete unit of work with:
- Name
- Description
- Dependencies (other workstreams this depends on)
- Artifacts it produces

## Step 2: Classify Workstreams

For each workstream, classify its primary domain using this mapping:

| Classification | Assigned Persona | Isolation |
|---------------|-----------------|-----------|
| SQL pipelines, schema design, stored procedures | data-engineer ($de) | worktree |
| Semantic layer, metrics, data marts | analytics-engineer ($ae) | none |
| ML models, notebooks, Cortex ML | data-scientist ($ds) | none |
| Ad-hoc analysis, reporting queries | data-analyst ($da) | none |
| Dashboards, visualizations | bi-analyst ($bi) | none |
| Product requirements, documentation | data-product-manager ($dpm) | none |
| Governance, lineage, quality rules | data-steward ($dst) | none |
| Strategy review only | chief-data-officer ($cdo) | none |

## Step 3: Create Per-Stage Prompt Files

For each workstream, create `.cocoplus/prompts/[stage-id]-prompt.md`:

```markdown
# Stage: [stage name]
# Persona: [persona]
# Context: [isolated/continued]

## Objective
[Workstream description from plan.md]

## Inputs
[Files, tables, or artifacts this stage requires]

## Deliverables
[What this stage must produce to be considered complete]

## Constraints
[Any constraints from the spec or plan]

## Checkpoints
[Glob patterns that must match when this stage is done]
```

## Step 4: Generate flow.json Stages

Generate stage IDs in format `stage-NNN` (001, 002, etc.).
Set dependencies based on workstream dependency analysis.
Independent workstreams have no `dependencies` field.

Write to `.cocoplus/flow.json`:

```json
{
  "meta": {
    "name": "[project name]",
    "version": "1.0",
    "phase": "build",
    "generated_by": "cocoharvest",
    "generated_at": "[ISO 8601 timestamp]"
  },
  "defaults": {
    "model": "claude-sonnet-4-20250514",
    "on_failure": "stop"
  },
  "stages": [
    {
      "id": "stage-001",
      "name": "[workstream name]",
      "persona": "$[persona-code]",
      "context": "[isolated/continued]",
      "prompt": ".cocoplus/prompts/stage-001-prompt.md",
      "checkpoints": ["[glob pattern for deliverable]"],
      "monitors": [
        { "config": ".cocoplus/monitors/quality-advisor.monitor.json" }
      ],
      "deliverables": [
        { "files": ["[expected output file]"] }
      ],
      "on_failure": "stop"
    }
  ]
}
```

Add `"dependencies": ["stage-NNN"]` for stages that depend on other stages.

## Step 5: Report

Output a summary:
```
CocoHarvest complete.

Workstreams decomposed: [N]
Stages generated: [N]
Parallel groups: [N independent stages that can run simultaneously]
Sequential chains: [N stages with dependencies]

Stage Summary:
[Table: stage ID, name, persona, dependencies]

Pipeline written to .cocoplus/flow.json
Prompt files written to .cocoplus/prompts/

Next: Run `/flow run` to begin execution.
```
