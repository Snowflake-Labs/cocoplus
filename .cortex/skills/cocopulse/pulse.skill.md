---
name: "pulse"
description: "Show CocoPulse ambient progress observer status."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopulse
  - snow-cocoplus
---

Your objective is to implement `$pulse`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/modes/pulse.on` and `.cocoplus/pulse/config.json` when present. Report enabled state, interval, watched artifacts, last pulse, and next expected progress check.

Available subcommands: `$pulse on`, `$pulse off`, `$pulse status`, `$pulse configure`.

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
