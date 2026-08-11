---
name: "wisdom-consolidation-log"
description: "View CocoWisdom consolidation exceptions. Usage: $wisdom consolidation-log"
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocowisdom, memory, consolidation]
user-invocable: true
---

# CocoWisdom Consolidation Log

Use this skill for `$wisdom consolidation-log`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Read `.cocoplus/wisdom/consolidation-log.md` and display entries in reverse chronological order. If the file does not exist, output: "No CocoWisdom consolidation exceptions recorded."

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
