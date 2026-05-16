---
name: "cocoharvest"
description: "Decompose an approved plan into parallel workstreams, assign specialist personas, classify stages as HITL or AFK (CocoLens), generate flow.json stages with checkpoints and dual-file state, and create per-stage prompt files. Includes adaptive parallelism, stall detection, shell identity injection, and consecutive failure escalation."
version: "1.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - task-decomposition
---

Your objective is to decompose the approved plan into parallel workstreams and generate a complete flow.json pipeline.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/lifecycle/plan.md`. If it does not exist or is empty:
Output: "No approved plan found. Run `$plan` to create an execution plan first." Then stop.

## Step 1: Parse Workstreams

Read `.cocoplus/lifecycle/plan.md` section `## Workstreams`.
Extract each workstream as a discrete unit of work with:
- Name
- Description
- Dependencies (other workstreams this depends on)
- Artifacts it produces

## Step 2: CocoLens — HITL/AFK Stage Classification

For each workstream, classify it as **HITL** (Human In The Loop) or **AFK** (Away From Keyboard) before assigning a persona:

- **HITL:** The stage requires human judgment before it can proceed or before its output is consumed. Classify as HITL when: the stage makes architectural decisions, involves evaluation methodology choices, writes to production schemas, deploys or alters Snowflake objects with EHRB indicators, or its output is ambiguous enough that autonomous resolution could be incorrect.
- **AFK:** The stage can run and complete autonomously without developer input. Classify as AFK when: the stage implements a well-specified deliverable, the success criteria are unambiguous, and the stage's on_failure behavior is clear.

Write `hitl: true` or `hitl: false` to each stage's `flow.json` definition. HITL stages suspend pipeline execution after completion and surface a developer review prompt before downstream stages are spawned. The developer may override the classification: output the HITL/AFK assignment for each stage and ask "Does this classification look right? (yes / override <stage-id> <hitl|afk>)" before writing `flow.json`.

## Step 3: Classify Workstreams by Domain

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

## Step 4: Create Per-Stage Prompt Files

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

## Step 5: Generate flow.json Stages

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
      "on_failure": "stop",
      "hitl": [true/false],
      "maxConsecutiveFailures": 3
    }
  ],
  "runtime": {
    "concurrency_mode": "normal",
    "harvest_id": "[run-id]"
  }
}
```

Add `"dependencies": ["stage-NNN"]` for stages that depend on other stages. Add `"isolated": true` for deployment stages and post-evaluation stages.

## Step 6: Initialize Dual-File State

Generate a run ID: `harvest-YYYYMMDD-HHMMSS`.

Create two files in `.cocoplus/harvest/`:

**`[run-id]-progress.txt`** — append-only log. Write the first entry:
```
[TIMESTAMP] [SESSION_ID] INIT [all stage IDs] CocoHarvest initialized — [N] stages, [M] parallel groups
```
Never truncate or overwrite this file. Typed entries: `INIT`, `STAGE_STARTED`, `STAGE_COMPLETED`, `STAGE_FAILED`, `STAGE_STALLED`, `ESCALATED`, `CHECKPOINT`, `RECOVERY`, `SESSION_BOUNDARY`.

**`[run-id]-tasks.json`** — structured current state. Write atomically (write to `.tmp`, rename to canonical, write `.bak`):
```json
{
  "session_config": {
    "session_id": "[run-id]",
    "max_parallel": "dynamic",
    "concurrency_mode": "normal"
  },
  "tasks": [
    {
      "id": "stage-NNN",
      "name": "[stage name]",
      "status": "pending",
      "dependencies": [],
      "priority": 1,
      "validation_commands": ["[checkpoint glob]"],
      "progress_notes": "",
      "retry_count": 0,
      "consecutive_failure_count": 0,
      "hitl": [true/false]
    }
  ]
}
```

## Step 7: Shell Identity Injection

For each stage, inject these shell environment variables into the spawned subagent's environment at spawn time:
- `COCOPLUS_FUNCTION` — Cortex AI function name from stage context (if defined)
- `COCOPLUS_PERSONA` — persona type (e.g., `data-engineer`, `data-scientist`)
- `COCOPLUS_EVAL_ID` — evaluation session identifier (if stage is an evaluation stage)
- `COCOPLUS_HARVEST_ID` — the harvest run ID for this decomposition run

These variables create an audit trail for SQL executions, shell operations, and Snowflake CLI calls without instrumenting each tool call individually.

## Step 8: Report

Output a summary:
```
CocoHarvest complete.

Workstreams decomposed: [N]
Stages generated: [N]
Parallel groups: [N independent stages that can run simultaneously]
Sequential chains: [N stages with dependencies]
HITL stages: [N] — will pause for developer review after completion
AFK stages: [N] — will run autonomously

Stage Summary:
[Table: stage ID, name, persona, HITL/AFK, dependencies]

Pipeline written to .cocoplus/flow.json
Prompt files written to .cocoplus/prompts/
Dual-file state initialized: harvest/[run-id]-progress.txt + harvest/[run-id]-tasks.json

Next: Run `$flow run` to begin execution.
```

## Runtime Behavior — Adaptive Parallelism (Enhancement G)

CocoHarvest tracks pipeline health across three concurrency modes, updated dynamically by the SubagentStop hook:

- **normal (default):** All stages whose dependencies are complete execute simultaneously.
- **caution (triggered by any stage failure):** Maximum two concurrent stages. Both must be validated before a new pair is spawned. If both fail, single-track activates.
- **single-track (triggered when >50% of completed stages have failed):** Fully sequential — each stage must complete with validated checkpoints before the next spawns.

Mode is written to `flow.json` `runtime.concurrency_mode`. Mode never auto-upgrades (developer must use `--concurrency normal` to reset). Transitions are logged to `.cocoplus/hook-errors.log`.

## Runtime Behavior — Stall Detection

If a subagent's output token rate falls below `stallTokenThreshold` (default: 150 tokens/step, configurable in `plugin.json` under `cocoHarvest.stallDetection`) for more than `stallMinSteps` (default: 5) consecutive steps, the agent is flagged as stalled. On stall: send a re-prompt. If the re-prompt produces continued low-token output at the same threshold, escalate to a failure signal for Enhancement G. Never abort a subagent without a re-prompt attempt. Log stall signals to `hook-log.jsonl`.

## Runtime Behavior — Consecutive Failure Escalation

After three consecutive hard failures from any subagent (configurable per stage via `maxConsecutiveFailures` in `flow.json`; default: 3), halt pipeline execution and escalate: surface the current failure description, the sequence of prior attempts, the last successful state, and recommended recovery options. The counter is tracked per stage in `flow.json` `runtime.consecutive_failure_count`, maintained by SubagentStop hook. Counter resets on any successful stage completion.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Assign all workstreams to a single persona to simplify execution | CocoHarvest's value is optimal persona-to-workstream matching — flattening to one persona loses specialist quality |
| Skip creating per-stage prompt files and just write flow.json | flow-run reads the prompt file path from flow.json; missing prompt files cause every stage to fail at runtime |
| Create dependency links between all stages to be "safe" | Unnecessary dependencies serialize parallel work; independence must be correctly identified to unlock parallel execution |
| Skip HITL/AFK classification | Without classification, the developer must read every finding before proceeding; classification reduces required decision burden |
| Skip dual-file state initialization | Without dual-file state, a context reset during a long pipeline requires rediscovering status from context — the files are the source of truth |

## Exit Criteria

- [ ] `.cocoplus/flow.json` has `"generated_by": "cocoharvest"`, a non-empty `stages` array, and `"runtime": {"concurrency_mode": "normal"}`
- [ ] Every stage has `"hitl": true` or `"hitl": false` and `"maxConsecutiveFailures"` defined
- [ ] A `.cocoplus/prompts/[stage-id]-prompt.md` file exists for every stage in `flow.json`
- [ ] Each stage has at least one entry in its `checkpoints` array
- [ ] `harvest/[run-id]-progress.txt` and `harvest/[run-id]-tasks.json` are initialized
- [ ] Summary output shows HITL/AFK counts alongside workstream and stage counts
