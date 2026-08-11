---
name: "adversary"
description: "Show CocoAdversary reviewer configuration and latest challenge results."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoadversary
  - snow-cocoplus
---

Your objective is to implement `$adversary`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/modes/adversary.on`, `.cocoplus/adversary/config.json`, and recent adversary reports. Summarize enabled state, configured challenge depth, latest high-severity finding, and known gaps.

Available subcommands: `$adversary enable`, `$adversary disable`, `$adversary run`, `$adversary show`, `$adversary audit`, `$adversary gap`.

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
