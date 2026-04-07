---
name: "spec"
description: "Enter the Spec phase of CocoBrew. Guides the developer through structured requirements capture: goal, success criteria, constraints, personas involved, data sources, and deliverables. Writes spec.md to .cocoplus/lifecycle/ and creates a git commit."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Spec phase (1/6) of the CocoBrew lifecycle. Your objective is to capture complete project requirements through structured dialogue.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus is not initialized in this directory. Run `/pod init` to set up the CocoPlus project bundle and try again." Then stop.

Check `.cocoplus/lifecycle/meta.json`. If `current_phase` is not `not_started` and not `spec`:
Output: "Current phase is [phase]. The Spec phase can only be entered from the beginning or re-entered to update requirements. Proceed? (yes/no)"
If no: stop.

## Requirements Capture Dialogue

Ask each question in sequence. Wait for the developer's response before proceeding to the next question. Do not batch questions.

**Question 1:** What is the primary goal of this project? (Be specific — what problem does it solve and for whom?)

**Question 2:** What are the success criteria? (How will you know this project succeeded? List 2-5 measurable outcomes.)

**Question 3:** What are the key constraints? (Timeline, data volume, performance requirements, budget, regulatory requirements — list what applies.)

**Question 4:** Who are the personas involved? (Which specialist roles will work on this? e.g., Data Engineer, Analytics Engineer, Data Scientist, BI Analyst)

**Question 5:** What are the key data sources? (List tables, schemas, external feeds, or data systems this project reads from or writes to.)

**Question 6:** What are the critical deliverables? (What artifacts, tables, models, notebooks, or dashboards must exist when this project is complete?)

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

## Constraints
[Developer's answers to Question 3, formatted as bullet list]

## Personas
[Developer's answers to Question 4, formatted as bullet list]

## Data Sources
[Developer's answers to Question 5, formatted as bullet list]

## Deliverables
[Developer's answers to Question 6, formatted as bullet list]
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
