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
invoke audit-events timeline
```

The timeline is display-only. Do not modify `audit.md`.

## Exit Criteria

- Timeline output preserves audit chronological order.
- Each row shows time and the first event summary line.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |
