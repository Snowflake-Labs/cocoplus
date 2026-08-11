---
name: wisdom-review
description: "Review queued CocoWisdom contradictions. Usage: $wisdom review"
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
---

# CocoWisdom Review

Use this skill to settle contradictions queued by `$wisdom distill`.

## Objective

Let the operator approve, reject, merge, or defer contradictory institutional memory entries with explicit rationale.

## Procedure

1. Read `.cocoplus/wisdom/review-queue.md`.
2. Present queued items grouped by topic and source session.
3. For each item, ask the operator to choose approve, reject, merge, or defer.
4. Apply accepted or merged entries to the relevant schema-declared topic file.
5. Preserve rejected and deferred entries with rationale and timestamp in the queue or review log.

## Rules

- Never silently overwrite existing wisdom.
- A contradiction is a review event, not a parsing failure.
- Keep source evidence pointers attached to each decision.

## Success Criteria

- [ ] Queue depth is reduced or explicitly deferred.
- [ ] Decisions include rationale.
- [ ] Topic files and review log stay consistent.

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
