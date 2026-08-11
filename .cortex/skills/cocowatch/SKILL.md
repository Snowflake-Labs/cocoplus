---
name: "cocowatch"
description: "Developer engagement observer — non-blocking, always-on observational layer that tracks Delegation Intensity, Review Depth, and Engagement Zone throughout a session. Summary surfaced at $ship and FULL checkpoints."
blocking: false
user-invocable: false
version: "1.0.3"
author: "CocoPlus"
tags:
  - cocoplus
  - engagement-observer
---

This file is the canonical loader path for CocoWatch. Its behavioral contract is maintained in `cocowatch.skill.md` in the same directory.

Load `cocowatch.skill.md` and follow it exactly. The `blocking: false` and `user-invocable: false` frontmatter here are structural guarantees for loaders that expect a conventional `SKILL.md` entry point.

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
