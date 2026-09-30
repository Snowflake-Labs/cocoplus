---
name: "pulse-status"
description: "Report CocoPulse status and recent observations."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopulse
---

Your objective is to implement `$pulse status`.

Show enabled state, configured interval, watched artifacts, last observation, stale-work warning, and whether any pulse finding should become a Stall or Wisdom candidate.

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
