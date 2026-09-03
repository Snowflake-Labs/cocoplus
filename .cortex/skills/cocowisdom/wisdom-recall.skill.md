---
name: "wisdom-recall"
description: "Search curated wisdom and the session-log lexical index together."
version: "2.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - cocowisdom
  - recall
---

Your objective is to implement `$wisdom recall "<query>"`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Behavior

Perform two-tier lexical recall:

1. Search curated wisdom files under `.cocoplus/wisdom/`, including `do-not-use.md`.
2. Search `.cocoplus/lifecycle/wisdom-index/` built by `$wisdom index`.
3. Return results from both tiers together, labeled by source and confidence: exact phrase, all terms, or close term overlap.

If no session index exists, output: "No session index found. Run `$wisdom index` first." Still search curated wisdom files.

Lexical search is the baseline. Do not add semantic, embedding, or LLM retrieval unless the lexical result quality has been measured and the gap is documented.

## Negative Memory Rule

`do-not-use.md` matches must be surfaced before positive wisdom matches when confidence is equal. Rejected approaches are universal constraints, not optional suggestions.

## Exit Criteria

- [ ] Results identify whether they came from curated wisdom or session-log index.
- [ ] `do-not-use.md` results are visible and prioritized.
- [ ] Missing index guidance is explicit.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |
