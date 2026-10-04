---
name: "pulse-configure"
description: "Configure CocoPulse observation intervals and scopes."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopulse
---

Your objective is to implement `$pulse configure [--interval <duration>] [--watch <path>]`.

Update `.cocoplus/pulse/config.json` with interval, watched paths, stale thresholds, and reporting mode. Reject configurations that would weaken active safety gates or bypass lifecycle evidence requirements.

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
