---
name: "review"
description: "Enter the Review phase of CocoBrew. Aggregates findings from Code Quality Advisor, CocoCupper intelligence, and spec compliance check. Produces review.md with decision points. Requires developer approval before /ship can proceed."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Review phase (5/6) of CocoBrew.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized in this directory. Run `/pod init` first." Then stop.

Read `.cocoplus/lifecycle/meta.json`. Verify `phases_completed` contains `"test"`.
If not: output "The Test phase must be completed before review. Run `/test` first." Then stop.

## Aggregate Findings

Collect from these sources:

**1. Code Quality Findings**
Look for files matching `.cocoplus/quality-findings-*.md`. Read all and extract critical and high severity findings.

**2. CocoCupper Findings**
Read `.cocoplus/grove/cupper-findings.md`. Extract the most recent 5 findings.

**3. Spec Compliance Check**
Read `.cocoplus/lifecycle/spec.md` (Success Criteria, Deliverables) and `.cocoplus/lifecycle/test.md`.
For each success criterion: was it tested? Did it pass?
For each deliverable: does the file/table/artifact exist?

**4. Test Summary**
Read `.cocoplus/lifecycle/test.md`. Extract pass/fail summary.

## Write Review Document

Write `.cocoplus/lifecycle/review.md`:

```markdown
# Review Report

**Date:** [ISO 8601 timestamp]
**Phase:** Review (5/6)
**Phase ID:** review-YYYYMMDD-001

## Quality Findings
[Critical and high severity findings from Code Quality Advisor]
If none: "No critical quality findings."

## Intelligence Insights
[CocoCupper findings — top 5]
If none: "No CocoCupper analysis available."

## Spec Compliance
| Criterion | Tested | Result |
|-----------|--------|--------|
[Table of success criteria vs test results]

## Deliverable Checklist
| Deliverable | Present | Notes |
|-------------|---------|-------|
[Table of deliverables vs existence check]

## Test Summary
Passed: [N] / [Total]

## Decision Points
[List any items requiring developer decision before shipping]

## Approval Status
PENDING DEVELOPER APPROVAL
```

## Request Developer Approval

Present the review summary and ask:
"Review complete. Do you approve this review and want to proceed to Ship? (yes/no/revise)"

- If yes: update review.md `## Approval Status` to `APPROVED — [timestamp]`
- If no: output "Review rejected. Rework required. Re-run phases as needed."
- If revise: output "Which section needs revision? (quality/compliance/test)"

## Update State

Only if approved: Update `lifecycle/meta.json` — add review to phases_completed.
Append to AGENTS.md (≤200 lines): `Phase: Review (5/6) — APPROVED`

## Git Commit (only if approved)

```
git add .cocoplus/lifecycle/review.md .cocoplus/lifecycle/meta.json .cocoplus/AGENTS.md
git commit -m "docs(review): quality and compliance review approved"
```

Output: "Review approved. Commit created. You may now proceed to `/ship`."
