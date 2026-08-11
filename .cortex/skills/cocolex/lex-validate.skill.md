---
name: "lex-validate"
description: "Validate project text against CocoLex definitions."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocolex
---

Your objective is to implement `$lex validate [--path <path>]`.

Check targeted text for undefined terms, conflicting terminology, stale aliases, and definitions that contradict accepted Wisdom or Style conventions. Report findings without modifying files.

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
