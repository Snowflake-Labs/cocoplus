---
name: audit-add
description: Add a clearly marked manual CocoAudit event. Usage: $audit add "<message>".
version: "1.0.0"
author: CocoPlus
tags:
  - cocoaudit
  - audit
user-invocable: true
blocking: true
---

Append a manual audit event to `.cocoplus/lifecycle/audit.md`.

Run:

```text
node scripts/audit-events.js add "<message>"
```

Manual entries must be labeled `Manual Entry` and `Event: manual`. They supplement hook-recorded evidence; they must never be presented as automatic HITL proof.

## Exit Criteria

- CocoAudit is enabled.
- The manual message is appended verbatim.
- Output reports the audit path and timestamp.
