---
name: "adversary-audit"
description: "Audit CocoAdversary configuration and reviewer separation."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoadversary
---

Your objective is to implement `$adversary audit`.

Verify that adversary reviewers remained read-only, did not approve their own work, and produced evidence-linked findings. Report any reviewer lockout or critic separation violation.

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
