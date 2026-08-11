---
name: "lex"
description: "Show CocoLex project lexicon status."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocolex
  - snow-cocoplus
---

Your objective is to implement `$lex`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/lexicon.md` and any `.cocoplus/lexicon/*.md` files. Summarize defined term count, undefined candidates, conflicts, and stale extracted terms.

Available subcommands: `$lex define`, `$lex list`, `$lex show`, `$lex extract`, `$lex validate`.

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
