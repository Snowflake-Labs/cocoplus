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
invoke audit-events add "<message>"
```

Manual entries must be labeled `Manual Entry` and `Event: manual`. They supplement hook-recorded evidence; they must never be presented as automatic HITL proof.

## Exit Criteria

- CocoAudit is enabled.
- The manual message is appended verbatim.
- Output reports the audit path and timestamp.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |
