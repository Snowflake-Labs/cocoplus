---
name: "adversary-disable"
description: "Disable CocoAdversary challenge review mode."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoadversary
---

Your objective is to implement `$adversary disable [--reason "<text>"]`.

Disable the mode by recording an explicit state transition. Preserve prior adversary reports and open gaps.

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
