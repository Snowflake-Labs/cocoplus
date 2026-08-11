---
name: wisdom-status
description: "Show CocoWisdom distillation health, topic counts, and review queue state. Usage: $wisdom status"
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
---

# CocoWisdom Status

Use this skill to inspect the health of CocoWisdom maintenance.

## Output

Report:

- Wisdom schema path and whether it exists.
- Injection mode from `[wisdom].injection_mode`.
- Topic/category file count.
- Review queue depth.
- Most recent distillation report timestamp.
- Whether Stop hook auto-distillation is enabled.

## Success Criteria

- [ ] Status is read-only.
- [ ] Missing schema or review queue is reported clearly.
- [ ] Progressive loading posture is visible.

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
