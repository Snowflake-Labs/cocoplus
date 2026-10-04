---
name: "stall-thresholds"
description: "Show or update CocoStall thresholds."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostall
---

Your objective is to implement `$stall thresholds [--set <name=value>]`.

Read or update `.cocoplus/stall/thresholds.json`. Threshold changes must preserve kill-switch and safety-gate behavior. Report previous value, new value, and why the threshold matters.

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
