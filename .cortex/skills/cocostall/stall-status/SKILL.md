---
name: "stall-status"
description: "Report current CocoStall no-progress and loop state."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostall
---

Your objective is to implement `$stall status [--run-id <id>]`.

Report repeated tool failures, unchanged findings, unmet checkpoints, and whether the agent is approaching a blocked threshold. Distinguish hard blockers from work that is merely slow.

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
