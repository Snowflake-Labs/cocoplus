---
name: "context-on"
description: "Enable Context Mode. When on, every developer prompt is prepended with a CocoPlus context block showing the current phase, active modes, and recent checkpoints. Helps the AI maintain project awareness across prompts."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - context-mode
---

Your objective is to enable Context Mode.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Create mode flag: create the file `.cocoplus/modes/context-mode.on` with empty content using the Write tool (cross-platform: do not use `touch`)
Update AGENTS.md (keep ≤200 lines): replace Context line with `- Context Mode: ON (phase context prepended to prompts)`

Output: "✓ Context Mode enabled. Each prompt will be prepended with current phase, active modes, and recent checkpoints. This helps maintain project context across conversation turns."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip updating AGENTS.md if the flag already exists (idempotent re-enable) | AGENTS.md might still show "Context Mode: off" from a previous disable; always sync it regardless |

## Exit Criteria

- [ ] `.cocoplus/modes/context-mode.on` flag exists
- [ ] `.cocoplus/AGENTS.md` Context line reads `- Context Mode: ON (phase context prepended to prompts)`
