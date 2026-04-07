---
name: "memory-off"
description: "Disable the Memory Engine. Decision capture stops. Existing memory files are preserved."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - memory-engine
---

Your objective is to disable the Memory Engine.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Remove mode flag: `rm -f .cocoplus/modes/memory.on`

Update AGENTS.md (keep ≤200 lines): replace Memory line with `- Memory: off`

Output: "✓ Memory Engine disabled. Existing memory files preserved in .cocoplus/memory/ — they can be read manually but will not be updated. Run `/memory on` to re-enable."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Delete memory files when disabling to "start fresh" | Memory files contain cross-session decisions that have lasting validity; they must be preserved even when the engine is off |

## Exit Criteria

- [ ] `.cocoplus/modes/memory.on` flag does NOT exist
- [ ] `.cocoplus/AGENTS.md` Memory line reads `- Memory: off`
- [ ] `.cocoplus/memory/decisions.md`, `patterns.md`, and `errors.md` files still exist (not deleted)
