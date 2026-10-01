---
name: "personas-dissolve"
description: "Dissolve a dynamic persona while preserving its history."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - dynamic-personas
  - v2
---

Dissolve a dynamic persona when it is no longer relevant.

1. Mark the persona `dissolved` in `.cocoplus/personas/dynamic-registry.json`.
2. Retain `personas/{slug}/history.md`.
3. Do not delete prior evidence.
4. Record the dissolution rationale in the history file.

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
