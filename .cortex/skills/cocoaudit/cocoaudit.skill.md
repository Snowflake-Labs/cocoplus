---
name: cocoaudit
description: View and export the append-only session audit trail for regulated environments
version: "1.1.0"
author: sgsshankar
tags: [audit, compliance, traceability, regulated]
commands: ["$audit view", "$audit export"]
user-invocable: true
---

# CocoAudit — Session Audit Trail

## Overview
CocoAudit reads the append-only audit trail at `lifecycle/audit.md`. Every plan approval, spec gate passage, `$ship` confirmation, SecondEye acknowledgment, and CocoSentinel approval is recorded verbatim with an ISO 8601 UTC timestamp. The record is never summarized, never overwritten, and never deleted within a project's lifetime.

**Enabling CocoAudit:** Enabled at `$pod init` when the developer selects "Enable session audit trail? (recommended for regulated environments)". This creates `modes/cocoaudit.on` and initializes `lifecycle/audit.md` with a project header.

## CocoContract Lifecycle Events (Feature 44 Enhancement)

CocoAudit records four categories of CocoContract event, written by `contract-prove.js` and the archive step of `contract.skill.md` via the same `lifecycle/audit.md` append logic post-tool-use.js already uses:

1. **Contract declaration** — full text of a new outcome contract (persona, observable result, falsifiability condition) plus the session ID and timestamp of declaration.
2. **Evidence submission** — evidence tier (e2e / reference / spec / differential / unit), the function version hash at submission time, the result (pass/fail), and the verbatim evidence description.
3. **Stale-evidence detection** — recorded when a previously passing evidence check is found stale due to a function version change: the prior passing version hash, the current version hash, and the detection timestamp.
4. **Contract archive** — recorded when a contract is committed to `outcomes/`, with the contract content hash.

### `$audit ci`

Extends `$audit` with a contract regression phase that runs **before** standard audit log verification. Run `node scripts/audit-ci.js`. The regression phase reads all archived contracts in `outcomes/`, re-executes each contract's falsifiability condition where machine-executable (e2e checks against a real Cortex endpoint), and records pass/fail. A contract whose re-execution fails is a behavioral regression — reported with the same severity as a failing safety gate. Intended for use as a CI/CD pre-deployment gate.

## Commands

### `$audit view [--from <date>]`

**Steps:**
1. Check `modes/cocoaudit.on` exists — if not, output: "CocoAudit is not enabled. Enable at `$pod init` or create `modes/cocoaudit.on` manually."
2. Check `lifecycle/audit.md` exists — if not, output: "Audit trail not yet initialized. Run `$pod init` with audit enabled."
3. Read `lifecycle/audit.md` and parse `## [Event Type]` header blocks
4. Apply `--from` filter if provided: compare each block's `**Timestamp**` field to the filter date (ISO 8601 date prefix match, e.g. `2026-06-01`)
5. Without filter: show last 20 blocks; with filter: show all matching blocks
6. Render in terminal format:

```
────────────────────────────────────────
[plan-approved] 2026-06-14T10:30:00Z
Artifact: lifecycle/plan.md
Input: "looks good, proceed"
Result: Build phase unlocked
────────────────────────────────────────
```

7. Show total count: "Showing N of M total audit events"

### `$audit export`

**Steps:**
1. Check `modes/cocoaudit.on` exists
2. Check `lifecycle/audit.md` exists
3. Count total `## [` event blocks in the file
4. Generate timestamped filename: `audit-export-YYYY-MM-DDTHH-MM-SSZ.md` (colons replaced with hyphens for filesystem safety)
5. Write to `.cocoplus/audit-export-[timestamp].md`:

```markdown
# CocoAudit — Compliance Export
**Project**: [project name from lifecycle/meta.json]
**Exported**: [ISO 8601 UTC timestamp]
**Total Events**: [N]

> This document is an append-only audit trail. Records are verbatim developer inputs.
> This file must not be edited after export.

---

[Full verbatim content of lifecycle/audit.md]
```

6. Output: "Audit export written to `.cocoplus/audit-export-[timestamp].md` ([N] events)"
7. **Idempotent:** Each invocation produces a new timestamped file. Never overwrites prior exports.

## Exit Criteria
- [ ] `$audit view` renders last 20 events correctly when no `--from` filter
- [ ] `$audit view --from 2026-06-01` shows only events from that date forward
- [ ] `$audit export` produces unique timestamped files on each invocation
- [ ] Both commands fail gracefully with clear error when `modes/cocoaudit.on` absent
- [ ] Both commands fail gracefully when `lifecycle/audit.md` absent
- [ ] All four CocoContract event categories (declaration, evidence submission, stale-evidence detection, archive) are documented and recognized by `$audit view`
- [ ] `$audit ci` runs the contract regression phase before standard audit log verification and exits non-zero on any regression

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Summarize developer input | Verbatim is the requirement — paraphrasing destroys audit validity |
| Overwrite prior exports | Idempotent means new file each time, not same file |
| Use local timezone in timestamps | ISO 8601 UTC only — local timezone timestamps are not audit-grade |
| Delete or truncate audit.md | Append-only means never delete; it is a compliance artifact |
