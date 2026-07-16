---
name: "personas-discover"
description: "Discover dynamic specialist personas from project evidence and record candidates."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - dynamic-personas
  - v2
---

Your objective is to discover emergent personas from project evidence.

## Behavior

1. Read `.cocoplus/grove/`, `.cocoplus/wisdom/`, `.cocoplus/lifecycle/`, and existing `personas/*/history.md` artifacts.
2. Identify repeated work domains with evidence from at least three distinct sessions or committed artifacts.
3. Write candidates to `.cocoplus/personas/dynamic-registry.json`.
4. Do not synthesize a specialist skill until the evidence threshold is met.

## Exit Criteria

- [ ] Dynamic registry exists.
- [ ] Every candidate cites evidence.

