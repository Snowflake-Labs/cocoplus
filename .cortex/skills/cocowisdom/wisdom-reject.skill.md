---
name: "wisdom-reject"
description: "Record an explicitly rejected approach in CocoWisdom do-not-use.md negative memory."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocowisdom
  - negative-memory
---

Your objective is to implement `$wisdom reject "<description>"`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Behavior

Record a rejected approach in `.cocoplus/wisdom/do-not-use.md`. Negative memory is first-class CocoWisdom and is not topic-gated by progressive disclosure.

1. Parse the quoted rejection description.
2. Infer a short category from the description. If ambiguous, ask the operator for a category.
3. Append a structured record with Date, Category, Tried, Why rejected, Use instead, and Source session when available.
4. Commit `.cocoplus/wisdom/do-not-use.md` with message `wisdom: record rejected approach - <summary>`.

## Hard Constraints

- Do not write rejected approaches into positive wisdom category files.
- Do not auto-prune or archive `do-not-use.md`.
- Do not require a topic manifest to load negative memory.
- Do not overwrite existing rejection records; append only.

## Exit Criteria

- [ ] `.cocoplus/wisdom/do-not-use.md` contains the structured rejection.
- [ ] The entry has Tried, Why rejected, and Use instead fields.
- [ ] The change is committed with a wisdom rejection commit message.
