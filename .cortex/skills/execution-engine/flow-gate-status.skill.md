---
name: flow-gate-status
description: "Show uncleared human gates for the active CocoFlow run. Usage: $flow gate-status"
---

# CocoFlow Gate Status

Use this skill to inspect human-gated CocoFlow stages.

## Procedure

1. Read `.cocoplus/flow.json` or `.cocoplus/lifecycle/flow.json`.
2. Read `.cocoplus/lifecycle/cocoflow/<run-id>/gate-clearances.json` when present.
3. List every stage with `human_gate: true`, its reason, and whether it has been cleared.
4. If a stage is waiting, show the exact command: `$flow gate-clear <stage-id>`.

## Success Criteria

- [ ] Output is read-only.
- [ ] Cleared and waiting stages are visually distinct in text.
- [ ] No gate is cleared implicitly.
