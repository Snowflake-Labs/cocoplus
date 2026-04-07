---
name: "inspector-off"
description: "Disable automatic environment scanning at session start."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - environment-inspector
---

Your objective is to disable automatic environment scanning.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Remove mode flag: `rm -f .cocoplus/modes/inspector.on`

Update AGENTS.md (keep ≤200 lines): replace Inspector line with `- Inspector: off`

Output: "✓ Environment Inspector disabled. Existing snapshots in .cocoplus/snapshots/ are preserved. Run `/inspector on` to re-enable."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Delete existing snapshots when disabling | Snapshots are environment history records; disabling auto-scan does not invalidate past environment data |

## Exit Criteria

- [ ] `.cocoplus/modes/inspector.on` flag does NOT exist
- [ ] `.cocoplus/AGENTS.md` Inspector line reads `- Inspector: off`
- [ ] Existing snapshot files in `.cocoplus/snapshots/` are still present (not deleted)
