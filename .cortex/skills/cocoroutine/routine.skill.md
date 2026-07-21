---
name: "routine"
description: "Manage CocoRoutine Snowflake task scheduling. Usage: $routine list, $routine schedule <flow> --cadence <cron|daily|weekly>, $routine disable <name>, $routine delete <name>."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoroutine
  - snowflake
---

Use this skill for `$routine` commands.

## Guardrails

- CocoRoutine is opt-in. Read `cocoplus.toml [routine]` before scheduling.
- If `[routine] enabled = false`, report that routines are disabled and stop.
- If `[routine] allow_snowflake_tasks = false`, list/status operations are allowed, but scheduling must stop before generating or executing TASK SQL.
- Routines must not reference local filesystem paths, local MCPs, local environment variables, or developer-specific state.
- CocoPilot may offer scheduling after a successful flow, but it must never auto-schedule.
- Any TASK creation, alteration, or deletion still runs through Safety Gate, RBAC escalation guard, retained proposal rules, and normal Snowflake confirmation behavior.

## State

Routines are tracked locally in `.cocoplus/routines/registry.json`:

```json
{
  "version": 1,
  "routines": [
    {
      "name": "daily_health_check",
      "flow_id": "flow-health",
      "cadence": "daily",
      "snowflake_task": "COCOPLUS_DAILY_HEALTH_CHECK",
      "status": "active",
      "last_run": null,
      "next_run": null,
      "created_at": "..."
    }
  ]
}
```

## Commands

### `$routine list`

1. Verify `.cocoplus/` exists.
2. Read `.cocoplus/routines/registry.json`; if absent, show `No scheduled routines.`
3. Display routine name, cadence, status, last run, next run, and Snowflake task name.

### `$routine schedule <flow> --cadence <cadence>`

1. Verify `[routine] enabled = true` and `[routine] allow_snowflake_tasks = true`.
2. Load the completed flow definition and confirm all required inputs are self-contained.
3. Reject flows that reference local paths, local MCPs, local-only credentials, or unsatisfied project-relative files.
4. Generate a Snowflake TASK proposal under `.cocoplus/proposals/routine/<timestamp>/`.
5. If the project uses retained proposals, stop and instruct the developer to settle with `$flow settle`.
6. Otherwise, ask for explicit confirmation before executing TASK SQL.
7. Update `.cocoplus/routines/registry.json` only after the Snowflake operation succeeds.

### `$routine disable <name>`

1. Find the routine in the registry.
2. Generate `ALTER TASK <task> SUSPEND` as a retained proposal unless the developer explicitly confirms live execution.
3. Mark local status `disable_requested` until execution succeeds.

### `$routine delete <name>`

1. Find the routine in the registry.
2. Generate `DROP TASK <task>` as a retained proposal unless the developer explicitly confirms live execution.
3. Archive the registry entry after execution succeeds.

## Console

CocoConsole reads `.cocoplus/routines/registry.json` and displays routines in the Flow panel. The console is read-only; it never disables, deletes, or schedules a routine.

## Exit Criteria

- [ ] Disabled routine configuration is respected.
- [ ] Scheduling rejects local-only flows.
- [ ] TASK SQL is proposed or explicitly confirmed before execution.
- [ ] Registry updates only after successful Snowflake operation.
