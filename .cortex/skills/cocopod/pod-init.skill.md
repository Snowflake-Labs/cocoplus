---
name: "pod-init"
description: "Initialize CocoPlus project bundle in the current directory. Creates .cocoplus/ directory structure, copies all templates, initializes AGENTS.md, project.md, flow.json, and creates the initial git commit. Run this once per project before using any other CocoPlus command."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopod
---

Your objective is to initialize the CocoPlus project bundle in the current working directory.

## Pre-flight Check

1. Check if `.cocoplus/` already exists in the current directory.
   - If it does: output "CocoPlus is already initialized in this directory. Use `/pod status` to check current state or `/pod resume` to restore context." Then stop.
2. Check that a git repository exists (`git rev-parse --git-dir`).
   - If not: offer "Git not detected. Initialize? (yes/no)"
   - If yes: run `git init` and continue.
   - If no: stop.

## Create Directory Structure

Create the following directories (create them even if empty — they are required by other skills):

```
.cocoplus/
.cocoplus/lifecycle/
.cocoplus/memory/
.cocoplus/prompts/
.cocoplus/monitors/
.cocoplus/grove/
.cocoplus/grove/patterns/
.cocoplus/meter/
.cocoplus/snapshots/
.cocoplus/modes/
.cocoplus/fleet/
```

## Copy Template Files

Copy template files from the plugin templates directory to `.cocoplus/`:

1. Copy `templates/AGENTS.md.template` → `.cocoplus/AGENTS.md`
   - Replace `{{TIMESTAMP}}` with current ISO 8601 timestamp
   - Replace `{{SESSION_ID}}` with a generated session ID (format: `sess-YYYYMMDD-HHMMSS`)

2. Copy `templates/project.md.template` → `.cocoplus/project.md`
   - Replace `{{TIMESTAMP}}` with current ISO 8601 timestamp
   - Prompt the developer: "What is this project called?" Replace `{{PROJECT_NAME}}`.
   - Prompt: "Briefly describe the project (one sentence):" Replace `{{PROJECT_DESCRIPTION}}`.
   - Prompt: "What is the primary goal?" Replace `{{PROJECT_GOAL}}`.
   - Replace `{{OWNER}}` with git user name (`git config user.name`).

3. Copy `templates/flow.json.template` → `.cocoplus/flow.json`
   - Replace `{{TIMESTAMP}}` with current ISO 8601 timestamp

4. Copy `templates/notifications.json.template` → `.cocoplus/notifications.json`

5. Copy `templates/safety-config.json.template` → `.cocoplus/safety-config.json`

6. Copy `templates/monitors/narrator.monitor.json` → `.cocoplus/monitors/narrator.monitor.json`
7. Copy `templates/monitors/cost-tracker.monitor.json` → `.cocoplus/monitors/cost-tracker.monitor.json`
8. Copy `templates/monitors/quality-advisor.monitor.json` → `.cocoplus/monitors/quality-advisor.monitor.json`
9. Copy `templates/monitors/memory-capture.monitor.json` → `.cocoplus/monitors/memory-capture.monitor.json`

## Initialize Mode Flags

Create the default safety mode flag:
- `touch .cocoplus/modes/safety.normal`

Create the default memory mode flag:
- `touch .cocoplus/modes/memory.on`

Do NOT create other mode flags (inspector, context-mode, quality, cocometer, etc.) unless the developer enables them explicitly later.

## Initialize Lifecycle Meta

Create `.cocoplus/lifecycle/meta.json`:

```json
{
  "current_phase": "not_started",
  "phases_completed": [],
  "created_at": "{{TIMESTAMP}}",
  "phase_history": []
}
```

## Create Initial Git Commit

Stage all new `.cocoplus/` files and create commit:
```
git add .cocoplus/
git commit -m "feat: initialize CocoPod project structure"
```

## Success Output

Output the following confirmation:

```
CocoPlus initialized successfully.

.cocoplus/
├── AGENTS.md          ← hot context (auto-loaded each session)
├── project.md         ← project charter
├── flow.json          ← pipeline definition (empty)
├── lifecycle/         ← phase artifacts (spec, plan, build, test, review, ship)
├── memory/            ← cross-session decisions and patterns
├── grove/             ← CocoGrove pattern library
├── meter/             ← CocoMeter token tracking
├── snapshots/         ← Environment Inspector results
└── modes/             ← feature flags (safety.normal active)

Next steps:
  /spec       — capture project requirements (start here)
  /pod status — check project state at any time
  /cocoplus on — activate all features at once
```

## Anti-Rationalization

| Temptation | Why Not |
|------------|---------|
| Skip template copy, create files inline | Templates are the user's customization point — always copy from source |
| Initialize all mode flags | Modes are opt-in. Only safety.normal is default. |
| Skip git commit | Every pod init must create a commit for rollback traceability |
