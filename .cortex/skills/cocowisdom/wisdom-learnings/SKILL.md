---
name: "wisdom-learnings"
description: "List explicit CocoWisdom learning and rejection records."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocowisdom
---

Your objective is to implement `$wisdom learnings [--filter <text>]`.

Read `.cocoplus/wisdom/learnings.md` and `.cocoplus/wisdom/do-not-use.md`, then display a filtered list with date, category, summary, and source session. Negative records must remain clearly marked as do-not-use guidance.

Exit when the operator has a concise list of matching learning records or a clear "No matching learnings found" message.

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
