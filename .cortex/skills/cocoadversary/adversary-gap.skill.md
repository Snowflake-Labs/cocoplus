---
name: "adversary-gap"
description: "Record or show known CocoAdversary coverage gaps."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoadversary
---

Your objective is to implement `$adversary gap [--add "<gap>"] [--close <id>]`.

Track known blind spots in `.cocoplus/adversary/gaps.md`. Gap changes require timestamp, source, status, and reason. Closing a gap must point to evidence.

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
