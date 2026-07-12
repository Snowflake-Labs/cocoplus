---
name: "meter-chargeback"
description: "CocoMeter chargeback and FinOps governance. Usage: $meter chargeback refresh | $meter chargeback invoice | $meter chargeback onboarding"
version: "1.2.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - chargeback
  - finops
user-invocable: true
---

# CocoMeter Chargeback

Use this skill for `$meter chargeback refresh`, `$meter chargeback invoice`, and `$meter chargeback onboarding`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

## Source Rules

CocoMeter chargeback reads token/inference usage from Snowflake's Cortex Code usage history surfaces and, when enabled, warehouse compute from query attribution history. Treat the chargeback fact table as governance evidence, not a cosmetic dashboard:

- Token credits come from the Cortex Code CLI, Desktop, and Snowsight usage history surfaces.
- Warehouse credits join through `query_tag.app` and `QUERY_ATTRIBUTION_HISTORY.CREDITS_ATTRIBUTED_COMPUTE`.
- `includeWarehouse` in `cocoplus.toml` controls whether warehouse credits are included.
- `SNOWFLAKE.LOCAL.AI_OBSERVABILITY_EVENTS` `CodingAgent.Step-0` spans are used for near-real-time observability when present.
- Exclude `SYSTEM`, sandbox runs, and background metadata-query traffic.

## `$meter chargeback refresh`

Run a 35-day trailing delete/insert refresh. On first setup, load 60 days. Schedule the Snowflake task for 06:00 UTC daily.

For local validation or dry-run fixtures, use:

```text
node scripts/chargeback-refresh.js --input <fixture.json>
```

The helper applies the same deterministic rules used by the warehouse implementation:

- Strip `<system-reminder>...</system-reminder>` blocks before prompt persistence.
- Extract SQL from tool argument arrays.
- Resolve cost centers in this order: explicit user map, user object tag, role map, `UNMAPPED`.
- Produce invoice-ready per-user totals.

## `$meter chargeback invoice`

Generate one HTML and one CSV invoice package per user from the refreshed chargeback facts. Each invoice must include token credits, warehouse credits when included, total credits, credit-rate amount, cost center, and unmapped status.

## `$meter chargeback onboarding`

Report setup readiness:

- `schemaReady`
- `factHasData`
- `costCentersMapped`
- `unmappedUsers`
- `spansPresent`

Block any "chargeback ready" claim until the checklist is green or the remaining gaps are explicitly listed.

## Anti-Rationalization

| Shortcut | Why It Fails |
|----------|--------------|
| Bill every warehouse query by user only | Query attribution must be tied back through Coco usage context; otherwise unrelated Snowflake work is charged to CocoPlus |
| Keep system reminders in prompts | System reminders are infrastructure text, not billable user intent |
| Auto-map unknown users | `UNMAPPED` is deliberate governance signal, not an error to hide |
| Ignore missing spans | Chargeback can still run, but near-real-time observability is not ready |

## Exit Criteria

- [ ] Refresh excludes SYSTEM, sandbox, and background metadata records
- [ ] Cost center resolution uses all four levels
- [ ] Invoice output includes token and optional warehouse credits
- [ ] Onboarding checklist reports unmapped users and span presence
