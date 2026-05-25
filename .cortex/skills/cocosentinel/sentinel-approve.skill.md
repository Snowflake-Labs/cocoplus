---
name: sentinel-approve
description: CocoSentinel approval — records SHA-bound approval for a previously evaluated artifact. Invoked via $sentinel --approve [file]. Voids automatically if the artifact is modified after approval.
version: "1.0.0"
author: CocoPlus
tags:
  - cocosentinel
  - artifact-quality
  - approval
user-invocable: true
blocking: true
---

## Objective

You are recording a SHA-bound approval for an artifact that has been evaluated by CocoSentinel. Your task is to write a formal approval record to `.cocoplus/sentinel/approvals.jsonl`.

Before proceeding, verify that `.cocoplus/` exists in the current directory. If it does not, output: "CocoPlus is not initialized in this directory. Run `$pod init` to set up the CocoPlus project bundle and try again." Then stop.

## Step 1 — Identify Artifact

The developer invoked `$sentinel --approve [file]`. If no file was provided, ask: "Which file are you approving? Provide the file path."

Read the artifact file. If it does not exist, output: "File not found: <path>." Then stop.

## Step 2 — Load Evaluation Result

Compute SHA-256 of the artifact content. Look up `.cocoplus/sentinel/<sha>.json`.

If no evaluation result exists for this SHA, output: "No CocoSentinel evaluation found for this artifact at its current state. Run `$sentinel <file>` first." Then stop.

Read the evaluation result. Check the `outcome` field.

## Step 3 — Determine Approval Path

**If outcome is APPROVED:**
- No rationale required. Proceed to Step 4.

**If outcome is CONDITIONAL:**
- Ask: "This artifact has CONDITIONAL outcome with the following BLOCKING concerns:
  [list all CONCERN (BLOCKING) findings]

  Provide written rationale for accepting this artifact despite these concerns:
  > "
- Wait for developer input. The rationale must be non-empty and substantive (at least 20 words). If too short, ask to elaborate.

**If outcome is BLOCKED:**
- Output: "Artifact is BLOCKED — one or more FAIL verdicts exist. Address the FAIL findings and re-run `$sentinel <file>` before approving."
- Then stop.

## Step 4 — Write Approval Record

Append to `.cocoplus/sentinel/approvals.jsonl`:

```json
{
  "artifact_path": "<path>",
  "artifact_sha": "<sha256>",
  "approved_at": "<ISO8601 timestamp>",
  "outcome": "<APPROVED|CONDITIONAL>",
  "conditional_rationale": "<rationale or null>"
}
```

## Step 5 — Output Confirmation

Display:
```
CocoSentinel: approval recorded.
  Artifact: <path>
  SHA: <sha>
  Outcome: <APPROVED|CONDITIONAL>
  Approved at: <timestamp>

This approval is bound to SHA <sha>. If the artifact is modified, the approval will be automatically voided
and you will be notified at the next session start.
```

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Approve a BLOCKED artifact | BLOCKED means FAIL — the approval gate exists to prevent bypassing critical quality findings |
| Accept empty rationale for CONDITIONAL | Empty rationale makes the approval unauditable — future reviewers cannot understand why the concern was accepted |
| Write approval without evaluating first | Approval without evaluation SHA creates a record that refers to no known quality assessment |

## Exit Criteria

- Approval record written to `approvals.jsonl` with correct SHA
- CONDITIONAL approvals include substantive written rationale
- BLOCKED artifacts are rejected — no approval written
