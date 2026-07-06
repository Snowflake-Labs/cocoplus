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
   - If it does: output "CocoPlus is already initialized in this directory. Use `$pod status` to check current state or `$pod resume` to restore context." Then stop.
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
.cocoplus/scripts/
.cocoplus/pull/
.cocoplus/harvest/
.cocoplus/seeds/
.cocoplus/map/
.cocoplus/map/intermediate/
.cocoplus/map/archive/
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
10. Copy `templates/scripts/rollback.js` → `.cocoplus/scripts/rollback.js`
11. Copy `templates/scripts/scope-classify.js` → `.cocoplus/scripts/scope-classify.js`
12. Copy `templates/scripts/spec-validator.js` → `.cocoplus/scripts/spec-validator.js`
13. Copy `templates/scripts/alignment-check.js` → `.cocoplus/scripts/alignment-check.js`

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
  "flow_type": null,
  "bloom_waived": false,
  "phase_history": []
}
```

## Create Constitutional Context

Create `.cocoplus/lifecycle/cocoplus-context.md` from the project answers:

```markdown
# CocoPlus Project Context

## Project
[Project name and one-sentence description]

## Snowflake Stack
Unknown until captured by `$inspect` or project-specific context.

## Architectural Constraints
Use CocoPlus lifecycle artifacts as source of truth. Prefer deterministic scripts for classification and validation before agent reasoning.

## Security Requirements
Safety Gate defaults to normal. Production and PII-adjacent changes require explicit review.
```

## Create Project Gitignore

Create `.cocoplus/.gitignore` to exclude transient runtime files from version control:

```
# Transient session data
state.json
meter/current-session.json
hook-errors.log
hook-log.jsonl
lifecycle/cocowatch-session.md

# Regenerable environment snapshots
snapshots/

# Fleet runtime logs
fleet/*/output.log

# SecondEye staging temp files
lifecycle/.secondeye-staging/

# Generated visualizations
flow-view.html
meter-view.html

# CocoScout session context files
scout-context-*.json

# Scratch and archive data
map/intermediate/
map/archive/
harvest/intermediate/
harvest/archive/
harvest/*-progress.txt
harvest/*-tasks.json
harvest/*-tasks.json.tmp
harvest/*-tasks.json.bak

# Pull artifacts are derived unless explicitly promoted
*.pull.md

# CocoContract working state (outcomes/ archive itself is committed)
contract-evidence.json

# CocoRefine learning-cycle queue
refine/pending.jsonl

# CocoRecall local session index (rebuilt via $recall import)
recall.db

# SecondEye shadow rule findings (do not affect verdict; regenerable)
secondeye/shadow-findings.json

# CocoCupper auto-captured corrections (silent capture, regenerable)
cupper/auto-captured.json

# CocoPivot machine-readable convergence state (FINDINGS.md itself is committed)
lifecycle/findings-state.json
pod-status.json
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

## CocoAudit Setup (Feature 40)

Ask the developer:

> **Enable session audit trail?** (recommended for regulated environments) [y/N]

**If yes:**
1. Create `.cocoplus/modes/cocoaudit.on` (empty file)
2. Create `.cocoplus/lifecycle/audit.md` with the following header:

```markdown
# CocoAudit — Session Audit Trail
**Project**: {{PROJECT_NAME}}
**Initialized**: {{TIMESTAMP}}
**Team**: {{OWNER}}

> This file is append-only. Records are verbatim developer inputs.
> Do not edit manually. This is a compliance artifact.

---
```

3. Add `audit.md` note to success output

**If no:** Skip silently. CocoAudit can be enabled later by creating `modes/cocoaudit.on`.

## Validate Pod Scope Declarations (Feature 47 Enhancement)

If this project intends to register any pod for use in a CocoFlow `parallel:` step, check that pod's `.agent.md` frontmatter for an `excludes:` field. If a pod is registered for parallel use without one, warn:

> ⚠️  Pod "[name]" is registered for parallel execution but has no `excludes:` field declared. Without an explicit exclusion boundary, this pod's scope cannot be validated by CocoPivot's scope anomaly detection, and it may produce overlapping findings with other pods running in the same `parallel:` step. Add an `excludes:` field to `[path].agent.md` before using this pod in parallel workflows.

This check is advisory, not blocking — solo-pod workflows never require `excludes:`.

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
├── scripts/           ← deterministic utility scripts
├── pull/              ← CocoPull manifest and distillation registry
├── harvest/           ← pipeline recovery scratch state
├── snapshots/         ← Environment Inspector results
└── modes/             ← feature flags (safety.normal active)

AGENTS.md              ← project root shim → .cocoplus/AGENTS.md

Next steps:
  $spec       — capture project requirements (start here)
  $pod status — check project state at any time
  $cocoplus on — activate all features at once
```

## Anti-Rationalization

| Temptation | Why Not |
|------------|---------|
| Skip template copy, create files inline | Templates are the user's customization point — always copy from source |
| Initialize all mode flags | Modes are opt-in. Only safety.normal is default. |
| Skip git commit | Every pod init must create a commit for rollback traceability |

## Exit Criteria

- [ ] `.cocoplus/` directory exists with all required subdirectories (`lifecycle/`, `memory/`, `prompts/`, `monitors/`, `grove/`, `grove/patterns/`, `meter/`, `snapshots/`, `modes/`, `fleet/`, `scripts/`, `pull/`, `harvest/`, `seeds/`, `map/`)
- [ ] `.cocoplus/modes/safety.normal` flag file exists; no other safety flags exist
- [ ] `.cocoplus/modes/memory.on` flag file exists
- [ ] `.cocoplus/AGENTS.md`, `.cocoplus/project.md`, `.cocoplus/flow.json`, and all four monitor JSON files exist
- [ ] `.cocoplus/lifecycle/meta.json` exists with `"current_phase": "not_started"` and empty `phases_completed`
- [ ] `.cocoplus/lifecycle/cocoplus-context.md` exists
- [ ] `.cocoplus/scripts/rollback.js`, `scope-classify.js`, `spec-validator.js`, and `alignment-check.js` exist
- [ ] `.cocoplus/.gitignore` exists excluding transient session files
- [ ] Root `AGENTS.md` shim exists at project root with `cocoplus-agents-redirect` directive
- [ ] `.cocoplus/personas.json` exists with 8 default shorthand entries (`$de` through `$cdo`)
- [ ] `.cocoplus/subagents.json` exists as empty `{}`
- [ ] Git commit with message `chore(cocopod): initialize CocoPlus project structure` exists in log
