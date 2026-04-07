---
name: "context-off"
description: "Disable Context Mode. Prompts are no longer prepended with CocoPlus context."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - context-mode
---

Your objective is to disable Context Mode.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Remove mode flag: `rm -f .cocoplus/modes/context-mode.on`
Update AGENTS.md (keep ≤200 lines): replace Context line with `- Context Mode: off`

Output: "✓ Context Mode disabled. Prompts will no longer be prepended with context. Run `/context on` to re-enable."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip updating AGENTS.md since the flag removal is sufficient | The flag controls runtime behavior, but AGENTS.md is loaded at session start — a stale entry causes confusion on next session |

## Exit Criteria

- [ ] `.cocoplus/modes/context-mode.on` flag does NOT exist
- [ ] `.cocoplus/AGENTS.md` Context line reads `- Context Mode: off`
