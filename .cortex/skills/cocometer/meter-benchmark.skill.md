---
name: "meter-benchmark"
description: "Measure per-stage success probability before iterating on CocoFlow templates. Supports `$meter benchmark --flow <template>`."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - benchmark
---

Your objective is to establish a measured p-hat baseline before optimizing a flow template, wisdom rule, or skill.

## Command

`$meter benchmark --flow <template>`

Run or read the requested template's benchmark history, then report:

- number of runs,
- per-stage success probability,
- confidence interval,
- average token cost,
- average elapsed time,
- failure classes observed.

Write results to `.cocoplus/meter/template-benchmarks.jsonl`.

## Exit Criteria

- [ ] No optimization is recommended without a measured baseline.
- [ ] Stage-level p-hat is reported separately from whole-flow success.
- [ ] Benchmark results include cost and confidence, not only pass/fail count.
