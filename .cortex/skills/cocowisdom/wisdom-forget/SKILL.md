---
name: "wisdom-forget"
description: "Remove a must-keep CocoWisdom entry with rationale. Usage: $wisdom forget --id <id> --rationale \"<reason>\""
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocowisdom, memory, forget]
user-invocable: true
---

# CocoWisdom Forget

Use this skill for `$wisdom forget --id <id> --rationale "<reason>"`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Run:

```text
invoke cocowisdom/wisdom-route --forget --id <id> --rationale "<reason>"
```

Forgetting without a rationale is rejected. The rationale is appended to `.cocoplus/wisdom/consolidation-log.md`.

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
