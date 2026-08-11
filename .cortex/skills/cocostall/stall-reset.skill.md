---
name: "stall-reset"
description: "Reset CocoStall counters after an operator-approved recovery."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostall
---

Your objective is to implement `$stall reset [--run-id <id>] [--reason "<text>"]`.

Reset stall counters only after recording the recovery reason, timestamp, and operator-visible state transition. Do not delete stall history; append a reset event.

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
