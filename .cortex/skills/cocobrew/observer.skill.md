---
name: "observer"
description: "Run the read-only CocoObserver skill observation loop for CocoBrew improvement and simplification signals."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocobrew
  - observer
---

Your objective is to observe CocoPlus skills without modifying them.

## Behavior

CocoObserver is eyes-only. It reads skill files, hooks, docs, and validation output to identify:

- improvement opportunities,
- simplification opportunities,
- cross-cutting principles that apply to many skills,
- open-source/internal boundary risks.

It never edits files. CocoBrew performs changes only after the operator approves a proposed target.

## Detection Signals

- **Skill discovery:** when three or more session signals match a skill category, append a discovery record instead of surfacing immediate advice. CocoPilot may later choose one discovery to present.
- **Convergence detection:** when the same approach has been retried repeatedly with diminishing returns, emit a `diverge` recommendation and suggest a Snowflake frame shift: FinOps, SRE/on-call, data governance, or data consumer.
- **Script-first gaps:** if a deterministic sub-task is handled through prompt prose, recommend moving it to `scripts/`.
- **Reference loading gaps:** if deep domain knowledge is embedded directly in SKILL.md, recommend moving it to `references/` and loading on demand.
- **Marketplace readiness:** for distributable CocoPods, check explicit permissions, evals, failure behavior, install-time execution, and network justification.

## Outputs

- `.cocoplus/skills/observations.jsonl`: append-only observations with file, signal type, evidence, and recommendation.
- `.cocoplus/skills/cross-cutting-principles.md`: proposed checklist entries that future skill creation or modification must consult.
- `.cocoplus/session/discoveries.jsonl`: skill-match and convergence signals consumed by CocoPilot.

## Exit Criteria

- [ ] Every observation cites exact files read.
- [ ] Simplification signals are treated as first-class findings.
- [ ] Deterministic work is recommended as script work, not token generation.
- [ ] Convergence findings recommend isolated divergence rather than another same-frame retry.
- [ ] Public skills do not receive private implementation details.
