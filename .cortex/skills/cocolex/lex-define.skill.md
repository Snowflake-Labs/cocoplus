---
name: "lex-define"
description: "Define or update a CocoLex project term."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocolex
---

Your objective is to implement `$lex define <term> "<definition>" [--source <path>]`.

Append or update the term in `.cocoplus/lexicon.md` with definition, aliases, source evidence, owner when known, and timestamp. If a conflicting definition exists, report the conflict instead of overwriting silently.

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
