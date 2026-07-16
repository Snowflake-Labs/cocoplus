---
name: "forge"
description: "Run CocoForge, the CocoPlus 2.0 Meta Loop Expert Team Engine. Supports `$forge \"goal\"`, `$forge goal \"goal\"`, `$forge status`, and `$forge stop`."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoforge
  - v2
---

Your objective is to operate CocoForge.

## Modes

- `$forge "goal statement"` starts Task Mode for a bounded goal.
- `$forge goal "goal statement"` starts Goal Mode, which persists across sessions.
- `$forge status` reports current forge state.
- `$forge stop` stops cleanly after the current phase and emits an early milestone gate.

## Activation

When starting a forge:
1. Verify `.cocoplus/` exists.
2. Create `.cocoplus/modes/cocoforge.on`.
3. Write `.cocoplus/lifecycle/forge-state.json` with:
   - `active: true`
   - `mode: "task"` or `"goal"`
   - `goal`
   - `iteration: 1`
   - `phase: "plan"`
   - `budget_status`
   - `team`
   - `history`
4. Append a `forge_started` event to `.cocoplus/lifecycle/forge-activity.jsonl`.
5. If CocoPilot is active, record `pilot_superseded: true`.

## Team Topology

CocoForge uses:
- Team Lead: plans iterations, dispatches specialists, synthesizes outputs, writes milestone gates.
- Quality Critic: default stance REJECT; approves only evidence that meets criteria.
- Learning Curator: captures reusable patterns and specialist refinements.
- Specialists: fixed or dynamic personas scoped to the iteration plan.

## Milestone Gate

At every gate, output:
- Goal criteria status
- What changed
- Quality Critic verdict
- Budget status
- Next iteration proposal
- Developer decision requested

## Exit Criteria

- [ ] Forge state file exists.
- [ ] Forge activity log has append-only events.
- [ ] CocoPilot resumes after forge stop if it was active before forge activation.

