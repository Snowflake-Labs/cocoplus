---
name: wisdom-distill
description: "Distill terminal session outcomes into CocoWisdom using the project schema. Usage: $wisdom distill [session-id|run-id]"
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
---

# CocoWisdom Distill

Use this skill when `$wisdom distill` is invoked directly or when the Stop hook queues a background distillation request.

## Objective

Extract durable, reusable lessons from a completed, exited, or failed session and route them into CocoWisdom without blocking the developer's next turn.

## Inputs

- Optional session or run id from `$wisdom distill <id>`.
- `.cocoplus/wisdom/SCHEMA.md` when present.
- `.cocoplus/session/PROGRESS.md`, `.cocoplus/session/CONTEXT.md`, `.cocoplus/session/steps.jsonl`, and relevant lifecycle artifacts.
- `.cocoplus/wisdom/review-queue.md` for unresolved contradictions.

## Procedure

1. Check `.cocoplus/wisdom/SCHEMA.md`. If it does not exist, create a minimal schema with topic categories, source session id, outcome status, evidence pointer, confidence, and contradiction handling fields.
2. Read only the terminal-session artifacts needed to identify lessons, rejections, corrections, governance decisions, and repeated failure modes.
3. Classify each candidate into a schema-declared category file. Do not invent standing-context text outside the schema.
4. If a candidate contradicts existing wisdom, follow `[wisdom].contradiction_action`:
   - `queue`: add it to `.cocoplus/wisdom/review-queue.md`.
   - `skip`: record the skipped contradiction in the report.
   - `overwrite`: replace only when the evidence pointer and rationale are explicit.
5. Write accepted entries to the matching topic file under `.cocoplus/wisdom/`.
6. Write a distillation report to `.cocoplus/lifecycle/cocoflow/<run-id>/distillation-<timestamp>.json` when a run id exists, otherwise `.cocoplus/wisdom/distillation-<timestamp>.json`.

## Rules

- Distillation is asynchronous maintenance. It must never block Stop hook completion.
- Failed sessions are valid sources when `[wisdom].distill_on_failure = true`.
- Store evidence pointers, not transcript dumps.
- Preserve reviewability: every accepted or queued lesson needs source id, timestamp, category, and rationale.

## Success Criteria

- [ ] Schema exists or is created.
- [ ] Accepted lessons are category-routed.
- [ ] Contradictions are queued or handled according to config.
- [ ] A distillation report records counts for accepted, queued, skipped, and errored candidates.

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
