---
name: "tune-rubric"
description: "Operator-initiated rewrite workflow for CocoPod rubric rules flagged by calibration."
version: "2.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopod
  - calibration
user-invocable: true
blocking: true
---

## Objective

Implement `$cocopod tune-rubric`. Read only entries marked `never_fires`, propose specific rewrites that preserve the original intent while making the condition checkable, and show the source line and proposed replacement to the operator. Apply only explicitly accepted rewrites, then recompile the rubric.

## Exit Criteria

- [ ] Tuning runs only after an operator command.
- [ ] Every applied rewrite has explicit approval and preserves a source citation.
- [ ] The rubric is recompiled after accepted source changes.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|---|---|
| Automatically rewrite all flagged rules | Calibration evidence starts a review; it is not write authorization. |
| Edit `rubric.json` without the source | The instruction file remains the source of truth. |
