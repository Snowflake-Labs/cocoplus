---
name: "session"
description: "Manage CocoSession multi-session continuity, iteration budget, operator kill-switch state, one-shot steering, and predicate context. Supports `$session status`, `$session progress`, `$session steer`, `$session stop`, and `$session resume`."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocosession
  - continuity
---

Your objective is to manage CocoSession, the continuity and operator-control layer for long-running CocoPlus work.

## Commands

- `$session status`: read `.cocoplus/session/PROGRESS.md`, `.cocoplus/session/CONTEXT.md`, `.cocoplus/session/iteration-budget.json`, `.cocoplus/AGENT_STOP`, and `.cocoplus/STEER.md`; report handoff freshness, active predicate state, queued work count, iteration budget, kill-switch state, and pending steering.
- `$session progress`: show the four handoff sections from `.cocoplus/session/PROGRESS.md`: Done, In Progress, Next, Notes.
- `$session steer "<instruction>"`: write the instruction to `.cocoplus/STEER.md`. The UserPromptSubmit hook injects it once, appends a session event, then clears the file.
- `$session stop`: create `.cocoplus/AGENT_STOP` with timestamp, operator, and reason. The PreToolUse hook blocks tool use while the sentinel exists.
- `$session resume`: remove `.cocoplus/AGENT_STOP` after confirming the operator intends to resume.

## Continuity Contract

Every CocoFlow or long-running operator session must be recoverable from files alone:

1. `.cocoplus/session/PROGRESS.md` is the human handoff.
2. `.cocoplus/session/CONTEXT.md` is machine-greppable predicate state in `CLASS.key=value` form.
3. `.cocoplus/session/task-queue.jsonl` records mid-session requests without replacing the active item.
4. New work is queued under Next unless the operator explicitly changes the current item.
5. `.cocoplus/session/iteration-budget.json` tracks cap, consumed turns, warning threshold, and stop state.

Read `PROGRESS.md` before resuming any long-running work. Cite `CONTEXT.md` predicates verbatim; do not paraphrase them into new state.

## Iteration Budget

`cocoplus.toml [session]` controls:

```toml
max_iterations = 200
iteration_warn_at = 160
```

The PostToolUse hook increments the consumed counter. At `warn_at`, CocoSession records a proactive checkpoint request in `session/steps.jsonl`. At `cap`, it creates `.cocoplus/AGENT_STOP` and writes the final budget state so the operator gets a clean handoff instead of an exhausted context window.

`PROGRESS.md` must include:

```markdown
## Iteration Budget
Cap: 200
Consumed: 0
Warn At: 160
```

## ctx Supplement

When ctx is available, CocoSession may read `cortex ctx show all` as a supplement to `PROGRESS.md`:

- ctx tasks in task-list state map to `In Progress`.
- ctx ready steps map to `Next`.
- ctx discoveries map to session context additions.

Hard constraints:

- Never set `CTX_DIR` in CocoPlus production workflows. It changes `process.cwd()` and can break CocoPod-relative paths.
- Set `CTX_STEP_ENFORCEMENT=false` for CocoFlow stage execution so ctx gates do not conflict with CocoFlow gates.
- If ctx and CocoFlow disagree about the active task, CocoFlow takes precedence.

## Exit Criteria

- [ ] `PROGRESS.md` has Done / In Progress / Next / Notes sections.
- [ ] `PROGRESS.md` includes Iteration Budget when long-running work is active.
- [ ] `CONTEXT.md` uses one predicate per line.
- [ ] Kill-switch and steering files are treated as operator controls, not permanent instructions.
