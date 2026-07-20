---
name: "retrospective"
description: "Run the CocoRetro periodic quality retrospective. Supports `$retrospective run` and `$retrospective status`."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - retrospective
  - quality
---

Your objective is to run the periodic closed-loop quality retrospective.

## Commands

- `$retrospective status`: read `.cocoplus/lifecycle/retrospective-ledger.jsonl` and report last run, pending requests, and open actuator proposals.
- `$retrospective run`: analyze recent session artifacts, classify failure modes, propose the cheapest sufficient actuator, and append the result to the ledger.

## Failure Taxonomy

Use exactly one tag per attributable failure:

- `present-not-consulted`
- `present-contradicted`
- `absent-via-truncation`
- `absent-via-never-retrieved`
- `absent-via-compaction`
- `cant-tell`

## Actuator Hierarchy

Prefer the cheapest sufficient actuator:

1. hook or gate,
2. skill or command,
3. structural agent-level rule,
4. standing context.

Do not propose a standing-context addition unless the cheaper layers cannot enforce the rule.

## Exit Criteria

- [ ] Token-weighted wasted effort is reported.
- [ ] Every applied edit has a verbatim `after` anchor for future verification.
- [ ] The ledger records evidence, classification, proposed actuator, and decision.
