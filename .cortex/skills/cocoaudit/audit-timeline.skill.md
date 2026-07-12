---
name: audit-timeline
description: Render CocoAudit records as a compact chronological timeline. Usage: $audit timeline.
version: "1.0.0"
author: CocoPlus
tags:
  - cocoaudit
  - audit
user-invocable: true
blocking: false
---

Render the append-only audit trail as a compact timeline.

Run:

```text
node scripts/audit-events.js timeline
```

The timeline is display-only. Do not modify `audit.md`.

## Exit Criteria

- Timeline output preserves audit chronological order.
- Each row shows time and the first event summary line.
