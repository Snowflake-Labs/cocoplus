---
name: "flow-template"
description: "Manage CocoFlow 2.0 execution plan templates under .cocoplus/flows/templates."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
  - flow-template
---

Your objective is to manage reusable CocoFlow execution plan templates.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Templates live under `.cocoplus/flows/templates/`. They capture the orchestration pass output for a successful flow run: strategic assessment summary, dependency graph, dependency groups, model tier assignments, per-step context briefs, expected outputs, validation commands, and measured planning/execution cost split.

## Commands

### `$flow template list`

1. Read every `*.json` file in `.cocoplus/flows/templates/`.
2. Display: name, source session, archetype, saved_at, last_used_at, reuse_count, and estimated planning bypass savings.
3. If no templates exist, output: "No execution plan templates saved. Run `$flow template save --from <session-id> --name <name>` after a successful flow run."

### `$flow template save --from <session-id> --name <name>`

1. Locate the completed orchestration artifact for `<session-id>` in `.cocoplus/flows/runs/` or `.cocoplus/harvest/`.
2. Verify it contains:
   - `dependency_graph`
   - `dependency_groups`
   - `tier_assignments`
   - `context_briefs`
   - `expected_outputs`
3. Refuse to save if any per-step `context_briefs[*].text` exceeds 200 words.
4. Write `.cocoplus/flows/templates/<name>-plan.json` atomically.
5. Append a `FLOW_TEMPLATE_SAVED` entry to `.cocoplus/meter/template-benchmarks.jsonl` if meter state exists.

### `$flow template validate <name>`

1. Load `.cocoplus/flows/templates/<name>-plan.json`.
2. Compare template steps with current `.cocoplus/flow.json`.
3. Validate referenced Snowflake objects against available trace/context artifacts when present.
4. Report PASS, WARN, or FAIL with named incompatibilities. A FAIL means `$flow run` must use a fresh orchestration pass.

### `$flow template show <name>`

Display strategic fit, dependency groups, model tier assignments, and context brief shapes. Do not print full historical worker context unless explicitly requested.

### `$flow template delete <name>`

Archive to `.cocoplus/flows/templates/archive/<timestamp>-<name>-plan.json` rather than deleting.

## V2 Integration

At the beginning of `$flow run`, attempt template matching. If a validated template matches the current `flow.json` shape and context slots, skip the strategic assessment and orchestration pass and dispatch from the template. Otherwise, run fresh orchestration and offer to save the resulting plan after completion.

## Exit Criteria

- [ ] `list` reports all saved templates and handles the empty state.
- [ ] `save` refuses incomplete orchestration artifacts and context briefs over 200 words.
- [ ] `validate` names each incompatibility.
- [ ] `show` previews template shape without flooding worker context.
- [ ] `delete` archives rather than removes.
