---
name: "wisdom-keep"
description: "Protect a CocoWisdom entry from consolidation. Usage: $wisdom keep --id <id> --text \"<rule>\""
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocowisdom, memory, must-keep]
user-invocable: true
---

# CocoWisdom Keep

Use this skill for `$wisdom keep --id <id> --text "<rule>"`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Run:

```text
invoke cocowisdom/wisdom-route --keep --id <id> --text "<rule>"
```

The command appends a protected entry to `.cocoplus/wisdom/must-keep.md`. Must-keep entries are exempt from automatic consolidation.

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
