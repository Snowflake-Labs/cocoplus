---
name: pod-checkpoint
description: Write a structured CocoHealth recovery snapshot to lifecycle/checkpoint.md before context reset
version: 1.0.2
user-invocable: true
command: $pod checkpoint
author: "CocoPlus"
tags:
  - cocoplus
feature: CocoHealth (Feature 27)
---

This is the canonical CocoHealth location for `$pod checkpoint`.

Load `.cortex/skills/cocopod/pod-checkpoint.skill.md` and follow it exactly. The command remains `$pod checkpoint`; this file exists so the Feature 27 CocoHealth skill path matches the reference directory structure while preserving the CocoPod subcommand implementation.

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
