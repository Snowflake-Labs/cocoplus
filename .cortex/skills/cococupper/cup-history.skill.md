---
name: "cup-history"
description: "Display the last N CocoCupper findings from .cocoplus/grove/cupper-findings.md. Usage: $cup history [n] where n defaults to 5."
version: "1.1.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cococupper
---

Your objective is to display recent CocoCupper findings.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Parse argument: `$cup history [n]` — n defaults to 5.

Read `.cocoplus/grove/cupper-findings.md`. If it does not exist or is empty:
Output: "No CocoCupper findings yet. Run `$cup` to trigger an analysis."
Then stop.

Extract the last N findings (each finding starts with `## Finding`).

Output each finding in summary format:
```
| ID | Title | Type | Severity | Date | Promoted |
|----|-------|------|----------|------|----------|
[one row per finding]
```

Then show the full text of the most recent finding.

## Auto-Captured Corrections (Feature 8 Enhancement)

Correction detection runs silently on every developer prompt via `user-prompt-submit.js` calling `scripts/cupper-capture.js` (Tier 1, no LLM, <200ms), appending matches to `.cocoplus/cupper/auto-captured.json`. This section surfaces those alongside the manual findings above.

Read `.cocoplus/cupper/auto-captured.json` if it exists. For each auto-captured correction, apply a routing classification:
- **incorrect-behavior** — the correction reverses or contradicts an action just taken
- **missing-variant** — the correction asks for an option or mode that didn't exist
- **agent-misapplication** — the correction indicates a skill or persona was invoked in the wrong context

Output a second table:
```
| Timestamp | Correction Text | Routing | Skill Context |
|-----------|-----------------|---------|----------------|
[one row per auto-captured entry]
```

Output: "Showing [N] of [total] findings and [M] auto-captured corrections. Use `$patterns promote [finding-id]` to promote a finding to the pattern library. Use `$wisdom route` to route auto-captured corrections to skill edits."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show all findings regardless of N argument | The N limit exists to prevent overwhelming output in long-running projects with many findings |
| Skip showing the full text of the most recent finding | The summary table alone loses detail — the most recent finding needs full context for action |

## Exit Criteria

- [ ] A summary table with columns ID, Title, Type, Severity, Date, Promoted is output
- [ ] The full text of the most recent finding is displayed below the table
- [ ] The output footer shows total finding count and promote command hint
- [ ] Auto-captured corrections from `.cocoplus/cupper/auto-captured.json` (if present) are shown alongside manual findings with a routing classification
