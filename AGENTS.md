# CocoPlus Plugin — Behavioral Rules
# Auto-loaded by Coco when CocoPlus plugin is active.
# This is the plugin-level AGENTS.md (≤200 lines).
# Per-project context lives in .cocoplus/AGENTS.md after /pod init.

## Plugin Identity

You have the CocoPlus plugin active. CocoPlus enhances Coco with:
- **CocoBrew** lifecycle engine (/spec, /plan, /build, /test, /review, /ship)
- **CocoHarvest** parallel workstream decomposition (/harvest)
- **Specialist Personas** ($de, $ae, $ds, $da, $bi, $dpm, $dst, $cdo)
- **Safety Gate** (SQL protection — safety strict/normal/off)
- **Memory Engine** (cross-session persistence — /memory on/off)
- **CocoFlow** pipeline execution (/flow run/status/pause/resume)
- **SecondEye** multi-model critic (/secondeye)
- **CocoFleet** multi-process orchestration (/fleet init/run/status/stop/logs)
- **CocoCupper** background intelligence analyst (/cup)
- **CocoGrove** pattern library (/patterns)
- **CocoMeter** token tracking (/meter)

## Core Behavioral Rules

1. **Check CocoPod state first.** Before any action, check if `.cocoplus/` exists.
   If not initialized, prompt: "Run `/pod init` to initialize CocoPlus for this project."

2. **Respect the lifecycle phase.** Current phase is in `.cocoplus/AGENTS.md`.
   Do not skip phases without explicit developer intent. Phases gate what actions are appropriate.

3. **Safety Gate is always active.** Default mode is `safety.normal`.
   - In `strict` mode: block all destructive SQL (DROP, DELETE, TRUNCATE, ALTER) without explicit confirmation.
   - In `normal` mode: warn and require confirmation for destructive SQL.
   - In `off` mode: allow all SQL (developer assumed responsibility).
   Never silently bypass the safety gate.

4. **Memory is opt-in.** Memory Engine is off by default. Do not write to `.cocoplus/memory/`
   unless `/memory on` has been run or `memory.on` flag exists in `.cocoplus/modes/`.

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

- `/spec` → enters Spec phase. Outputs `.cocoplus/lifecycle/spec.md`
- `/plan` → enters Plan phase. Requires spec.md. Outputs `.cocoplus/lifecycle/plan.md`
- `/build` → enters Build phase. Requires plan.md. Runs Safety Gate pre-flight.
- `/test` → enters Test phase. Requires Build artifacts.
- `/review` → enters Review phase. May invoke SecondEye.
- `/ship` → enters Ship phase. Creates git tag, deployment record.

## When CocoPlus Is Not Initialized

If `.cocoplus/` does not exist, all CocoPlus commands should gracefully suggest `/pod init`.
Never error loudly — guide the developer to the right starting point.
