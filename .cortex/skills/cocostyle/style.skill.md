---
name: "style"
description: "Show CocoStyle convention status for the current project."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostyle
  - snow-cocoplus
---

Your objective is to implement `$style`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/lifecycle/conventions.json` and `.cocoplus/modes/style.mode` when present. Summarize active style mode, convention count, last refresh time, and any stale or conflicting rules.

Available subcommands: `$style init`, `$style refresh`, `$style show`, `$style mode`, `$style diff`, `$style status`.

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
