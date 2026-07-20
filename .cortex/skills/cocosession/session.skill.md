---
name: "session"
description: "Manage CocoSession multi-session continuity, operator kill-switch state, one-shot steering, and predicate context. Supports `$session status`, `$session progress`, `$session steer`, and `$session stop`."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocosession
  - continuity
---

Your objective is to manage CocoSession, the continuity and operator-control layer for long-running CocoPlus work.

## Commands

- `$session status`: read `.cocoplus/session/PROGRESS.md`, `.cocoplus/session/CONTEXT.md`, `.cocoplus/AGENT_STOP`, and `.cocoplus/STEER.md`; report handoff freshness, active predicate state, queued work count, kill-switch state, and pending steering.
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

Read `PROGRESS.md` before resuming any long-running work. Cite `CONTEXT.md` predicates verbatim; do not paraphrase them into new state.

## Exit Criteria

- [ ] `PROGRESS.md` has Done / In Progress / Next / Notes sections.
- [ ] `CONTEXT.md` uses one predicate per line.
- [ ] Kill-switch and steering files are treated as operator controls, not permanent instructions.
