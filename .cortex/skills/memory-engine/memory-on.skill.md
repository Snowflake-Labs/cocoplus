---
name: "memory-on"
description: "Enable the Memory Engine. When on, decisions and patterns are automatically captured during tool use (via PostToolUse hook) and flushed to warm storage before session compaction. Decision context is loaded at every session start."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - memory-engine
---

Your objective is to enable the Memory Engine.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Create mode flag: create the file `.cocoplus/modes/memory.on` with empty content using the Write tool (cross-platform: do not use `touch`)

Initialize memory files if they don't exist:
- `.cocoplus/memory/decisions.md` — with header `# Decisions Log\n\n_Decisions captured by CocoPlus Memory Engine_\n`
- `.cocoplus/memory/patterns.md` — with header `# Patterns Log\n\n_Patterns identified by CocoPlus Memory Engine_\n`
- `.cocoplus/memory/errors.md` — with header `# Errors Log\n\n_Error lessons captured by CocoPlus Memory Engine_\n`

Update AGENTS.md (keep ≤200 lines): replace Memory line with `- Memory: ON (capturing decisions)`

Output: "✓ Memory Engine enabled. Decisions, patterns, and error lessons will be captured automatically and persisted across sessions. Existing memory: [decision count] decisions, [pattern count] patterns."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Overwrite memory files if they already exist instead of checking first | Existing memory files contain historical records; overwriting them destroys cross-session context |
| Skip updating AGENTS.md since the flag is set | AGENTS.md drives session-start behavior; a stale "Memory: off" entry means memory context won't be loaded |

## Exit Criteria

- [ ] `.cocoplus/modes/memory.on` flag exists
- [ ] `.cocoplus/memory/decisions.md`, `patterns.md`, and `errors.md` all exist with correct headers
- [ ] `.cocoplus/AGENTS.md` Memory line reads `- Memory: ON (capturing decisions)`
- [ ] Output reports existing decision and pattern counts
