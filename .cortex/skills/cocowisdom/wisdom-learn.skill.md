---
name: "wisdom-learn"
description: "Record a curated CocoWisdom learning with optional session and rationale metadata."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocowisdom
---

Your objective is to implement `$wisdom learn "<text>" [--session <session-id>] [--reason <text>]`.

Append the learning to `.cocoplus/wisdom/learnings.md` with Date, Learning text, Reason, Source session, and whether it is positive guidance or should be routed to `$wisdom reject`.

If the learning describes a rejected approach, route to `wisdom-reject` instead of writing positive guidance.

Exit after writing and committing the learning artifact.

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
