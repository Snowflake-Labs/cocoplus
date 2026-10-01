---
name: flow-gate-status
description: "Show uncleared human gates for the active CocoFlow run. Usage: $flow gate-status"
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
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
