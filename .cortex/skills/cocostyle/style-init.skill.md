---
name: "style-init"
description: "Initialize CocoStyle project convention capture."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostyle
---

Your objective is to implement `$style init`.

Create `.cocoplus/lifecycle/conventions.json` when missing. Seed it with schema version, created timestamp, source list, mode, and an empty conventions array. Do not infer rules from large files unless the operator also requested `$style refresh`.

Exit with the convention file path and next recommended command.

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
