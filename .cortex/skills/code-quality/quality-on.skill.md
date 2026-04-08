---
name: "quality-on"
description: "Enable the Code Quality Advisor. When on, SQL files written during tool use are automatically analyzed for anti-patterns (SELECT *, missing WHERE, unbounded results, cartesian products, deprecated functions) and findings are logged."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - code-quality
---

Your objective is to enable the Code Quality Advisor.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Create mode flag: create the file `.cocoplus/modes/quality.on` with empty content using the Write tool (cross-platform: do not use `touch`)
Update AGENTS.md (keep ≤200 lines): replace Quality line with `- Quality: ON (auto-review SQL writes)`

Output: "✓ Code Quality Advisor enabled. SQL files written during this session will be automatically reviewed for anti-patterns. Findings are written to .cocoplus/quality-findings-[timestamp].md."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip updating AGENTS.md since the mode flag is already set | AGENTS.md is the hot context; if it still says "Quality: off" the AI will behave as if quality is off |

## Exit Criteria

- [ ] `.cocoplus/modes/quality.on` flag exists
- [ ] `.cocoplus/AGENTS.md` Quality line reads `- Quality: ON (auto-review SQL writes)`
