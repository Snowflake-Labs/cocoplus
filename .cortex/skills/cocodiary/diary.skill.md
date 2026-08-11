---
name: "diary"
description: "Show CocoDiary operator-facing work journal status."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocodiary
  - snow-cocoplus
---

Your objective is to implement `$diary`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/diary/` entries. Summarize entry count, latest entry, open decisions, and recent handoff notes.

Available subcommands: `$diary view`, `$diary list`, `$diary search`.

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
