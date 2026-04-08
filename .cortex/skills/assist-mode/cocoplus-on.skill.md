---
name: "cocoplus-on"
description: "Activate Full Assist Mode — enables all CocoPlus features simultaneously: Memory Engine, Environment Inspector, Safety Gate (normal), Code Quality Advisor, Context Mode, and CocoMeter. Also triggers a background environment scan. Idempotent."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - assist-mode
---

Your objective is to activate Full Assist Mode — enabling all CocoPlus features at once.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Create All Mode Flags

Create the following empty flag files using the Write tool (cross-platform — do not use `touch`):
- `.cocoplus/modes/memory.on` — empty file
- `.cocoplus/modes/inspector.on` — empty file
- `.cocoplus/modes/quality.on` — empty file
- `.cocoplus/modes/context-mode.on` — empty file
- `.cocoplus/modes/cocometer.on` — empty file
- `.cocoplus/modes/full-assist.on` — empty file

For safety mode: only create `safety.normal` if no safety flag already exists (preserve stricter settings):
- Check if `.cocoplus/modes/safety.strict`, `.cocoplus/modes/safety.normal`, or `.cocoplus/modes/safety.off` exists
- If none exist: create `.cocoplus/modes/safety.normal` as an empty file using the Write tool

Initialize memory files if they don't exist:
- `.cocoplus/memory/decisions.md` — create with header `# Decisions Log\n\n_Decisions captured by CocoPlus Memory Engine_\n` if missing
- `.cocoplus/memory/patterns.md` — create with header `# Patterns Log\n\n_Patterns identified by CocoPlus Memory Engine_\n` if missing
- `.cocoplus/memory/errors.md` — create with header `# Errors Log\n\n_Error lessons captured by CocoPlus Memory Engine_\n` if missing

## Update AGENTS.md

Update AGENTS.md (keep ≤200 lines).
Replace the `## Active Modes` section with:
```
## Active Modes
- FULL ASSIST MODE: ACTIVE
- Safety: [current level — check which safety.* flag exists]
- Memory: ON
- Inspector: ON
- Context Mode: ON
- CocoMeter: ON
- Code Quality: ON
```

## Trigger Background Inspector

Trigger Environment Inspector as background subagent (non-blocking).
Activate the `inspect` skill with `background: true` flag.

## Create Git Commit

```
git add .cocoplus/modes/ .cocoplus/AGENTS.md .cocoplus/memory/
git commit -m "chore(cocopod): activate full assist mode"
```

## Output Confirmation Table

```
✓ Full Assist Mode activated.

| Feature | Status | Description |
|---------|--------|-------------|
| Memory Engine | ON | Decisions and patterns captured automatically |
| Environment Inspector | ON | Background scan triggered; auto-scans on session start |
| Safety Gate | [current level] | SQL destructive operation protection |
| Code Quality Advisor | ON | SQL anti-pattern detection on file writes |
| Context Mode | ON | Phase context prepended to every prompt |
| CocoMeter | ON | Token and credit usage tracking |

All flags created. Run `/cocoplus off` to deactivate all features at once.
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip creating memory files if they already exist | Always check — initialization is idempotent; missing headers break memory capture parsing |
| Overwrite an existing stricter safety flag with `safety.normal` | A stricter flag is a deliberate user setting; downgrading it silently would remove production protection |
| Skip triggering the background inspector scan | Inspector scan is part of Full Assist activation — skipping it means stale environment data |

## Exit Criteria

- [ ] All six flags (`memory.on`, `inspector.on`, `quality.on`, `context-mode.on`, `cocometer.on`, `full-assist.on`) exist in `.cocoplus/modes/`
- [ ] At least one safety flag (`safety.strict`, `safety.normal`, or `safety.off`) exists in `.cocoplus/modes/`
- [ ] `.cocoplus/AGENTS.md` `## Active Modes` section shows `FULL ASSIST MODE: ACTIVE`
- [ ] `.cocoplus/memory/decisions.md`, `patterns.md`, and `errors.md` all exist with headers
- [ ] Git commit with message `chore(cocopod): activate full assist mode` exists in log
