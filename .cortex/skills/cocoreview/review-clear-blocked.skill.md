---
name: "review-clear-blocked"
description: "Resolve a BLOCKED CocoReview finding with a recorded rationale, unblocking $ship if no other BLOCKING or BLOCKED findings remain. Usage: $review clear-blocked --id <finding-id> --rationale <text>."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoreview
user-invocable: true
blocking: false
---

Your objective is to resolve a `BLOCKED` CocoReview finding.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Parse arguments: `$review clear-blocked --id <finding-id> --rationale <text>`. Both are required. If either is missing: output "Usage: $review clear-blocked --id <finding-id> --rationale <text>" Then stop.

## Steps

1. Read `.cocoplus/lifecycle/review-state.json`. If it does not exist or the named finding is not present: output "Finding [id] not found in review-state.json." Then stop.
2. Verify the finding's `severity` is `BLOCKED`. If it is not: output "Finding [id] is not a BLOCKED finding (severity: [severity]). $review clear-blocked only resolves BLOCKED findings." Then stop.
3. If already `resolved: true`: output "Finding [id] is already resolved." Then stop.
4. Record the rationale in the audit trail via the same append logic `post-tool-use.js` uses for `lifecycle/audit.md` (if CocoAudit is enabled): event type `blocked-finding-resolved`, artifact the finding ID, developer input the verbatim rationale.
5. Update the finding in `review-state.json`: set `resolved: true`, `resolved_at: <ISO 8601 timestamp>`, `resolution_rationale: <text>`.
6. Check whether any other `BLOCKING` or unresolved `BLOCKED` finding remains in `review-state.json`.
   - If none remain: output "Finding [id] resolved. No other BLOCKING or BLOCKED findings remain — $ship is unblocked."
   - If others remain: output "Finding [id] resolved. [N] BLOCKING/BLOCKED finding(s) still require resolution before $ship: [list IDs]."

## Exit Criteria

- `review-state.json` is updated with `resolved: true`, a timestamp, and the verbatim rationale for the named finding
- The rationale is recorded in the audit trail when CocoAudit is enabled
- `$ship` proceeds only when zero unresolved `BLOCKING` or `BLOCKED` findings remain

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Accept an empty or placeholder rationale ("resolved", "fine") | The rationale is the audit record of a human decision — a vacuous rationale defeats the purpose of requiring one |
| Resolve a `blocking` (not `BLOCKED`) finding through this command | `$review clear-blocked` exists specifically for decisions outside the reviewer's authority — regular `blocking` findings are resolved by fixing the code, not by rationale |
| Skip the audit record when CocoAudit happens to be disabled | Still update `review-state.json` — the resolution must be tracked even without the compliance audit trail |
