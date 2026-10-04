---
name: "governance-status"
description: "Show CocoPlus 2.0 governance hook policy status for ReviewerLockout and PII filtering."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - governance
  - v2
---

Report the configured governance hook status from `cocoplus.toml`:

- `reviewer_lockout`: true, false, or "observe"
- `pii_filtering`: true, false, or "observe"
- `pii_log_redactions`

Then summarize recent events from `.cocoplus/lifecycle/governance-log.json`.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |

## Exit Criteria

- [ ] Command behavior matches the owning feature contract.
- [ ] Required reads, writes, and user-visible outputs are described.
- [ ] Safety, governance, and artifact constraints are preserved.
- [ ] Missing state produces a clear, non-destructive result.
