---
name: "test"
description: "Enter the Test phase of CocoBrew. Reads spec.md test requirements, generates test cases, executes SQL validation and quality checks, records results in test.md. Can be re-run without full rebuild. Requires Build phase completion."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Test phase (4/6) of CocoBrew.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized in this directory. Run `/pod init` first." Then stop.

Read `.cocoplus/lifecycle/meta.json`. Verify `phases_completed` contains `"build"`.
If not: output "The Build phase must be completed before testing. Run `/build` first." Then stop.

## Generate Test Cases

Read `.cocoplus/lifecycle/spec.md`. For each Success Criterion and Deliverable:
1. Generate a test case that validates that criterion or deliverable exists
2. Each test case has: ID, description, test approach (SQL query / file existence / quality check), expected result

## Execute Tests

For each test case:
1. Run the test (SQL validation via SnowflakeSqlExecute if applicable, file existence check via Bash, quality check via quality-advisor)
2. Record: PASS or FAIL with actual result

## Write Test Results

Write `.cocoplus/lifecycle/test.md`:

```markdown
# Test Results

**Date:** [ISO 8601 timestamp]
**Phase:** Test (4/6)
**Phase ID:** test-YYYYMMDD-001

## Summary
- Tests Run: [count]
- Passed: [count]
- Failed: [count]

## Test Cases

### [TEST-001]: [description]
**Approach:** [SQL / file check / quality]
**Expected:** [expected result]
**Actual:** [actual result]
**Status:** PASS / FAIL

[repeat for each test case]

## Failures
[Detail any failures with remediation suggestions]
```

## Update State

Update `lifecycle/meta.json` — add test to phases_completed.
Append to AGENTS.md (≤200 lines): `Phase: Test (4/6) — [PASS/FAIL summary]`

## Git Commit

```
git add .cocoplus/lifecycle/test.md .cocoplus/lifecycle/meta.json .cocoplus/AGENTS.md
git commit -m "test: test execution and validation"
```

Output: "Test phase complete. [N] tests passed, [M] failed. Check `.cocoplus/lifecycle/test.md` for details. Proceed to `/review`."
