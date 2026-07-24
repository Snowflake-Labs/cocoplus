# CocoPlus Plugin — Behavioral Rules
# Auto-loaded by Coco when CocoPlus plugin is active.
# This is the plugin-level AGENTS.md.
# Per-project context lives in .cocoplus/AGENTS.md after $pod init.

## Plugin Identity

You have the CocoPlus plugin active. CocoPlus enhances Coco with:
- **CocoBrew** lifecycle engine ($spec, $plan, $build, $test, $review, $ship)
- **CocoHarvest** parallel workstream decomposition ($harvest)
- **Specialist Personas** ($de, $ae, $ds, $da, $bi, $dpm, $dst, $cdo)
- **Safety Gate** SQL protection ($safety strict/normal/off)
- **Memory Engine** cross-session persistence ($memory on/off)
- **Environment Inspector** Snowflake state snapshot ($inspector on/off)
- **CocoFlow** pipeline execution ($flow run/status/pause/resume/view)
- **SecondEye** multi-model plan critic ($secondeye)
- **CocoFleet** multi-process orchestration ($fleet init/run/status/stop/logs)
- **CocoCupper** background intelligence analyst ($cup, $cup history)
- **CocoGrove** pattern library ($patterns view, $patterns promote, $grove glossary)
- **Code Quality Advisor** SQL/code anti-pattern checker ($quality on/off)
- **Prompt Studio** prompt engineering & comparison ($prompt, $prompt compare)
- **Doc Engine** auto-documentation ($doc run)
- **Context Mode** context transparency ($context-mode on/off)
- **CocoMeter** token tracking ($meter on/off, $meter, $meter estimate, $meter history)
- **CocoMeter Enhanced** flow attribution & dashboard ($meter view, $meter sync, $meter accuracy)
- **CocoView** flow pipeline visualizer ($flow view)
- **Assist Mode** master feature toggle ($cocoplus on/off)
- **CocoContext** organizational standards capture ($context add, $context view, $context list)
- **CocoBehavior** ambient behavioral constraints (auto-loaded by all personas)
- **CocoScout** relevance-ranked context loading (automatic pre-execution)
- **CocoMap** Cortex function knowledge graph ($map, $map diff, $map explain)
- **CocoRecipe** pre-built pipeline templates ($recipe list, $recipe use, $recipe new)
- **CocoDream** supervised cross-session pattern distillation ($dream, $dream history)
- **CocoSeed** deferred ideas with trigger conditions ($seed add, $seed list, $seed promote)
- **CocoDiscuss** decision-locking pre-plan phase ($discuss)
- **CocoLens** HITL/AFK task classification (integrated into CocoHarvest decomposition)
- **CocoWatch** developer engagement observer (non-blocking, surfaces at $ship)
- **CocoHealth** context utilization monitor (automatic via PostToolUse hook)
- **CocoBloom** working-backwards pre-commitment gate ($bloom, $bloom --skip)
- **CocoKlatch** genuine multi-agent roundtable ($klatch, $klatch --participants=N)
- **CocoPull** lossless context distillation ($pull, $pull --validate)
- **CocoSentinel** eight-dimension artifact quality gate ($sentinel, $sentinel approve, $sentinel --report)
- **CocoWisdom** institutional rejection memory ($wisdom, $wisdom list, $wisdom search, $wisdom insights)
- **CocoReview** structured code review with six-severity vocabulary ($review, $review --security, $review --complexity)
- **CocoOps** delivery intelligence dashboard ($ops dora, $ops sprint, $ops suggest, $ops demo)
- **CocoConsole** V2 read-only local browser control plane ($cocoplus console)
- **CocoPilot** V2 natural-language orchestration mode ($pilot on/off)
- **CocoForge** V2 goal-driven expert-team loop ($forge, $forge goal/status/stop)
- **Leviathan + Ronin** V2 explicit-activation autonomous coordination ($leviathan on/off/status/learn)
- **Dynamic Personas** V2 evidence-gated emergent specialists ($personas discover/list/invoke/dissolve)
- **Governance Hooks** V2 ReviewerLockout and PII governance observe/enforce policies
- **CocoSession** V2 multi-session continuity and operator control ($session status/progress/steer/stop/resume)
- **CocoFlow Evidence and Proposal Gates** V2 opt-in stage evidence and retained proposal settlement ($flow settle)
- **CocoRetro and CocoHygiene** V2 measured improvement loops ($retrospective, $hygiene --model-upgrade, $meter benchmark)
- **CocoRoutine** V2 opt-in Snowflake TASK scheduling for self-contained completed workflows ($routine)
- **Late-Cycle Governance and Quality Gates** V2 RBAC escalation guard, bypass safeguard logging, named artifacts, stage coach, correctness-first metering, complexity-aware dispatch, ACRR calibration, and CocoBrew distribution gate

## Core Behavioral Rules

1. **Check CocoPod state first.** Before any action, check if `.cocoplus/` exists.
   If not initialized, prompt: "Run `$pod init` to initialize CocoPlus for this project."

2. **Respect the lifecycle phase.** Current phase is in `.cocoplus/AGENTS.md`.
   Do not skip phases without explicit developer intent. Phases gate what actions are appropriate.

3. **Safety Gate is always active.** Default mode is `safety.normal`.
   - In `strict` mode: block all destructive SQL (DROP, DELETE, TRUNCATE, ALTER) without explicit confirmation.
   - In `normal` mode: warn and require confirmation for destructive SQL.
   - In `off` mode: allow all SQL (developer assumed responsibility).
   Never silently bypass the safety gate.

4. **Memory is opt-in.** Memory Engine is off by default. Do not write to `.cocoplus/memory/`
   unless `$memory on` has been run or `memory.on` flag exists in `.cocoplus/modes/`.

5. **Token economy matters.** Load only context needed for the current action.
   Never auto-load large files (env snapshots, full history) unless explicitly requested.
   CocoMeter tracks token usage — be a good citizen.

6. **Personas are locked tool sets.** When a persona subagent is active ($de, $ae, etc.),
   it operates within its defined tool restrictions. Do not route tasks to personas whose
   tool set doesn't match the work needed.

7. **CocoFlow stages are atomic.** A stage either completes its checkpoint or it doesn't.
   Partial stage completion is NOT the same as completion. Check `.cocoplus/flow.json`
   stage checkpoints before reporting done.

8. **Hooks are authoritative.** If a hook writes to `.cocoplus/`, that is the source of truth.
   Skills read state; hooks update state.

9. **V2 modes are opt-in and conditional.**
   - CocoPilot is active only when `.cocoplus/modes/cocopilot.on` exists.
   - CocoForge is active only when `.cocoplus/modes/cocoforge.on` exists and supersedes CocoPilot while running.
   - Leviathan/Ronin require explicit covenant acceptance and `.cocoplus/modes/leviathan.on`.
   - Dynamic personas require evidence before activation and retain `history.md` after dissolution.
   - CocoConsole is read-only; it never approves gates or mutates project state.

10. **CocoSession is the continuity source.**
   Long-running work must be recoverable from `.cocoplus/session/PROGRESS.md` and predicate-style `.cocoplus/session/CONTEXT.md`.
   If `.cocoplus/AGENT_STOP` exists, tool use is blocked until the operator resumes. `.cocoplus/STEER.md` is one-shot steering, not standing context.

11. **Evidence and proposals precede advancement.**
   When `[evidence_gate] enabled = true`, CocoFlow stages do not advance without a qualifying evidence read.
   When a stage uses retained proposals, Snowflake writes and pipeline changes stay under `.cocoplus/proposals/` until `$flow settle --accept`.

12. **Measure before optimizing.**
   Use `$meter benchmark`, ACRR trends, `$retrospective run`, and `$hygiene --model-upgrade` to establish evidence before changing skills, hooks, governance rules, flow templates, or complexity baselines.

13. **Runtime permission posture is live, not assumed.**
   Governance that depends on permission level must check at enforcement time. RBAC escalation to `ACCOUNTADMIN` is blocked by default; bypass safeguard states are logged and may trigger the CocoSession kill-switch by policy.

14. **Artifacts are contracts.**
   CocoFlow stages that declare `artifacts.reads` and `artifacts.writes` must satisfy those files structurally. Missing handoff files are deterministic failures, not model-interpretation questions.

15. **Correctness leads cost.**
   CocoMeter comparisons report accuracy before token, credit, or ACRR deltas unless cost-first mode is explicitly configured and acknowledged. Cost reduction with accuracy regression is not an improvement; high ACRR with stable accuracy is a calibration issue, not a quality win.

## Persona Shorthand Quick Reference

| Shorthand | Persona              | Primary Tools                              |
|-----------|----------------------|--------------------------------------------|
| $de       | Data Engineer        | SnowflakeSqlExecute, Bash, Write, Read     |
| $ae       | Analytics Engineer   | SnowflakeSqlExecute, Read, Write           |
| $ds       | Data Scientist       | NotebookExecute, Read, Write, Bash         |
| $da       | Data Analyst         | SnowflakeSqlExecute, Read, WebSearch       |
| $bi       | BI Analyst           | Read, WebSearch, Write                     |
| $dpm      | Data Product Manager | Read, Write, WebSearch                     |
| $dst      | Data Steward         | Read, SnowflakeSqlExecute, Write           |
| $cdo      | Chief Data Officer   | Read, WebSearch, Write                     |

## CocoBrew Phase Gates

- `$spec` → enters Spec phase. Outputs `.cocoplus/lifecycle/spec.md`
- `$plan` → enters Plan phase. Requires spec.md. Outputs `.cocoplus/lifecycle/plan.md`
- `$build` → enters Build phase. Requires plan.md. Runs Safety Gate pre-flight.
- `$test` → enters Test phase. Requires Build artifacts.
- `$review` → enters Review phase. May invoke SecondEye.
- `$ship` → enters Ship phase. Creates git tag, deployment record.

## When CocoPlus Is Not Initialized

If `.cocoplus/` does not exist, all CocoPlus commands should gracefully suggest `$pod init`.
Never error loudly — guide the developer to the right starting point.
