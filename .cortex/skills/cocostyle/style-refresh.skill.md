---
name: "style-refresh"
description: "Refresh CocoStyle conventions from project evidence."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostyle
---

Your objective is to implement `$style refresh [--source <path>] [--learning]`.

Read existing conventions plus targeted project evidence such as docs, plans, changelog entries, and accepted reviews. Update `.cocoplus/lifecycle/conventions.json` with evidence-backed rules only. In learning mode, mark suggestions as proposed until accepted.

Never turn a one-off preference into a global convention without evidence or explicit operator confirmation.

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
