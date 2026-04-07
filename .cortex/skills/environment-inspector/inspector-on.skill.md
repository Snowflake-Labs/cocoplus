---
name: "inspector-on"
description: "Enable automatic environment scanning at every session start. When enabled, a background scan is triggered each time a Coco session begins in this directory."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - environment-inspector
---

Your objective is to enable automatic environment scanning at session start.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Create mode flag: `touch .cocoplus/modes/inspector.on`

Update AGENTS.md (keep ≤200 lines): replace Inspector line with `- Inspector: ON (auto-scan at session start)`

Output: "✓ Environment Inspector enabled. A background environment scan will run at the start of every Coco session in this directory. Results are saved to .cocoplus/snapshots/."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip updating AGENTS.md if the flag already exists | AGENTS.md is the hot context; if it shows "Inspector: off" the AI will not trigger auto-scans despite the flag being set |

## Exit Criteria

- [ ] `.cocoplus/modes/inspector.on` flag exists
- [ ] `.cocoplus/AGENTS.md` Inspector line reads `- Inspector: ON (auto-scan at session start)`
