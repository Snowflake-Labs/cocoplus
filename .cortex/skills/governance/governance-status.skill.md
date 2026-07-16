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

