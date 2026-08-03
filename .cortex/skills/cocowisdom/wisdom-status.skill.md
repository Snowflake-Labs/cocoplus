---
name: wisdom-status
description: "Show CocoWisdom distillation health, topic counts, and review queue state. Usage: $wisdom status"
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
