---
name: "style-diff"
description: "Compare current work against CocoStyle conventions."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostyle
---

Your objective is to implement `$style diff [--staged] [--path <path>]`.

Compare changed files against `.cocoplus/lifecycle/conventions.json`. Report convention matches, likely drift, and unresolved conflicts. Use source evidence links when available and avoid rewriting files automatically.

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
