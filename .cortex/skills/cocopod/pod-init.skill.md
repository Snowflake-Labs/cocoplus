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

Create the following empty flag files using the Write tool (cross-platform — do not use `touch`):
- `.cocoplus/modes/safety.normal` — empty file (default safety mode)
- `.cocoplus/modes/memory.on` — empty file (memory enabled by default)

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

## Create Project Gitignore

Create `.cocoplus/.gitignore` to exclude transient runtime files from version control:

```
# Transient session data
meter/current-session.json
hook-errors.log
hook-log.jsonl

# Regenerable environment snapshots
snapshots/

# Fleet runtime logs
fleet/*/output.log

# SecondEye staging temp files
lifecycle/.secondeye-staging/
```

## Create Root AGENTS.md Shim

Create `AGENTS.md` in the project root (not inside `.cocoplus/`). This thin shim tells Coco where to find the live session context:

```markdown
# [Project Name] — CocoPlus Active

This project uses CocoPlus. Session state, active phase, and persona context
are maintained in `.cocoplus/AGENTS.md`.

<!-- cocoplus-agents-redirect: .cocoplus/AGENTS.md -->
```

Replace `[Project Name]` with the project name collected in the Copy Template Files step.

## Initialize Persona and Subagent Registries

Create `.cocoplus/personas.json` with the default shorthand map:

```json
{
  "$de":  "data-engineer",
  "$ae":  "analytics-engineer",
  "$ds":  "data-scientist",
  "$da":  "data-analyst",
  "$bi":  "bi-analyst",
  "$dpm": "data-product-manager",
  "$dst": "data-steward",
  "$cdo": "chief-data-officer"
}
```

Create `.cocoplus/subagents.json` as an empty registry:

```json
{}
```

## Create Initial Git Commit

Stage all new files and create commit:
```
git add .cocoplus/ AGENTS.md
git commit -m "chore(cocopod): initialize CocoPlus project structure"
```

## Success Output

Output the following confirmation:

```
CocoPlus initialized successfully.

.cocoplus/
├── AGENTS.md          ← hot context (auto-loaded each session)
├── .gitignore         ← excludes transient runtime files
├── personas.json      ← shorthand persona map ($de, $ae, etc.)
├── subagents.json     ← active subagent registry
├── project.md         ← project charter
├── flow.json          ← pipeline definition (empty)
├── lifecycle/         ← phase artifacts (spec, plan, build, test, review, ship)
├── memory/            ← cross-session decisions and patterns
├── grove/             ← CocoGrove pattern library
├── meter/             ← CocoMeter token tracking
├── snapshots/         ← Environment Inspector results
└── modes/             ← feature flags (safety.normal active)

AGENTS.md              ← project root shim → .cocoplus/AGENTS.md

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

## Exit Criteria

- [ ] `.cocoplus/` directory exists with all 11 required subdirectories (`lifecycle/`, `memory/`, `prompts/`, `monitors/`, `grove/`, `grove/patterns/`, `meter/`, `snapshots/`, `modes/`, `fleet/`)
- [ ] `.cocoplus/modes/safety.normal` flag file exists; no other safety flags exist
- [ ] `.cocoplus/modes/memory.on` flag file exists
- [ ] `.cocoplus/AGENTS.md`, `.cocoplus/project.md`, `.cocoplus/flow.json`, and all four monitor JSON files exist
- [ ] `.cocoplus/lifecycle/meta.json` exists with `"current_phase": "not_started"` and empty `phases_completed`
- [ ] `.cocoplus/.gitignore` exists excluding transient session files
- [ ] Root `AGENTS.md` shim exists at project root with `cocoplus-agents-redirect` directive
- [ ] `.cocoplus/personas.json` exists with 8 default shorthand entries (`$de` through `$cdo`)
- [ ] `.cocoplus/subagents.json` exists as empty `{}`
- [ ] Git commit with message `chore(cocopod): initialize CocoPlus project structure` exists in log
