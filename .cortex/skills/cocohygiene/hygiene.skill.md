---
name: "hygiene"
description: "Run CocoHygiene audits for harness simplification and model-upgrade cleanup. Supports `$hygiene` and `$hygiene --model-upgrade`."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - hygiene
  - simplification
---

Your objective is to remove no-longer-load-bearing complexity from CocoPlus projects.

## Commands

- `$hygiene`: inspect rules, hooks, skills, templates, and recurring failures for simplification opportunities.
- `$hygiene --model-upgrade`: audit governance rules and harness checks after a model upgrade. Classify each as Still Load-Bearing, Degraded to Advisory, or Obsolete.

## Discipline

Measure before changing. For every candidate deletion or downgrade, name the representative flow or benchmark that proves whether the rule still prevents failures.

## Exit Criteria

- [ ] Each recommendation has evidence.
- [ ] Deletions are proposed, not applied silently.
- [ ] Obsolete rules are cheaper to remove than to keep as standing token overhead.
