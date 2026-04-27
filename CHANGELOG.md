# Changelog

All notable changes to CocoPlus are documented here.

---

## [1.0.1] — April 2026

### Added

#### CocoView — Flow Visualizer (Feature 20)
- `flow-view.skill.md` — `/flow view` renders `flow.json` as an interactive HTML DAG; injects pipeline data into `flow-view.html.template` and opens in the default browser; `--output <path>` writes to a custom path without opening the browser

#### CocoMeter Enhanced — Token Attribution & Dashboard (Feature 21)
- `meter-view.skill.md` — `/meter view` queries `SNOWFLAKE.ACCOUNT_USAGE.CORTEX_CODE_CLI_USAGE_HISTORY` (two-pass query for direct and subagent-anchor request IDs), joins with local `request-map.jsonl` attribution data, injects into `meter-view.html.template`, and opens in browser
- `meter-sync.skill.md` — `/meter sync` refreshes the dashboard with updated Snowflake data without reopening the browser; intended for use after the 90-minute usage history latency window
- Updated `post-tool-use.js` — Section 5 captures `request_id` from every Snowflake tool result when CocoMeter is active, appending to `.cocoplus/meter/request-map.jsonl` with `stage_id`, `persona`, `tool_name`, `session_id`, and `timestamp` for per-stage attribution

#### CocoContext — Organizational Standards Capture (Feature 23)
- `context-add.skill.md` — `/context add` guided wizard captures org standards into `.cocoplus/context/<category>.md`; six categories: approved-models, quality-thresholds, pii-policy, warehouse-policy, naming-conventions, governance-gates; enforces ≤200 line limit; auto-commits with `feat(context):` message
- `context-view.skill.md` — `/context view [name]` displays a context file with line count and last-modified date
- `context-list.skill.md` — `/context list` shows all six standard slots with status (line count, date, or "not created")

#### CocoRecipe — Pre-Built Pipeline Templates (Feature 25)
- `recipe-list.skill.md` — `/recipe list` enumerates all templates from profile `recipes/` folder and project-local `.cocoplus/recipes/`
- `recipe-use.skill.md` — `/recipe use <name>` collects `{{param}}` values interactively, validates generated JSON against CocoFlow schema, writes to `.cocoplus/flow.json`
- `recipe-new.skill.md` — `/recipe new <name>` saves the current `flow.json` as a parameterized template in the profile `recipes/` folder

#### CocoDream — Supervised Pattern Distillation (Feature 26)
- `dream.skill.md` — `/dream` distils prompt iteration patterns from `.cocoplus/prompts/` histories (requires ≥3 versions per function); launches CocoCupper to cluster worked-patterns, anti-patterns, and neutral changes; writes candidates to `.cocoplus/grove/dream-<timestamp>.md` for developer review
- `dream-history.skill.md` — `/dream history [n]` lists past distillation sessions newest-first with function count and candidate breakdown

#### CocoBehavior — Ambient Behavioral Constraints (Feature 22)
- `cocobehavior/SKILL.md` — ambient constraint layer (`user_invocable: false`) loaded into all persona agents at startup; four constraints: Think Before Coding, Simplicity First, Scope Discipline, Goal-Driven

#### CocoScout — Relevance-Ranked Context Loading (Feature 24)
- `cocoscout/SKILL.md` — ambient context ranker (`user_invocable: false`) fires before every persona invocation and build stage; scores CocoGrove patterns, CocoContext files, environment snapshots, and prompt history by keyword relevance; prepends top-ranked context; completes in <5 seconds
- Registered `coco-scout` agent in `plugin.json`

### Fixed
- Registered the background `environment-inspector` and `quality-advisor` agents in `plugin.json` so hook-triggered automation has valid runtime targets
- Added runtime definitions for `environment-inspector` and `quality-advisor` background agents to match documented CocoPlus behavior
- Updated `post-tool-use.js` to queue and trigger background quality review after SQL writes when Quality mode is enabled
- Corrected `CocoCupper` and `SecondEye Critic` agent tool contracts so their allowed write targets match their documented outputs

### Documentation
- Updated `docs/features.html` — added Features 20–26 with full descriptions and "When to Use" guidance; updated feature count from 19 to 26
- Updated `docs/command-reference.html` — added command reference sections for CocoView, CocoMeter Enhanced, CocoContext, CocoRecipe, and CocoDream; updated PostToolUse hook description to include request_id capture
- Updated `docs/index.html` — added Features 20–26 to the feature overview table
- Updated `AGENTS.md` — listed all new features and commands
- Updated HTML documentation to align hook behavior, background agent behavior, and constrained-write agent semantics with the implementation
- Added `scripts/validate-cocoplus.js` to validate manifest-to-agent consistency, hook-spawned agent registration, and agent write-contract accuracy

## [1.0.0] — April 2026

### Added

#### Core Plugin
- `plugin.json` — Coco plugin manifest with Node.js runtime, 9 hooks, 13 agents
- Plugin scaffold with `.cortex/` directory structure (agents, hooks, skills, templates)

#### CocoPod
- `/pod init` — initialize CocoPlus project structure in any git repo; prompts for project name and description; creates `.cocoplus/` with all required subdirectories, `AGENTS.md`, `project.md`, `flow.json`, `safety-config.json`, `personas.json`, `subagents.json`, root `AGENTS.md` shim, `.gitignore` for transient files; creates initial git commit
- `/pod status` — full project state dashboard reading from `.cocoplus/`
- `/pod resume` — context reconstruction for returning developers; narrative summary of where work left off

#### CocoBrew Lifecycle
- `/spec` — structured requirements dialogue; outputs `spec.md`
- `/plan` — CocoHarvest decomposition + `flow.json` generation + Coco native plan mode approval gate
- `/build` — parallel persona subagent execution in isolated git worktrees via CocoHarvest
- `/test` — validation against spec success criteria (SQL, notebook, file-existence)
- `/review` — aggregates Quality Advisor findings, CocoCupper intelligence, spec compliance
- `/ship` — gated final commit with lifecycle summary, semantic version tag, optional PR
- `/rewind` — soft-reset rollback to any CocoBrew phase commit
- `/fork` — isolated git worktree for exploration without touching main branch

#### Specialist Personas (8 agents)
- `$de` Data Engineer — Sonnet, auto mode, schema/SQL/pipelines
- `$ae` Analytics Engineer — Sonnet, auto mode, semantic models/transformations
- `$ds` Data Scientist — Sonnet, auto mode, notebooks/ML/Cortex AI
- `$da` Data Analyst — Haiku, auto mode, query writing/exploration
- `$bi` BI Analyst — Haiku, auto mode, dashboards/semantic layer
- `$dpm` Data Product Manager — Sonnet, plan mode only
- `$dst` Data Steward — Sonnet, plan mode only, governance/data quality
- `$cdo` Chief Data Officer — Opus, plan mode only, strategic architecture
- `/personas` — list all personas with model, mode, tools

#### CocoHarvest
- Task decomposition at Plan phase — auto-assigns workstreams to specialist personas
- Parallel subagent spawning in isolated git worktrees
- Dependency-ordered stage execution via `flow.json`
- Direct persona invocation with `$<shorthand>` and `--continue`, `--model` flags

#### CocoFlow Pipeline
- `/flow run` — execute full pipeline or specific stage; Tier 2/3 model override flags
- `/flow status` — live stage status with runtime, checkpoints, failure reasons
- `/flow pause` — halt after current stage completes
- `/flow resume` — resume with checkpoint validation before restart
- `flow.json` template with stage definitions, dependencies, checkpoint paths

#### Safety Gate
- `PreToolUse` hook — intercepts `SnowflakeSqlExecute` before execution
- Three modes: `strict` (hard block), `normal` (warn, default), `off`
- `/safety strict`, `/safety normal`, `/safety off`
- Configurable production schema patterns via `.cocoplus/safety-config.json`
- Batch soft-gate for multi-destructive CocoFlow stages

#### Memory Engine
- Three-layer persistence: hot (AGENTS.md), warm (`memory/`), cold (grove patterns)
- `PostToolUse` hook captures schema changes, plan updates, explicit decisions
- `PreCompact` hook flushes context to warm memory before compaction
- `/memory on`, `/memory off`
- Cross-session decisions log at `memory/decisions.md`

#### Environment Inspector
- `/inspect` — full Snowflake environment scan (schemas, tables, views, functions, Cortex objects, grants)
- `--schema` flag for targeted scan; `--full` for column-level statistics
- `/inspector on`, `/inspector off` — auto-scan on session start via `SessionStart` hook
- Snapshots written to `.cocoplus/snapshots/`

#### Code Quality Advisor
- `/quality on`, `/quality off` — background review after every `.sql` write
- `/quality run` — immediate full review; optional file path argument
- Findings categorized: performance, correctness, governance, cost
- `quality-advisor` background agent — consumes queued SQL review requests and writes findings reports

#### CocoMeter
- `/meter on`, `/meter off` — token tracking via `PostToolUse` hook
- `/meter` — current session summary by feature and operation
- `/meter estimate` — pre-flight cost estimation via Haiku
- `/meter history` — per-session cost summaries from `meter/history.jsonl`
- `current-session.json` initialized at `SessionStart`, finalized at `SessionEnd`

#### CocoCupper
- Background Haiku agent — read-only, triggered automatically at `Stop` and `SubagentStop`
- `/cup` — manual trigger
- `/cup history` — browse findings from past sessions
- Findings written to `.cocoplus/grove/cupper-findings.md`

#### CocoGrove
- `/patterns view` — browse promoted patterns, filter by tag
- `/patterns promote` — elevate CocoCupper finding to permanent pattern file in `grove/patterns/`
- Patterns are versioned markdown files in git

#### CocoSpark
- `/spark [topic]` — divergent thinking mode; generates multiple approaches, raises assumptions
- `/spark-off` — exit with option to carry insights into `spec.md`
- Output saved to timestamped file; never modifies lifecycle artifacts automatically

#### SecondEye
- `/secondeye` — three-model parallel plan critique (Haiku efficiency, Sonnet completeness, Opus risk)
- `/secondeye --artifact` — critique any lifecycle artifact or file path
- `/secondeye --model` — single-model critique
- `/secondeye acknowledge` — clear Build soft gate after reviewing Critical findings
- `/secondeye history` — list all reports with finding counts and acknowledgment status
- Findings classified: Critical, Advisory, Observation

#### Context Mode
- `/context on`, `/context off` — narration overlay on all CocoPlus actions

#### Doc Engine
- `/doc run` — generate column descriptions, docstrings, schema lineage, data dictionary entries

#### Prompt Studio
- `/prompt new` — guided Cortex AI prompt creation workflow
- `/prompt compare` — side-by-side variant comparison with token cost analysis

#### CocoFleet
- `/fleet init` — create fleet manifest template
- `/fleet run` — execute multi-process fleet with dependency graph resolution
- `/fleet status` — live instance status table
- `/fleet logs` — stream instance output log
- `/fleet stop` — graceful SIGTERM → SIGKILL shutdown

#### Assist Mode
- `/cocoplus on` — activate all features simultaneously; triggers Environment Inspector background scan
- `/cocoplus off` — deactivate all features; preserve all data

#### Hooks (9 total — Node.js, cross-platform)
- `session-start.js` — state load, CocoMeter init, inspector trigger with background spawn
- `session-end.js` — CocoMeter finalize, AGENTS.md update via shared `lib/agents-update.js`
- `pre-tool-use.js` — Safety Gate; reads stdin JSON; outputs `{"action":"allow/block/warn"}`
- `post-tool-use.js` — Memory Engine capture; quality queue trigger
- `user-prompt-submit.js` — persona shorthand routing; registers subagents in `subagents.json`
- `subagent-stop.js` — prefix-based routing (`cupper-`, `persona-`, `inspector-`, `quality-`); updates `flow.json`; writes `ui-notifications.jsonl`
- `stop.js` — final state capture; CocoCupper background spawn
- `pre-compact.js` — memory flush; `flow.json` atomic re-persist
- `notification.js` — deduplication (60s window); routes to `ui-notifications.jsonl` for high-priority events
- `lib/agents-update.js` — shared AGENTS.md utility; 200-line hard enforcement; `readActiveModes`, `readRecentDecisions`
- `_common.js` — shared utilities: `isoUtc`, `atomicWrite`, `appendJsonLine`, `readStdinJson`, `logError`
- `environment-inspector` background agent — session-start inspector execution target

#### Templates
- `AGENTS.md.template` — hot memory layer with phase/modes/decisions sections
- `project.md.template` — project charter with name, description, goal, owner
- `flow.json.template` — pipeline definition with stage schema
- `safety-config.json.template` — production schema patterns, destructive pattern list
- `notifications.json.template`, monitor JSON templates (narrator, cost-tracker, quality-advisor, memory-capture)

#### Documentation site (`docs/`)
- `index.html` — home with feature overview table and doc grid
- `getting-started.html` — prerequisites, install, init, personas, first spec
- `architecture.html` — four pillars, state store, model hierarchy, CocoFleet vs CocoHarvest
- `features.html` — all 19 features in detail
- `concepts.html` — seven foundational mental models
- `workflows.html` — nine real-world scenarios
- `command-reference.html` — full command reference with flags and hooks table
- `data-context.html` — data engineering context and Snowflake-specific design
- `principles.html` — twelve design principles
- `manifesto.html` — vision and motivation
- Shared `style.css` with nav, cards, lens-grid, summary-box, code blocks

### Fixed
- `plugin.json` fields aligned with Coco manifest spec (`entry`, `minCocoVersion`, `runtime`)
- All hooks rewritten from bash to Node.js for Windows/Mac/Linux compatibility
- All hooks read event data from stdin JSON (`readStdinJson()`) per HOOKS_SPEC
- Persona `name` fields changed to display names for Coco agent registry
- `coco-cupper` context changed from `isolated` to `fork`
- `secondeye-critic` isolation changed from `isolated` to `none`
- `/spark` skill name corrected from `cocospark` to `spark`
- CocoFleet manifest format aligned with FEATURES.md spec
- `flow.json` template model changed from hardcoded ID to portable `sonnet` alias
- `safety-config.json` template — added `production_schema_patterns` key
- All 56 skills — Exit Criteria and Anti-Rationalization sections added
- All platform-specific bash commands in skills replaced with Node.js one-liners

---

[1.0.0]: https://github.com/Snowflake-Labs/cocoplus/releases/tag/v1.0.0
[1.0.1]: https://github.com/Snowflake-Labs/cocoplus/releases/tag/v1.0.1
