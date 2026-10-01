---
name: cocolean
description: CocoLean — minimum viable Cortex surface discipline. Pre-build decision ladder and intensity mode management. Invoke with $lean, $lean lite, $lean full, or $lean ultra.
version: "1.0.0"
author: sgsshankar
tags:
  - cocolean
  - complexity-prevention
  - technical-debt
user-invocable: true
blocking: true
---

## Objective

You are executing CocoLean — the minimum viable Cortex surface discipline. Your task depends on how this skill was invoked:

- `$lean` / `$lean full` — activate full mode (all three CocoLean modes), run the pre-build decision ladder
- `$lean lite` — switch to lite mode (ladder only), run the pre-build decision ladder
- `$lean ultra` — switch to ultra mode (full + enforcement), run the pre-build decision ladder
- `$lean` with no prior context — treat as `$lean full`

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Set Intensity Level

Parse the invocation:

| Command | Mode | Write to `.cocoplus/modes/lean.mode` |
|---------|------|--------------------------------------|
| `$lean lite` | `lite` | `lite` |
| `$lean full` | `full` | `full` |
| `$lean ultra` | `ultra` | `ultra` |
| `$lean` | `full` (default) | `full` |

Write the mode string to `.cocoplus/modes/lean.mode`. Confirm: "CocoLean mode set to [mode]."

If `.cocoplus/modes/lean.mode` already exists, read its current value and note the change: "CocoLean mode changed from [previous] to [new]."

## Step 2 — Run the Pre-Build Decision Ladder

Surface the six-rung Cortex-adapted decision ladder. Present it as a checklist the developer must work through before writing any new Cortex AI function, pipeline stage, or subagent:

```
CocoLean Decision Ladder — work top to bottom, stop at the first YES:

[ ] Rung 1: Can a deterministic rule, SQL expression, lookup table, or threshold accomplish this without AI inference?
[ ] Rung 2: Does a Snowflake native built-in handle it? (FLATTEN, MATCH_RECOGNIZE, window functions, conditional expressions, SEARCH, OBJECT_CONSTRUCT…)
[ ] Rung 3: Does an existing UDF, stored procedure, or Cortex function in this project already solve this?
[ ] Rung 4: Would a single AI_COMPLETE call with a well-scoped prompt be sufficient?
[ ] Rung 5: Can the minimum working function be written in under ten lines? (Write the minimum version first — complexity is earned, not assumed.)
[ ] Rung 6: A full Cortex function or multi-stage pipeline is justified. Proceed to build.
```

Ask the developer: "Which rung does this task land on?"

## Step 3 — Rung-Dependent Response

**Rungs 1–3:** Suggest the cheaper alternative explicitly. Provide a concrete example or point to the existing construct. Do not proceed to build.

**Rung 4:** Confirm: "A single `AI_COMPLETE` call is preferred. Scope the prompt carefully. Build the prompt first, evaluate on at least 10 labeled examples before wrapping in a function."

**Rung 5:** Confirm: "Write the minimum version first. Ten lines or fewer. Evaluate. Extend only if the minimum is demonstrably insufficient."

**Rung 6:** In `lite` or `full` mode — proceed with build after noting the ladder traversal in a comment. In `ultra` mode — if the developer's answer to Rung 1 is contested (the task appears deterministically solvable without AI), request explicit rationale before `$plan` proceeds: "Ultra mode requires a recorded rationale when skipping Rung 1. State why deterministic logic is insufficient."

## Step 4 — Reminder of Active Modes

After the ladder interaction, display active mode context:

**Lite mode:** Decision ladder active. `$lean review` and `$lean debt` are available but not automatically triggered.

**Full mode:** All three CocoLean modes active. Run `$lean review` before any commit. Run `$lean debt` before any sprint planning or release gate.

**Ultra mode:** All three modes active with enforcement. In ultra mode, contested Rung 1 decisions require explicit rationale before `$plan` proceeds.

## Non-Negotiable Carve-Outs

The following are ALWAYS exempt from the decision ladder — CocoLean never asks whether these should be simplified:

- Trust boundary implementations (input validation at every cross-boundary entry point)
- Data loss prevention mechanisms (every write path has a recovery route)
- Security controls (access validation, credential handling, injection defense)
- Regulatory compliance requirements (audit trail completeness, data residency enforcement)
- Error handling that prevents silent data corruption
- Capabilities the developer has explicitly requested by name in the spec

## Exit Criteria

- Intensity mode written to `.cocoplus/modes/lean.mode`
- Decision ladder presented and traversed
- Rung-appropriate response given (alternative suggested, or build approved)
- Ultra-mode enforcement applied when Rung 1 is contested

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Skip the ladder because the developer "obviously" needs a Cortex function | Each rung skipped is unexamined complexity — the ladder takes 60 seconds, a wrong abstraction takes days to undo |
| Apply the ladder to security controls or trust boundaries | Carve-outs are non-negotiable — CocoLean's discipline applies to the function layer, not the safety layer |
| Treat ultra mode enforcement as optional | Ultra mode exists precisely because developers know they need the enforcement when they set it |
