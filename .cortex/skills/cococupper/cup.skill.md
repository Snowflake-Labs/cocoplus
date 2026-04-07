---
name: "cup"
description: "Manually trigger CocoCupper analysis of the current session's work. Runs immediately (not in background) and writes findings to .cocoplus/grove/cupper-findings.md."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cococupper
---

Your objective is to manually trigger CocoCupper analysis.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Activate the `coco-cupper` subagent with the following context:
- Current lifecycle artifacts in `.cocoplus/lifecycle/`
- Current flow.json and stage statuses
- Any quality findings files matching `.cocoplus/quality-findings-*.md`
- Current memory/decisions.md

The coco-cupper agent will analyze and write findings to `.cocoplus/grove/cupper-findings.md`.

Output: "CocoCupper analysis complete. Findings written to `.cocoplus/grove/cupper-findings.md`. Run `/cup history` to review, or `/patterns promote [finding-id]` to promote a finding to CocoGrove."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Run analysis without loading quality findings and memory context | CocoCupper's value comes from cross-referencing lifecycle artifacts — incomplete context produces shallow findings |
| Append to findings file without a unique finding ID | Duplicate or ID-less findings cannot be referenced by `/patterns promote` and become orphaned |

## Exit Criteria

- [ ] `.cocoplus/grove/cupper-findings.md` has been updated with at least one new `## Finding` section
- [ ] Each new finding has a unique ID, Type, Severity, and Date field
- [ ] Output confirms analysis completed with a path to findings file
