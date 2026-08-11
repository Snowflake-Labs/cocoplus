---
name: flow-gate-clear
description: "Clear a declared human gate for a CocoFlow stage. Usage: $flow gate-clear <stage-id>"
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
---

# CocoFlow Gate Clear

Use this skill when a stage declares `human_gate: true` and the operator intentionally allows dispatch.

## Procedure

1. Require `<stage-id>`.
2. Resolve the active run id from `.cocoplus/flow.json`, `.cocoplus/lifecycle/flow.json`, or `COCOPLUS_RUN_ID`.
3. Write or update `.cocoplus/lifecycle/cocoflow/<run-id>/gate-clearances.json` with:
   - `stage_id`
   - `cleared_at`
   - `operator`
   - `source: "$flow gate-clear"`
4. Append an audit entry to `.cocoplus/lifecycle/audit.md`.
5. Do not modify `.cocoplus/STEER.md`; gate clearance is never injected through steering.

## Success Criteria

- [ ] The stage clearance exists in the run clearance file.
- [ ] The audit trail records the operator action.
- [ ] Subsequent PreToolUse dispatch can proceed for that stage.

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
