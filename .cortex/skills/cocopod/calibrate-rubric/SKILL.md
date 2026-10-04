---
name: "calibrate-rubric"
description: "Score compiled CocoPod rules against recent operation history and flag rules that never fire."
version: "2.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopod
  - calibration
user-invocable: true
blocking: false
---

## Objective

Implement `$cocopod calibrate-rubric` by reading recent rubric result history and updating each rubric entry's calibration metadata. A rule whose evaluated samples all score at or below 0.4 is marked `never_fires`; a rule with no samples is marked `insufficient_evidence`.

## Exit Criteria

- [ ] Every rubric entry has sample count, maximum observed probability, status, and calibration timestamp.
- [ ] Calibration does not rewrite instruction text.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|---|---|
| Mark an unsampled rule as never firing | No evidence is different from low-scoring evidence. |
| Use wall-clock age as the signal | Calibration is based on observed operations. |
