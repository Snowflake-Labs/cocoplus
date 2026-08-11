---
name: "trace-compare"
description: "Compare CocoTrace asset health snapshots. Usage: $trace compare <before.json> <after.json>"
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocotrace, health, thermal-receipt]
user-invocable: true
---

# CocoTrace Compare

Use this skill for `$trace compare <before.json> <after.json>`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Run:

```text
invoke cocotrace/health-grader --compare <before.json> <after.json>
```

Display the thermal receipt exactly as a before/after delta, for example:

```text
blast radius 23 -> 18 v / health B+ -> A- ^
```

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
