---
name: "quality-off"
description: "Disable the Code Quality Advisor. Automatic SQL review stops. Existing findings are preserved."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - code-quality
---

Your objective is to disable the Code Quality Advisor.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Remove mode flag: `rm -f .cocoplus/modes/quality.on`
Update AGENTS.md (keep ≤200 lines): replace Quality line with `- Quality: off`

Output: "✓ Code Quality Advisor disabled. Existing findings preserved. Run `/quality on` to re-enable."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Delete existing findings files when disabling | Findings files are audit records; disabling the advisor does not retroactively invalidate past findings |

## Exit Criteria

- [ ] `.cocoplus/modes/quality.on` flag does NOT exist
- [ ] `.cocoplus/AGENTS.md` Quality line reads `- Quality: off`
- [ ] Existing `quality-findings-*.md` files in `.cocoplus/` are still present (not deleted)
