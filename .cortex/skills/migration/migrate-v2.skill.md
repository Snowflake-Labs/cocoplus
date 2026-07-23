---
name: "migrate-v2"
description: "Migrate an existing CocoPlus 1.x CocoPod into the current project shape."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - migration
  - v2
---

Your objective is to migrate an existing CocoPlus 1.x project to the current architecture.

Supported commands:

- `$migrate v2 --dry-run`
- `$migrate v2`
- `$migrate v2 --from 1.x`

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` for a new pod." Then stop.

This skill exists for released 1.x CocoPods. Do not include migration handling for unreleased internal transition states.

## Version Discovery

Inspect the existing project before planning changes:

1. Read `.cocoplus/lifecycle/meta.json`, `.cocoplus/AGENTS.md`, `.cocoplus/project.md`, `.cocoplus/flow.json`, `.cocoplus/.gitignore`, and any `cocoplus.toml` or `safety-config.json`.
2. Infer the source version family:
   - `1.0.x` or `1.1.x`: no `cocoplus.toml`, older safety-config-only state, no chargeback/trace/recall folders.
   - `1.2.x`: may include `cocoplus.toml`, recall/trace/pivot artifacts, chargeback files, or newer lifecycle folders.
   - Unknown 1.x: treat conservatively and preserve everything.
3. Record the inferred version, evidence, and uncertainty in the migration report.
4. Refuse to proceed if the project appears to have already been migrated and `--force` is not present.

## Dry Run

For `--dry-run`, inspect and report without writing:

1. Missing current directories: `.cocoplus/flows/templates/`, `.cocoplus/flows/templates/archive/`, `.cocoplus/flow/artifacts/`, `.cocoplus/proposals/`, `.cocoplus/proposals/archive/`, `.cocoplus/session/`, `.cocoplus/personas/`, `.cocoplus/personas/archive/`, `.cocoplus/skills/`, `.cocoplus/governance/`, `.cocoplus/routines/`, `.cocoplus/sentinel/`, `.cocoplus/brew/`, `.cocoplus/migration/`, `.cocoplus/migration/archive/`.
2. Missing current files: `.cocoplus/personas/dynamic-registry.json`, `.cocoplus/v2-runtime-requests.jsonl`, `.cocoplus/.last-consolidation`, `.cocoplus/.last-retrospective`, `.cocoplus/pod-state.json`, `.cocoplus/session/PROGRESS.md`, `.cocoplus/session/CONTEXT.md`, `.cocoplus/session/task-queue.jsonl`, `.cocoplus/session/stage-evidence.json`, `.cocoplus/session/iteration-budget.json`, `.cocoplus/session/budget-state.json`, `.cocoplus/session/status.json`, `.cocoplus/session/discoveries.jsonl`, `.cocoplus/proposals/proposal-log.jsonl`, `.cocoplus/routines/registry.json`.
3. Missing `cocoplus.toml` sections or keys: `[cocoplus]`, `[cocopilot]`, `[cocoforge]`, `[leviathan]`, `[dynamic_personas]`, `[governance]`, `[session]` with `budget_limit`, `budget_reserve_fraction`, and `budget_enforcement`, `[harness]`, `[evidence_gate]`, `[proposals]`, `[research]`, `[retrospective]`, `[routine]`, `[meter]` with `track_coordination_cost` and `coordination_warning_threshold`, `[flow.planning]`, `[flow.planning.frames]`, `[flow.tiers]`, `[model_roles]`.
4. Legacy configuration that needs conversion: `safety-config.json`, older monitor templates, missing `.cocoplus/.gitignore` entries, older AGENTS activation blocks.
5. Testing and validation commands that will run after migration.
6. Post-migration cleanup actions that will archive legacy config files and remove obsolete generated scratch state.

Output a migration report with PASS/WARN/ACTION rows. Do not write any files in dry-run mode.

## Apply Migration

When not in dry-run mode:

1. Create missing current directories.
2. Create `.cocoplus/personas/dynamic-registry.json` if absent:

```json
{
  "version": 1,
  "active": [],
  "candidates": [],
  "dissolved": []
}
```

3. Create `.cocoplus/v2-runtime-requests.jsonl` if absent.
4. Create `.cocoplus/.last-consolidation` and `.cocoplus/.last-retrospective` with current epoch milliseconds if absent.
5. Create CocoSession files if absent: `session/PROGRESS.md`, `session/CONTEXT.md`, `session/task-queue.jsonl`, `session/stage-evidence.json`, `session/iteration-budget.json`, `session/budget-state.json`, `session/status.json`, and `session/discoveries.jsonl`.
6. Create retained-proposal log `.cocoplus/proposals/proposal-log.jsonl` if absent.
7. Create CocoRoutine registry `.cocoplus/routines/registry.json` if absent.
8. Create `.cocoplus/pod-state.json` with canonical status `idle` if absent.
9. Ensure `.cocoplus/flow/artifacts/`, `.cocoplus/sentinel/`, and `.cocoplus/brew/` exist for named artifact handoffs, coach queues, and distribution gate reports.
10. Convert `safety-config.json` into `cocoplus.toml` when `cocoplus.toml` is absent. Preserve the original file until post-migration cleanup.
11. Append missing current config sections to `cocoplus.toml` or `.cocoplus/cocoplus.toml`, preserving existing values.
12. Append current activation blocks to `.cocoplus/AGENTS.md` if missing, including CocoSession budget reserve, canonical terminal statuses, evidence gates, proposal settlement, named artifacts, CocoRoutine, stage coaching, retrospective, hygiene, and benchmarking.
13. Update `.cocoplus/.gitignore` with current transient runtime files: `v2-runtime-requests.jsonl`, `subagent-spawn-requests.jsonl`, `ui-notifications.jsonl`, `recall.db`, `lifecycle/findings-state.json`, `pod-status.json`, `.last-consolidation`, `.last-retrospective`, `AGENT_STOP`, `STEER.md`, runtime state JSON files, archive scratch directories, proposal scratch directories, coach queues, session budget/status/discovery files, and generated dashboard HTML.
14. Preserve existing lifecycle artifacts, memory files, meter history, grove patterns, recall indexes, findings, audit logs, and persona mappings.
15. Write `.cocoplus/migration/v2-migration-report.md` with exact changes made.

## Migration Testing

After applying file changes, run these checks before cleanup:

1. Parse JSON files that should remain valid:
   - `.cocoplus/lifecycle/meta.json`
   - `.cocoplus/flow.json`
   - `.cocoplus/personas.json`
   - `.cocoplus/personas/dynamic-registry.json`
   - `.cocoplus/subagents.json` if present
2. Verify required directories and files exist.
3. Verify `cocoplus.toml` contains all required sections without duplicate section headers.
4. Verify `.cocoplus/AGENTS.md` contains current operating-mode blocks.
5. Verify CocoSession files exist and `CONTEXT.md` contains predicate-style `CLASS.key=value` lines.
6. Verify proposal, evidence, iteration budget, cost-budget, status, routine registry, and coach queue paths exist and parse where JSON is expected.
7. Run `$pod status` if available; otherwise record that runtime validation is pending until Coco reloads the plugin.
8. Run `$governance status` if available; otherwise verify the governance config sections and log path exist.

Record every command/check and result in `.cocoplus/migration/v2-migration-report.md`.

## Migration Validation

The migration is valid only when:

- The dry-run action list is empty or all listed actions are marked applied.
- No required current directory or state file is missing.
- No migrated JSON file fails parsing.
- No legacy `safety-config.json` remains active when `cocoplus.toml` is present.
- No active mode was enabled by the migration itself.
- No kill-switch or steering file was created by migration.
- `git diff -- .cocoplus/` shows only migration-related changes.
- The migration report includes version inference, applied changes, test results, cleanup actions, and residual risks.

If validation fails, stop before cleanup and leave the report with remediation steps.

## Post-Migration Cleanup

Only after validation passes:

1. Archive legacy config files to `.cocoplus/migration/archive/`:
   - `safety-config.json`
   - old generated monitor/config files that are superseded by `cocoplus.toml`
2. Remove empty legacy scratch directories only when they contain no user-authored files.
3. Leave historical lifecycle, audit, memory, meter, recall, trace, findings, and grove artifacts in place.
4. Append a cleanup summary to `.cocoplus/migration/v2-migration-report.md`.
5. Commit the migration:

```text
git add .cocoplus/
git commit -m "chore(cocoplus): migrate project to v2"
```

## Safety Rules

- Archive legacy configuration artifacts; do not silently delete them.
- Do not modify source code outside `.cocoplus/` during project migration.
- Do not enable CocoPilot, CocoForge, or Leviathan automatically; migration creates capability state, not active mode flags.
- If a file contains user edits, append missing sections rather than replacing the file.
- If version inference is uncertain, migrate conservatively and keep all historical artifacts.

## Exit Criteria

- [ ] Dry run reports all pending actions without writing.
- [ ] Apply mode creates required current directories and files.
- [ ] 1.x config is converted or supplemented without overwriting user values.
- [ ] Testing checks are recorded in the migration report.
- [ ] Migration validation passes before cleanup.
- [ ] Post-migration cleanup archives legacy config rather than deleting history.
- [ ] Migration report is written and committed.
