---
name: "pilot-on"
description: "Activate CocoPilot mode for the current CocoPlus session."
version: "2.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopilot
  - v2
---

Your objective is to activate CocoPilot for the current session.

## Behavior

1. Verify `.cocoplus/` exists.
2. Create `.cocoplus/modes/cocopilot.on`.
3. Create or update `.cocoplus/lifecycle/pilot-session.json`:
   - `active: true`
   - `activated_at`
   - `session_id`
   - empty arrays for `suggestions`, `routed_inputs`, and `silent_actions` when absent
4. Check the first-run configuration gate:
   - If `.cocoplus/lifecycle/cocoplus-init.json` is absent or has `confirmed: false`, surface the five key settings before any dispatch: default warehouse, cost ceiling per run, production schema prefix, development schema prefix, and notification target.
   - Confirmed changes belong in `cocoplus.toml`; the confirmation receipt belongs in `.cocoplus/lifecycle/cocoplus-init.json`.
   - The gate is reset by `$cocoplus reset-init`.
5. Read `[cocopilot] premortem_enabled` and `premortem_warn_on_absent`.
   - For any stage with `premortem: true`, `allow_irreversible_actions: true`, or `require_outcome_verification: true`, prepare a pre-dispatch pre-mortem before routing work.
   - Record three likely failure scenarios, prevention status, and any operator acknowledgment in `PROGRESS.md` before dispatch.
6. Read `.cocoplus/wisdom/SCHEMA.md` when present.
   - If `[wisdom].stage_mappings_enabled` is not false and a `## Stage Mappings` table matches the stage role, preload only the mapped positive wisdom topics.
   - Always load `.cocoplus/wisdom/do-not-use.md` when it exists.
   - For Snowflake task patterns, prefer the static Cortex MCP routing table over ad hoc capability guessing:
     - schema validation: `OBJECT_DEPENDENCIES`
     - SQL performance: `QUERY_HISTORY`
     - data quality: `COLUMN_USAGE_VIEWS`
     - governance review: policy, tag, masking, and role metadata views
7. Output exactly:
   `CocoPilot active. I'll take it from here.`

## Permission Boundary

CocoPilot may route, suggest, and perform reversible silent capture. It may not perform irreversible actions, bypass underlying feature approval gates, or override explicit developer instructions.

## Exit Criteria

- [ ] `.cocoplus/modes/cocopilot.on` exists.
- [ ] `.cocoplus/lifecycle/pilot-session.json` has `active: true`.
- [ ] First-run configuration is confirmed in `lifecycle/cocoplus-init.json` before first dispatch.
- [ ] Pre-mortem stages record `premortem_enabled` behavior and acknowledgments before execution.
- [ ] Stage-mapped wisdom loads only the routed positive topics, while `do-not-use.md` remains universal.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |
