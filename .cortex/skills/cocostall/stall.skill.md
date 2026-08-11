---
name: "stall"
description: "Show CocoStall loop and no-progress detection status."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostall
  - snow-cocoplus
---

Your objective is to implement `$stall`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/stall/state.json` and `.cocoplus/stall/thresholds.json` when present. Summarize current stall risk, repeated failure signatures, latest no-progress loop, and recommended recovery action.

Available subcommands: `$stall status`, `$stall thresholds`, `$stall reset`.

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
