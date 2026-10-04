---
name: "style-status"
description: "Report CocoStyle health and drift state."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostyle
---

Your objective is to implement `$style status`.

Report whether conventions are initialized, mode is set, refresh is stale, proposed rules are awaiting acceptance, and current work has unresolved style drift.

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
