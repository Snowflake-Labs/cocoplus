---
name: "personas-list"
description: "List fixed and dynamic CocoPlus personas."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - dynamic-personas
  - v2
---

List the fixed V1 persona roster and any dynamic personas in `.cocoplus/personas/dynamic-registry.json`.

For each dynamic persona show:
- slug
- display name
- status
- evidence count
- current skill path
- history path

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
