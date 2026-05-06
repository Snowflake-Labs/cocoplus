---
name: "review"
description: "Enter the Review phase of CocoBrew. Aggregates findings from Code Quality Advisor, CocoCupper intelligence, spec compliance check, and decision coverage gate. Produces review.md with decision points. Requires developer approval before /ship can proceed."
version: "1.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Review phase (5/6) of CocoBrew.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

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

**5. Decision Coverage Check**

Extract key decisions from `plan.md` (and `discuss.md` if it exists): evaluation target, data source, accuracy threshold, model to use, warehouse assignment, production safety requirements.

For each extracted decision, scan implementation artifacts — SQL functions, evaluation configurations, `flow.json` stage definitions, prompt files — for evidence that the decision is honored in the implementation.

A decision is **honored** if the artifact reflects the stated value or approach. A decision is a **Coverage Gap** if it is present in plan/discuss but absent or contradicted in the implementation.

Coverage Gaps are severity-equivalent to must-fix. `/ship` is blocked until all Coverage Gaps are resolved or explicitly acknowledged with a documented rationale written into `review.md`.

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

## Decision Coverage
| Decision | Source | Honored | Notes |
|----------|--------|---------|-------|
[Table of plan/discuss decisions vs implementation evidence]
Coverage Gaps (if any): [list — each blocks /ship until resolved or acknowledged with rationale]

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

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Approve the review automatically if no critical findings exist | Developer must explicitly approve — auto-approval bypasses the mandatory human gate |
| Skip spec compliance check if tests all passed | Tests passing does not mean spec criteria are covered; compliance check verifies mapping, not just pass rate |
| Write review.md before aggregating all sources | Missing a source (CocoCupper, quality findings, decision coverage) produces an incomplete review that under-reports problems |
| Treat Coverage Gaps as advisory | Coverage Gaps block /ship the same as must-fix findings — tests verify what code does; coverage verifies what it was meant to do |

## Exit Criteria

- [ ] `.cocoplus/lifecycle/review.md` exists with `## Spec Compliance`, `## Decision Coverage`, and `## Approval Status` sections
- [ ] `## Decision Coverage` table lists every key decision from `plan.md` and `discuss.md` (if present) with honored/gap status
- [ ] `## Approval Status` contains `APPROVED` (not just `PENDING`)
- [ ] `.cocoplus/lifecycle/meta.json` `phases_completed` array contains `"review"`
- [ ] Git commit with message `docs(review): quality and compliance review approved` exists in log
