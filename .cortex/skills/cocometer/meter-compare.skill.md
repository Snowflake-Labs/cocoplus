---
name: "meter-compare"
description: "Compare CocoMeter accuracy and cost results with correctness-first ordering. Usage: $meter compare <before.json> <after.json>."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - comparison
---

Use this skill for `$meter compare`.

## Objective

Compare two CocoMeter or harness benchmark result files while respecting the configured optimization objective. The default is correctness-first: accuracy delta is the primary signal and token/cost delta is secondary.

CocoMeter session summaries may include three named cost rows:
- `execution_cost`: functional stage work.
- `coordination_cost`: advisor calls, handoff context assembly, artifact transfer, and status sync.
- `landing_cost`: reserve-window spend for final evaluation, console update, and handoff.

## Workflow

1. Parse `$meter compare <before.json> <after.json>`.
2. Read both files. Accept fields named `accuracy`, `score`, `task_accuracy`, `cost`, `tokens`, or `credits`.
3. Read `cocoplus.toml [meter]`:
   - `optimization_objective`, default `correctness-first`
   - `accuracy_equivalence_band`, default `0.02`
   - `cost_first_acknowledged`, default `false`
4. Compute accuracy delta before cost delta.
5. If objective is `cost-first` but `cost_first_acknowledged` is not true, treat the run as correctness-first and warn.

## Output Order

Always lead with accuracy unless cost-first is both configured and acknowledged:

```text
Accuracy: +3.2%
Cost: +12.0% (accepted because accuracy improved)
Verdict: improvement under correctness-first objective
```

If cost falls but accuracy regresses:

```text
Accuracy: -1.5%
Cost: -18.0%
Verdict: regression under correctness-first objective
WARNING: cost reduction accompanied by accuracy regression.
```

## Exit Criteria

- [ ] Accuracy delta appears before cost delta by default.
- [ ] Cost reduction is never labeled as improvement when accuracy regresses.
- [ ] Equivalent accuracy uses the configured band.
- [ ] Missing or malformed input files fail with a clear diagnostic.
- [ ] Coordination and landing costs remain separate from execution cost when present.
