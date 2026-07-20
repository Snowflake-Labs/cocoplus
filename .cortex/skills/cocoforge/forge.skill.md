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
- `$forge "goal statement" --ladder` starts Task Mode with the refinement ladder enabled.
- `$forge goal "goal statement"` starts Goal Mode, which persists across sessions.
- `$forge status` reports current forge state.
- `$forge stop` stops cleanly after the current phase and emits an early milestone gate.
- `$forge resolve-dispute` exits a refinement-ladder deadlock and requests developer judgment.

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

## Refinement Ladder

When `--ladder` is enabled, the Quality Critic treats achieved rungs as floors. Default rungs are 85, 90, 95, and 99. If a later iteration drops below the current floor, the Critic rejects it even if it improves another dimension. After two failed fix cycles at the same rung, the forge enters dispute state and requires `$forge resolve-dispute`.

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
- [ ] Ladder sessions preserve the current floor, score trend, and dispute state in `forge-state.json`.

