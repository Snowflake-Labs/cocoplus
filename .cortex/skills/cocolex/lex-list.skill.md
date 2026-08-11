---
name: "lex-list"
description: "List CocoLex terms."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocolex
---

Your objective is to implement `$lex list [--filter <text>] [--undefined]`.

Display lexicon terms alphabetically with status, source count, and short definition. With `--undefined`, list extracted candidates that still need an accepted definition.

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
