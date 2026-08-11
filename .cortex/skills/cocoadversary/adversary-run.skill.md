---
name: "adversary-run"
description: "Run CocoAdversary challenge review against a target."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoadversary
---

Your objective is to implement `$adversary run [--target <path|stage|plan>] [--security] [--complexity]`.

Run a read-only challenge pass that looks for incorrect assumptions, weak evidence, hidden dependencies, security risk, complexity debt, and lifecycle gate bypass. Write the report under `.cocoplus/adversary/reports/`.

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
