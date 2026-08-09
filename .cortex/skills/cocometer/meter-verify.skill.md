---
name: "meter-verify"
description: "Verify CocoMeter outcome evidence for a run and mark whether measured work reached outcome level L4."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - snow-cocoplus
---

Your objective is to implement `$meter verify <run-id> [--evidence "<description>"] [--update]`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

## Contract

Read the matching meter record from `.cocoplus/meter/`, `.cocoplus/lifecycle/meter/`, or the active session meter file. Compare the recorded output against explicit evidence supplied by the operator or available in lifecycle artifacts.

Report:

- Run ID
- Evidence source
- Outcome level, including whether L4 was reached
- Verification confidence
- Any missing proof needed before the result can be treated as verified

If `--update` is supplied, append a verification envelope with timestamp, evidence summary, confidence, and outcome level to the run's meter artifact. Do not overwrite raw usage counters or transcript reconciliation data.

## Exit Criteria

- [ ] Missing run records produce a clear "not found" result.
- [ ] Verification distinguishes measured activity from outcome proof.
- [ ] L4 is claimed only when the artifact demonstrates durable user-visible outcome.
- [ ] `--update` preserves existing metering fields and appends verification metadata.
