---
name: sentinel-report
description: CocoSentinel report — displays evaluation history and approval status for artifacts in the project. Invoked via $sentinel --report.
version: "1.0.0"
author: CocoPlus
tags:
  - cocosentinel
  - artifact-quality
  - reporting
user-invocable: true
blocking: false
---

## Objective

You are generating a CocoSentinel evaluation history report for the current project.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Collect Evaluation Results

Read all JSON files in `.cocoplus/sentinel/` (excluding `approvals.jsonl` and `active-evaluation.lock`). Each file is a dimension evaluation result.

If no results exist, output: "No CocoSentinel evaluations found for this project. Run `$sentinel <file>` to evaluate an artifact." Then stop.

## Step 2 — Collect Approvals

Read `.cocoplus/sentinel/approvals.jsonl` if it exists. Index by `artifact_sha`.

## Step 3 — Build Report

For each evaluation result, cross-reference with approvals:

```
CocoSentinel Report — <project> — <current date>

Evaluations: <count>
  APPROVED:    <count>
  CONDITIONAL: <count>
  BLOCKED:     <count>

─────────────────────────────────────────────────────
Artifact                          SHA       Outcome     Approved
─────────────────────────────────────────────────────
<artifact_path>  <sha8>  APPROVED    Yes (2026-05-21)
<artifact_path>  <sha8>  CONDITIONAL Yes (with rationale)
<artifact_path>  <sha8>  BLOCKED     No
─────────────────────────────────────────────────────

Blocked Artifacts (require remediation):
  <artifact_path>: FAIL on dimensions [<list>]

Pending Approval:
  <artifact_path>: CONDITIONAL — BLOCKING concerns require developer rationale
```

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip SHA cross-reference for approvals | Without SHA matching, approvals may reference stale artifact versions — silent false confidence |
| Omit CONDITIONAL artifacts from report | Pending conditionals are the most actionable items — hiding them defeats the report's purpose |

## Exit Criteria

- Report displays all evaluations with outcomes and approval status
- Blocked artifacts are highlighted
- Conditional artifacts awaiting approval are listed
