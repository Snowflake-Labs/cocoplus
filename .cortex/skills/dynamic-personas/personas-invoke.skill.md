---
name: "personas-invoke"
description: "Invoke a dynamic persona by slug when evidence threshold has been met."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - dynamic-personas
  - v2
---

Invoke a dynamic persona from `.cocoplus/personas/dynamic-registry.json`.

If the persona status is not `active`, stop and explain which evidence threshold is missing.
If active, load `personas/{slug}/skill.md` and `personas/{slug}/history.md`, then route the request to that specialist with the same scope discipline used by fixed personas.

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
