# Changelog

All notable changes to CocoPlus are documented here.

---

## [1.1.0] — May 2026

### Added

#### CocoSentinel — Eight-Dimension Artifact Quality Gate (Feature 36)
- `sentinel.skill.md` — `$sentinel <file>` evaluates any artifact across eight dimensions: Security Attack Surface (A1), Defensive Posture (A2), Correctness (B), Performance (C), Maintainability (D), Test Coverage (E), Compliance (F), and Reward Hacking Resistance (G); Dimension G evidence pre-gate runs deterministically before any LLM work
- `sentinel-approve.skill.md` — `$sentinel approve` records SHA-256-bound approval for a CONDITIONAL artifact; approval is invalidated if the artifact changes
- `sentinel-report.skill.md` — `$sentinel --report` displays full evaluation history with outcomes and approval status per artifact
- `scripts/sentinel-pregate.js` — Dimension G binary PASS/FAIL in <50ms; evaluates 4 evidence criteria (consistent estimate, tool calls, test coverage signal, completion marker) and 3 reward hacking signals (threshold fabrication, coverage inflation, self-congratulation patterns); no LLM
- Seven parallel dimension agents: `sentinel-a1.agent.md` (Security Attack Surface), `sentinel-a2.agent.md` (Defensive Posture), `sentinel-b.agent.md` (Correctness), `sentinel-c.agent.md` (Performance), `sentinel-d.agent.md` (Maintainability), `sentinel-e.agent.md` (Test Coverage), `sentinel-f.agent.md` (Compliance)
- Lock file discipline: `active-evaluation.lock` prevents concurrent sentinel runs; stale lock cleanup (>10 min) in `subagent-stop.js`

#### CocoWisdom — Institutional Memory for Rejections (Feature 37)
- `wisdom.skill.md` — `$wisdom <file>` primes critics with prior rejection context before evaluation; reads `rejections.jsonl` to surface relevant past failures
- `wisdom-list.skill.md` — `$wisdom list` browses rejection records with optional `--gate`, `--since`, `--dimension` filters
- `wisdom-search.skill.md` — `$wisdom search "<pattern>"` full-text case-insensitive search across rejection reason, dimension, and gate fields
- `wisdom-insights.skill.md` — `$wisdom insights` produces a Haiku-synthesized pattern report from the rejection history
- `scripts/wisdom-writer.js` — append-only `rejections.jsonl` writer; auto-increments record IDs; lock file inside try block ensuring cleanup on any error path

#### CocoReview — Structured Code Review (Feature 38)
- `cocoreview.skill.md` — `$review <file>` progressive-disclosure code review; four phases: context gathering, high-level architecture, line-by-line, verdict; six-severity vocabulary: `blocking`, `important`, `nit`, `suggestion`, `learning`, `praise`; `praise` finding structurally mandatory in every review
- `scripts/pr-complexity.js` — deterministic PR complexity analyzer; computes `size_bucket` (XS/S/M/L/XL) and complexity score; XL artifacts (≥800 lines changed) trigger split recommendation; `fileCount` uses only `diff --git` lines; `nonTestChanges` uses subtraction without erroneous factor of 2
- `skills/cocoreview/universal-quality.md` — nine universal anti-pattern baseline applied before any language guide
- `skills/cocoreview/language-sql.md` — SQL-specific review guide
- `skills/cocoreview/security-review.md` — security review guide with five-tier severity scale
- `skills/cocoreview/architecture-review.md` — architecture review guide
- Review output committed to `.cocoplus/review/cocoreview-<timestamp>.md` with `docs(review):` commit type

#### CocoOps — Delivery Intelligence Dashboard (Feature 39)
- `cocoops.skill.md` — `$ops` dispatcher routing to DORA, sprint, suggest, and demo sub-commands
- `ops-dora.skill.md` — `$ops dora` computes four DORA-adapted metrics (Pipeline Run Frequency, Data Availability Lead, Failure Recovery Time, Data Quality Failure Rate); idempotent commit via `git diff --quiet`
- `ops-sprint.skill.md` — `$ops sprint` computes velocity, burndown, and completion prediction from git log within sprint window; daily burn rate and projected final velocity; idempotent commit
- `ops-demo.skill.md` — `$ops demo` activates demo mode with 4-pipeline synthetic dataset for evaluation; `--off` deactivates; `--reset` clears demo data
- `scripts/dora-metrics.js` — deterministic DORA computation; reads Snowflake task history and git log; uses `path.resolve(process.cwd(), 'cocoplus.toml')` for config; exits 0 with message when `.cocoplus/` absent
- `scripts/ops-suggest.js` — time-aware operational suggestion classifier; reads `dora-snapshot.json` for data-cited suggestions

#### CocoPlus Config — SSOT Sync (Phase 26 Extension)
- `cocoplus-config.skill.md` — `$cocoplus sync` propagates `cocoplus.toml` into `security-rules.json` and other derived config files; `$cocoplus migrate-config` converts legacy `safety-config.json` to `cocoplus.toml` format
- `templates/cocoplus.toml.template` — canonical single-source config with `[project]`, `[security]`, `[warehouses]`, `[cost]`, `[sprint]`, `[review.rules]`, and `[demo]` sections

### Updated

#### CocoFlow — Dual Synthesis Fallback (Phase 26 Extension)
- `flow-run.skill.md` — synthesis stages fall back to rule-based script on LLM failure via `--input` flag convention; execution stages still fail hard; prevents silent data loss on LLM synthesis timeout

#### SecondEye — Six-Severity Vocabulary (Phase 26 Extension)
- `secondeye.skill.md` — all five critic prompts extended with six-severity labels (`blocking`, `important`, `nit`, `suggestion`, `learning`, `praise`); `severity_counts` added to `action_summary`; report sections reorganized to Blocking/Important/Nits/Praise; praise structurally enforced — missing praise terminates with error
- `secondeye-critic.agent.md` — added `version`, `author`, `tags` frontmatter; `Severity` field added to output format

#### Safety Gate — Four-Tier Boundary Framework (Phase 26 Extension)
- `pre-tool-use.js` — Four-Tier Boundary Framework added (Absolute, Configurable, Advisory, Transparent); comment corrected from "EHRB still runs regardless" to "all checks including EHRB are bypassed" to match actual code behavior

#### Session Lifecycle — Archetypes and Index (Phase 26 Extension)
- `scripts/archetype-classifier.js` — classifies sessions into 5 archetypes (Explorer, Builder, Reviewer, Debugger, Planner) from turn count, duration, and tool use patterns
- `scripts/session-indexer.js` — rebuild/append modes; exits 0 (not 1) when `.cocoplus/` absent; used by `session-end.js` for cross-session FTS5 index

#### CocoBloom — Crystallized Skill Output Path (Phase 26 Extension)
- `bloom-crystallize.skill.md` — output path corrected from `.cocoplus/skills/` (runtime state) to `.cortex/skills/crystallized/` (cortex artifacts)

#### CocoPull — Full-Text Search (Phase 26 Extension)
- `pull-search.skill.md` — `$pull search "<query>"` searches distilled pull files via FTS5 index built by `session-indexer.js`

### Fixed

- `wisdom-writer.js` — lock file creation moved inside `try` block; previously a throw from `nextRecordId()` would strand the lock file permanently
- `session-end.js` — meter data captured into local variables before `fs.unlinkSync(meterFile)` call; previously the deleted file was re-read in step 3, producing zero-duration and zero-turn index entries
- `subagent-stop.js` — stale lock cleanup replaces dead-code sentinel-synthesis ID check; lock older than 10 minutes is removed as safety net
- `pr-complexity.js` — `fileCount` now counts only `diff --git` header lines (not `+++` lines which caused ~2× overcount); `nonTestChanges` removes erroneous `* 2` multiplier that could produce negative values; `Math.max(0, ...)` guard added
- `dora-metrics.js` — `.cocoplus/` existence check added at start of `main()`; `cocoplus.toml` read via `path.resolve(process.cwd(), ...)` to work from any working directory
- `session-indexer.js` — exits with code 0 (not 1) when `.cocoplus/` is absent; absence is not an error condition
- `sentinel.skill.md` — step number in "wait before proceeding" corrected from Step 7 to Step 8
- `ops-dora.skill.md`, `ops-sprint.skill.md` — idempotency check added; `git diff --quiet` skips commit when snapshot unchanged
- `cocoreview.skill.md` — commit type corrected from `feat(review):` to `docs(review):`
- All seven sentinel dimension agents and `secondeye-critic.agent.md` — added missing `version`, `author`, `tags` frontmatter fields
- `wisdom.skill.md`, `wisdom-list.skill.md`, `wisdom-search.skill.md`, `sentinel-report.skill.md` — Anti-Rationalization tables added

---

## [1.0.3] — May 2026

### Added

#### Reference-Driven Implementation Sync
- Added `scripts/sync-docs-html.js` to render `docs/*.html` directly from the reference Markdown docs while preserving the existing documentation site shell and stylesheet.
- Added canonical reference skill paths for `cocobloom/bloom-skip.skill.md`, `cocowatch/SKILL.md`, and `cocohealth/pod-checkpoint.skill.md`.
- Registered dashboard templates and recipe templates in `plugin.json`, and added `cocoHarvest.pullThreshold` plus stall-detection defaults.
- Expanded recipe templates into executable CocoFlow-style definitions with prompts, checkpoints, deliverables, validation commands, HITL flags, dependencies, and failure thresholds.
- Replaced simplified dashboard templates with the reference Flow View and Meter View templates.
- Strengthened deterministic helper scripts for scope classification, spec scoring, alignment checks, and guarded rollback execution.
- Extended `SubagentStop` routing for CocoKlatch participant/synthesis prefixes and CocoPull manifest updates.
- Expanded `scripts/validate-cocoplus.js` to verify docs sync, template fidelity, manifest assets, recipe completeness, required skill paths, hook routing, and CocoPull integration.

#### CocoBehavior — Ambient Behavioral Constraint Layer (Feature 22)
- `cocobehavior/SKILL.md` — rewritten as full ambient skill with four behavioral constraints (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven = Evaluation-First); `user-invocable: false`; Exit Criteria and Anti-Rationalization sections added; version 1.0.3

#### CocoScout — Relevance-Ranked Context Loading (Feature 24)
- `cocoscout/SKILL.md` — full implementation with Two-Lens scoring (Technical/Domain weighted composite per persona), Anchor Lens (pre-compiled catalog pattern-match, <50ms), Cortex AI function documentation fetch via WebFetch, top-k threshold filtering (0.4), 5-second time budget with graceful degradation, audit record to `hook-log.jsonl`; `user-invocable: false`; Exit Criteria and Anti-Rationalization sections added; version 1.0.3

#### CocoHealth — Context Utilization Monitor (Feature 27)
- `cocohealth/cocohealth.skill.md` — new skill file; monitors context utilization via PostToolUse hook; 60% advisory threshold and 70% critical threshold (both configurable in `plugin.json`); Context Window Recovery Decision Matrix at 70% evaluates git status, recent commits, and checkpoint existence to surface a single recommended recovery action; `user-invocable: false`; version 1.0.3

#### CocoWatch — Developer Engagement Observer (Feature 32)
- `cocowatch/cocowatch.skill.md` — new skill file; non-blocking always-on observer tracking three dimensions: Delegation Intensity, Review Depth, and Engagement Zone; `blocking: false` enforced structurally in frontmatter; captures signals from `$secondeye acknowledge`, CocoHarvest decomposition reviews, SLIM/FULL checkpoint responses, and CocoSpec declarations; surfaces summary at `$ship` and FULL checkpoints only; session observations written to `.cocoplus/lifecycle/cocowatch-session.md` (ephemeral, not committed); version 1.0.3

#### CocoMeter — Accuracy Learning Feedback Loop (Feature 21 enhancement)
- `cocometer/meter-accuracy.skill.md` — new `$meter accuracy` command displays estimation history, current adjustment factor, sample size, and trend from last 5 sessions
- `cocometer/meter-estimate.skill.md` — updated to read `adjustment-factor.json` and apply calibration factor to pre-flight estimates; logs to `preflight-log.jsonl` for SessionEnd feedback loop; surfaces calibration factor and sample size alongside estimate; version 1.0.3

### Updated

#### CocoBrew — Spec Phase (Feature 1)
- `cocobrew/spec.skill.md` — added Vague Language Detector: deterministic pattern scan across 6 term categories (performance, quality, scale, safety, UX, cost) before writing spec.md; up to −3 point CocoSpec penalty per vague instance; developer offered chance to refine answers before spec is committed; version 1.0.3

#### SecondEye — Devil's Advocate Fourth Lens (Feature 19)
- `secondeye/secondeye.skill.md` — added fourth parallel critic (Sonnet-tier Devil's Advocate); adversarial mandate to find strongest argument plan should not proceed; all DA findings BLOCKING by default; rebuttal scoring (1–5) required before concession — score <4 re-asserts; DA section sorted to top of report; `da_finding_count` added to `action_summary`; version 1.0.3

#### CocoFlow — Adaptive Checkpoint Typing (Feature 6)
- `execution-engine/flow-run.skill.md` — added MANDATORY/FULL/SLIM checkpoint types with default assignment rules; Awareness Guard promotes checkpoint to FULL after 4 consecutive bare SLIM responses; HITL stages always MANDATORY; EHRB-adjacent stages auto-promoted to MANDATORY; `consecutive_slim_responses` tracked in tasks.json; version 1.0.3

#### CocoBrew — Rollback by Git Tag (Feature 1)
- `rewind.skill.md` — extended `$rewind` with `--tag <tag-name>` flag for sub-phase granularity; resolves `cocoplus/harvest/[run-id]/task-[N]` and `cocoplus/fn/[name]/v[N]` tags; abbreviated form (e.g. `task-007`) auto-resolves to full tag name; CocoPlus tag list shown alongside phase commits when no step-id provided; version 1.0.3

### Fixed

- Registered and defined the CocoScout and CocoWatch background agents so the manifest matches runtime agent files.
- Completed skill metadata and required Exit Criteria / Anti-Rationalization sections across all new and updated skills for validation compliance.
- Normalized all CocoPlus command references to the `$` prefix across docs, skills, hooks, and templates — removed all remaining `/cmd` slash-command references.
- Updated public feature-count references to 32 features across the documentation.

### Documentation

- `docs/concepts.html`, `docs/architecture.html`, `docs/workflows.html` — fixed all remaining slash commands to `$` prefix
- `docs/features.html` — added Feature 32 CocoWatch block; updated header count 31→32
- `docs/index.html` — added Feature 32 row to feature table; updated card count 31→32
- `docs/command-reference.html`, `docs/getting-started.html`, `README.md` — normalized all command prefixes to `$`

---

## [1.0.2] — May 2026

### Added

#### CocoHealth — Context Utilization Monitor (Feature 27)
- `pod-checkpoint.skill.md` — `$pod checkpoint` writes a structured recovery snapshot to `lifecycle/checkpoint.md`; captures current phase, in-progress flow stage, last 5 decisions, open must-fix items, HITL stages awaiting approval, active CocoHarvest harvest status, and triggered seeds; includes Context Window Recovery Decision Matrix recommendation when context is at/near 70% utilization

#### CocoMap — Cortex Function Knowledge Graph (Feature 28)
- `map.skill.md` — `$map` triggers a 5-agent parallel analysis pipeline (Function Scanner, Dependency Mapper, Domain Analyzer, Evaluation Mapper, Gap Detector); agents write intermediate results to `.cocoplus/map/intermediate/` without returning to orchestrator context; merges into committed `coco-map.json` with structural dependency graph and domain intent map; creates git commit
- `map-diff.skill.md` — `$map diff` reads staged git changes and `coco-map.json` to trace downstream impact of modified functions before commit lands; shows affected dependents, shared evaluation sets, and capability definitions
- `map-explain.skill.md` — `$map explain <target>` produces natural-language explanation of a specific function, business capability, or vocabulary term from the committed knowledge graph

#### CocoSeed — Deferred Ideas with Trigger Conditions (Feature 29)
- `seed-add.skill.md` — `$seed add "<idea>" --trigger "<condition>"` stores a forward-looking idea with a trigger condition as a YAML file in `.cocoplus/seeds/`; captures current lifecycle phase for context
- `seed-list.skill.md` — `$seed list` evaluates all pending seed trigger conditions against current project state (filesystem, lifecycle phase, mode flags); updates `status: triggered` for newly-fired seeds; displays Ready to Promote and Waiting sections
- `seed-promote.skill.md` — `$seed promote <id>` moves a triggered seed into `lifecycle/spec.md` under a Backlog Items section; marks seed as `status: promoted`

#### CocoDiscuss — Decision-Locking Pre-Plan Phase (Feature 30)
- `discuss.skill.md` — `$discuss` runs a structured wizard capturing model selection, evaluation methodology, accuracy threshold, warehouse assignment, production safety requirements, and scope boundaries into `lifecycle/discuss.md`; adapts questions to work type (AI function, Cortex Search, semantic model); auto-skips questions answered by CocoContext organizational standards; includes CocoSpec 5-dimension quality scoring gate (0–10, required ≥9) with Quick Mode bypass (skips Plan phase when score ≥9, scope ≤3 files, no EHRB indicators)

#### CocoGrove — Ubiquitous Language Section (Feature 12 improvement)
- `grove-glossary.skill.md` — `$grove glossary` scans project artifacts for domain vocabulary candidates and proposes additions to `.cocoplus/grove/language/glossary.md`; developer reviews and confirms each term before writing; creates git commit for accepted entries
- `grove-glossary-view.skill.md` — `$grove glossary view` displays the current glossary in alphabetical order with definitions, aliases, and associated functions

#### CocoPod — Project Knowledge Base (Feature 5 improvement)
- `pod-kb.skill.md` — `$pod kb` displays `lifecycle/kb.md` — the project-specific knowledge base populated by CocoCupper with Patterns, Decisions, and Gotchas across sessions; shows entry count by section and last update date

### Updated (Existing Features)

#### CocoBrew — Review Phase (Feature 1)
- `review.skill.md` — Decision Coverage Gate added: extracts key decisions from `plan.md` and `discuss.md`, scans implementation artifacts for evidence each decision is honored, flags Coverage Gaps as must-fix severity that block `$ship` until resolved or acknowledged with documented rationale

#### CocoBrew — Plan Phase (Feature 1 / Feature 30)
- `plan.skill.md` — CocoSpec pre-flight quality gate added as mandatory pre-plan step; spawns background Haiku scorer against 5 dimensions (Value, Scope, Acceptance, Boundaries, Risk) with 0–2 scoring; score ≥9 required; Quick Mode offered when score ≥9 + scope ≤3 files + no EHRB indicators; discuss.md is read and its decisions reflected in plan.md

#### CocoHarvest (Feature 3)
- `cocoharvest.skill.md` — added: CocoLens HITL/AFK classification per stage at decomposition time with developer override; Enhancement G adaptive parallelism (Normal → Caution → Single-track concurrency modes based on SubagentStop failure signals); stall detection by output token rate (threshold: 150 tokens/step, 5-step minimum, re-prompt before escalation); shell identity injection (COCOPLUS_FUNCTION, COCOPLUS_PERSONA, COCOPLUS_EVAL_ID, COCOPLUS_HARVEST_ID); consecutive failure escalation after 3 hard failures (configurable per stage); dual-file state initialization (`harvest/[run-id]-progress.txt` + `harvest/[run-id]-tasks.json`) for context-reset recovery

#### CocoFlow — Execution Engine (Feature 6)
- `flow-run.skill.md` — added: `--concurrency <normal|caution|single-track>` flag to force concurrency mode for a run; dual-file state recovery on resume (reads `harvest/[run-id]-tasks.json` to skip already-completed stages); intermediate result persistence for parallel evaluation stages (detailed results to `.cocoplus/harvest/intermediate/`, only summaries return to orchestrator); HITL stage pausing with developer review before downstream stages spawn; consecutive failure tracking with escalation at threshold
- `flow-status.skill.md` — added Concurrency Mode field showing current mode and last transition trigger event; added HITL column to stage status table

#### Safety Gate (Feature 9)
- `pre-tool-use.js` — added Prompt Injection Defense: structural anomaly scan on planning artifact reads (injection-type pattern detection, including base64-encoded content), logged to `safety-audit.jsonl`; added EHRB (Elevated-Hazard Requiring Buy-in) classification for SnowflakeSqlExecute calls, covering 5 categories (Production systems, Sensitive/PII, Destructive operations, Billing-significant, Security-critical); EHRB fires before Layer 1 hard gate and surfaces confirmation warning; EHRB billing threshold configurable in `safety-config.json`; execution order: injection scan → EHRB → Layer 1

#### SecondEye (Feature 19)
- `secondeye.skill.md` — added HITL/AFK classification per finding (HITL for Critical, architectural, or ambiguous findings; AFK for fix-pattern-mapped findings); added BLOCKING/MINOR classification (BLOCKING for correctness/security/architectural scope; MINOR for style/naming/non-critical coverage); report frontmatter gains `action_summary` with `hitl_count`, `afk_count`, `blocking_count`, `minor_count`
- `secondeye-acknowledge.skill.md` — added `--hitl-only` flag (acknowledge only HITL-classified findings; queue AFK for autonomous resolution) and `--blocking-only` flag (acknowledge only BLOCKING-classified findings; queue MINOR for autonomous resolution)

#### CocoScout (Feature 24)
- `cocoscout/SKILL.md` — added Two-Lens Relevance Ranking: Technical relevance (implementation approach) and Domain relevance (business intent), combined as weighted composite per persona type (DE/DS/AE: 70/30 technical/domain; DA/BI: 40/60; DPM/DST/CDO: 20/80); weights configurable in `plugin.json` under `cocoScout.weights`; added Anchor Lens: pre-compiled methodology vocabulary catalog at `grove/anchors/catalog.md`, pattern-matched against task message (<50ms, no LLM call), injects anchor names into build agent context preamble; per-persona anchor weighting; added `lifecycle/kb.md` as always-loaded low-tier context source for Build phase tasks; added CocoGrove glossary as context source ranked by term overlap

#### CocoPod — Status (Feature 5)
- `pod-status.skill.md` — added Project KB entry count to Section 6 (CocoGrove): shows "Project KB: N entries" or "Project KB: not yet populated"

### Notes
- Feature 31 (CocoLens) is integrated into CocoHarvest decomposition as a behavioral enhancement to `cocoharvest.skill.md` — no separate skill file required; HITL/AFK classification is applied automatically during plan decomposition with developer override available before spawning

---

## [1.0.1] — April 2026

### Added

#### CocoView — Flow Visualizer (Feature 20)
- `flow-view.skill.md` — `$flow view` renders `flow.json` as an interactive HTML DAG; injects pipeline data into `flow-view.html.template` and opens in the default browser; `--output <path>` writes to a custom path without opening the browser

#### CocoMeter Enhanced — Token Attribution & Dashboard (Feature 21)
- `meter-view.skill.md` — `$meter view` queries `SNOWFLAKE.ACCOUNT_USAGE.CORTEX_CODE_CLI_USAGE_HISTORY` (two-pass query for direct and subagent-anchor request IDs), joins with local `request-map.jsonl` attribution data, injects into `meter-view.html.template`, and opens in browser
- `meter-sync.skill.md` — `$meter sync` refreshes the dashboard with updated Snowflake data without reopening the browser; intended for use after the 90-minute usage history latency window
- Updated `post-tool-use.js` — Section 5 captures `request_id` from every Snowflake tool result when CocoMeter is active, appending to `.cocoplus/meter/request-map.jsonl` with `stage_id`, `persona`, `tool_name`, `session_id`, and `timestamp` for per-stage attribution

#### CocoContext — Organizational Standards Capture (Feature 23)
- `context-add.skill.md` — `$context add` guided wizard captures org standards into `.cocoplus/context/<category>.md`; six categories: approved-models, quality-thresholds, pii-policy, warehouse-policy, naming-conventions, governance-gates; enforces ≤200 line limit; auto-commits with `feat(context):` message
- `context-view.skill.md` — `$context view [name]` displays a context file with line count and last-modified date
- `context-list.skill.md` — `$context list` shows all six standard slots with status (line count, date, or "not created")

#### CocoRecipe — Pre-Built Pipeline Templates (Feature 25)
- `recipe-list.skill.md` — `$recipe list` enumerates all templates from profile `recipes/` folder and project-local `.cocoplus/recipes/`
- `recipe-use.skill.md` — `$recipe use <name>` collects `{{param}}` values interactively, validates generated JSON against CocoFlow schema, writes to `.cocoplus/flow.json`
- `recipe-new.skill.md` — `$recipe new <name>` saves the current `flow.json` as a parameterized template in the profile `recipes/` folder

#### CocoDream — Supervised Pattern Distillation (Feature 26)
- `dream.skill.md` — `$dream` distils prompt iteration patterns from `.cocoplus/prompts/` histories (requires ≥3 versions per function); launches CocoCupper to cluster worked-patterns, anti-patterns, and neutral changes; writes candidates to `.cocoplus/grove/dream-<timestamp>.md` for developer review
- `dream-history.skill.md` — `$dream history [n]` lists past distillation sessions newest-first with function count and candidate breakdown

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
- `$pod init` — initialize CocoPlus project structure in any git repo; prompts for project name and description; creates `.cocoplus/` with all required subdirectories, `AGENTS.md`, `project.md`, `flow.json`, `safety-config.json`, `personas.json`, `subagents.json`, root `AGENTS.md` shim, `.gitignore` for transient files; creates initial git commit
- `$pod status` — full project state dashboard reading from `.cocoplus/`
- `$pod resume` — context reconstruction for returning developers; narrative summary of where work left off

#### CocoBrew Lifecycle
- `$spec` — structured requirements dialogue; outputs `spec.md`
- `$plan` — CocoHarvest decomposition + `flow.json` generation + Coco native plan mode approval gate
- `$build` — parallel persona subagent execution in isolated git worktrees via CocoHarvest
- `$test` — validation against spec success criteria (SQL, notebook, file-existence)
- `$review` — aggregates Quality Advisor findings, CocoCupper intelligence, spec compliance
- `$ship` — gated final commit with lifecycle summary, semantic version tag, optional PR
- `$rewind` — soft-reset rollback to any CocoBrew phase commit
- `$fork` — isolated git worktree for exploration without touching main branch

#### Specialist Personas (8 agents)
- `$de` Data Engineer — Sonnet, auto mode, schema/SQL/pipelines
- `$ae` Analytics Engineer — Sonnet, auto mode, semantic models/transformations
- `$ds` Data Scientist — Sonnet, auto mode, notebooks/ML/Cortex AI
- `$da` Data Analyst — Haiku, auto mode, query writing/exploration
- `$bi` BI Analyst — Haiku, auto mode, dashboards/semantic layer
- `$dpm` Data Product Manager — Sonnet, plan mode only
- `$dst` Data Steward — Sonnet, plan mode only, governance/data quality
- `$cdo` Chief Data Officer — Opus, plan mode only, strategic architecture
- `$personas` — list all personas with model, mode, tools

#### CocoHarvest
- Task decomposition at Plan phase — auto-assigns workstreams to specialist personas
- Parallel subagent spawning in isolated git worktrees
- Dependency-ordered stage execution via `flow.json`
- Direct persona invocation with `$<shorthand>` and `--continue`, `--model` flags

#### CocoFlow Pipeline
- `$flow run` — execute full pipeline or specific stage; Tier 2/3 model override flags
- `$flow status` — live stage status with runtime, checkpoints, failure reasons
- `$flow pause` — halt after current stage completes
- `$flow resume` — resume with checkpoint validation before restart
- `flow.json` template with stage definitions, dependencies, checkpoint paths

#### Safety Gate
- `PreToolUse` hook — intercepts `SnowflakeSqlExecute` before execution
- Three modes: `strict` (hard block), `normal` (warn, default), `off`
- `$safety strict`, `$safety normal`, `$safety off`
- Configurable production schema patterns via `.cocoplus/safety-config.json`
- Batch soft-gate for multi-destructive CocoFlow stages

#### Memory Engine
- Three-layer persistence: hot (AGENTS.md), warm (`memory/`), cold (grove patterns)
- `PostToolUse` hook captures schema changes, plan updates, explicit decisions
- `PreCompact` hook flushes context to warm memory before compaction
- `$memory on`, `$memory off`
- Cross-session decisions log at `memory/decisions.md`

#### Environment Inspector
- `$inspect` — full Snowflake environment scan (schemas, tables, views, functions, Cortex objects, grants)
- `--schema` flag for targeted scan; `--full` for column-level statistics
- `$inspector on`, `$inspector off` — auto-scan on session start via `SessionStart` hook
- Snapshots written to `.cocoplus/snapshots/`

#### Code Quality Advisor
- `$quality on`, `$quality off` — background review after every `.sql` write
- `$quality run` — immediate full review; optional file path argument
- Findings categorized: performance, correctness, governance, cost
- `quality-advisor` background agent — consumes queued SQL review requests and writes findings reports

#### CocoMeter
- `$meter on`, `$meter off` — token tracking via `PostToolUse` hook
- `$meter` — current session summary by feature and operation
- `$meter estimate` — pre-flight cost estimation via Haiku
- `$meter history` — per-session cost summaries from `meter/history.jsonl`
- `current-session.json` initialized at `SessionStart`, finalized at `SessionEnd`

#### CocoCupper
- Background Haiku agent — read-only, triggered automatically at `Stop` and `SubagentStop`
- `$cup` — manual trigger
- `$cup history` — browse findings from past sessions
- Findings written to `.cocoplus/grove/cupper-findings.md`

#### CocoGrove
- `$patterns view` — browse promoted patterns, filter by tag
- `$patterns promote` — elevate CocoCupper finding to permanent pattern file in `grove/patterns/`
- Patterns are versioned markdown files in git

#### CocoSpark
- `$spark [topic]` — divergent thinking mode; generates multiple approaches, raises assumptions
- `$spark-off` — exit with option to carry insights into `spec.md`
- Output saved to timestamped file; never modifies lifecycle artifacts automatically

#### SecondEye
- `$secondeye` — three-model parallel plan critique (Haiku efficiency, Sonnet completeness, Opus risk)
- `$secondeye --artifact` — critique any lifecycle artifact or file path
- `$secondeye --model` — single-model critique
- `$secondeye acknowledge` — clear Build soft gate after reviewing Critical findings
- `$secondeye history` — list all reports with finding counts and acknowledgment status
- Findings classified: Critical, Advisory, Observation

#### Context Mode
- `$context on`, `$context off` — narration overlay on all CocoPlus actions

#### Doc Engine
- `$doc run` — generate column descriptions, docstrings, schema lineage, data dictionary entries

#### Prompt Studio
- `$prompt new` — guided Cortex AI prompt creation workflow
- `$prompt compare` — side-by-side variant comparison with token cost analysis

#### CocoFleet
- `$fleet init` — create fleet manifest template
- `$fleet run` — execute multi-process fleet with dependency graph resolution
- `$fleet status` — live instance status table
- `$fleet logs` — stream instance output log
- `$fleet stop` — graceful SIGTERM → SIGKILL shutdown

#### Assist Mode
- `$cocoplus on` — activate all features simultaneously; triggers Environment Inspector background scan
- `$cocoplus off` — deactivate all features; preserve all data

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
- `$spark` skill name corrected from `cocospark` to `spark`
- CocoFleet manifest format aligned with FEATURES.md spec
- `flow.json` template model changed from hardcoded ID to portable `sonnet` alias
- `safety-config.json` template — added `production_schema_patterns` key
- All 56 skills — Exit Criteria and Anti-Rationalization sections added
- All platform-specific bash commands in skills replaced with Node.js one-liners

---

[1.0.0]: https://github.com/Snowflake-Labs/cocoplus/releases/tag/v1.0.0
[1.0.1]: https://github.com/Snowflake-Labs/cocoplus/releases/tag/v1.0.1
[1.0.2]: https://github.com/Snowflake-Labs/cocoplus/releases/tag/v1.0.2
[1.0.3]: https://github.com/Snowflake-Labs/cocoplus/releases/tag/v1.0.3
[1.1.0]: https://github.com/Snowflake-Labs/cocoplus/releases/tag/v1.1.0
