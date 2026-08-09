---
name: "meter-waste"
description: "Analyze CocoMeter context waste and surface repeatable reduction opportunities."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - snow-cocoplus
---

Your objective is to implement `$meter waste [--window <N>] [--run-id <id>]`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

## Contract

Read recent session, meter, and reconciliation artifacts. Estimate avoidable context reconstruction, repeated failed loops, off-brief execution, and stale-context reloads. Use transcript-derived reconciliation when present; otherwise label the result as estimate-only.

Output:

- Waste window and source files
- Waste categories and approximate token share
- Highest-confidence cause
- Suggested prevention
- Candidate wisdom or style rule, if evidence is strong

Do not write directly to `do-not-use.md`. If a rejected approach seems warranted, append a review candidate to `.cocoplus/wisdom/review-queue.md` so the operator can accept it with `$wisdom reject`.

## Exit Criteria

- [ ] The report separates verified waste from estimated waste.
- [ ] Off-brief and loop waste are identified when evidence exists.
- [ ] Recommendations prefer correctness before token savings.
- [ ] Negative-memory candidates remain review-only until explicitly accepted.
