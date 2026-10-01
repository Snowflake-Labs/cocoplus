---
name: "instruction-rubric"
description: "Compile and evaluate CocoPod instruction rules with probabilistic confidence bands and fail-open audit logging."
version: "2.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopod
  - governance
user-invocable: false
blocking: false
---

## Objective

Evaluate one queued operation or stage event against the applicable entries in `.cocoplus/lifecycle/rubric.json`. The rubric is compiled from `.cocoplus/lifecycle/cocopod-instructions.md` when absent or stale.

## Required Contract

1. Judge each applicable rule independently and return a probability from 0 through 1, a boolean `violation`, and a concise evidence-based reason.
2. At probability 0.8 or higher, write a pending repair directive naming the rule and source line. The next tool call is blocked until it carries the matching `rubric_repair_id`.
3. At probability 0.5 through less than 0.8, append an operator note without interrupting the session.
4. Below 0.5, remain silent. On timeout, unavailable evaluation, or missing rubric data, fail open and append the miss to `lifecycle/audit.md`.
5. Never mutate `cocopod-instructions.md` while evaluating it.

## Exit Criteria

- [ ] Every returned score maps to a rubric rule id.
- [ ] Confidence bands produce repair, note, or silent outcomes exactly at the documented thresholds.
- [ ] Evaluation failures are audit-visible and non-blocking.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|---|---|
| Return one score for the whole instruction file | Enforcement and calibration operate per rule. |
| Treat uncertainty as a violation | The medium and silent bands exist to preserve calibrated behavior. |
