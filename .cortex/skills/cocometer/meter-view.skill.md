---
name: "meter-view"
description: "Generate the CocoMeter Enhanced HTML dashboard. Queries SNOWFLAKE.ACCOUNT_USAGE.CORTEX_CODE_CLI_USAGE_HISTORY, joins with local request-map.jsonl attribution data, injects into meter-view.html.template, and opens in browser."
<<<<<<< HEAD
version: "1.0.1"
=======
version: "2.0.0"
>>>>>>> feature/cocoplus-v2.0.0
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - cocometer-enhanced
---

Your objective is to generate and open the CocoMeter token attribution dashboard.

<<<<<<< HEAD
=======
## CocoPlus 2.0 Console-Aware Redirect

Before generating standalone HTML, check `.cocoplus/lifecycle/console-state.json`.

If the file exists and contains `running: true` with a `port` value:
1. Output: `Opening Cost panel in CocoConsole.`
2. Open `http://localhost:<port>/cost` in the browser.
3. Stop. Do not generate a standalone snapshot.

If CocoConsole is not running, continue with the standalone CocoMeter dashboard behavior below.

>>>>>>> feature/cocoplus-v2.0.0
## Pre-flight Check

Check that `.cocoplus/` exists. If not:
Output: "CocoPlus not initialized. Run $pod init to begin." Then stop.

## Read Attribution Data

Read `.cocoplus/meter/request-map.jsonl`. If the file is missing or empty, continue — the dashboard must still render with local-only data and zero Snowflake rows. Use an injected payload shaped like:

```json
{
  "local_only": true,
  "rows": [],
  "stages": [],
  "warning": "No local CocoMeter request-map entries were found yet."
}
```

Partition entries into two sets:
- **Direct IDs:** entries where `is_subagent_anchor` is absent or false
- **Anchor IDs:** entries where `is_subagent_anchor` is true

## Query Snowflake Usage History

If any Direct IDs exist, execute Pass 1:
```sql
SELECT REQUEST_ID, PARENT_REQUEST_ID, USAGE_TIME, TOKENS, TOKEN_CREDITS,
       TOKENS_GRANULAR, CREDITS_GRANULAR
FROM SNOWFLAKE.ACCOUNT_USAGE.CORTEX_CODE_CLI_USAGE_HISTORY
WHERE REQUEST_ID IN (<direct_ids>)
   OR PARENT_REQUEST_ID IN (<direct_ids>)
ORDER BY USAGE_TIME ASC;
```

If Anchor IDs also exist, execute Pass 2:
```sql
SELECT REQUEST_ID, PARENT_REQUEST_ID, USAGE_TIME, TOKENS, TOKEN_CREDITS,
       TOKENS_GRANULAR, CREDITS_GRANULAR
FROM SNOWFLAKE.ACCOUNT_USAGE.CORTEX_CODE_CLI_USAGE_HISTORY
WHERE PARENT_REQUEST_ID IN (<anchor_ids>)
  AND REQUEST_ID NOT IN (<pass_1_request_ids>)
ORDER BY USAGE_TIME ASC;
```

Union Pass 1 and Pass 2 results. If either query fails (permission denied, connection error), log the error and continue with whatever was retrieved — do not abort.

## Join and Aggregate

Join Snowflake rows with `request-map.jsonl`:
- Direct rows: match on `REQUEST_ID`
- Pass-2 rows: resolve `stage_id` by matching `PARENT_REQUEST_ID` to anchor records in `request-map.jsonl`
- Unmatched rows: `stage_id = "unattributed"`

Compute summary aggregations:
- Total tokens, total credits
- Cache efficiency %: `cache_read_input / (input + cache_read_input + cache_write_input) * 100`
- Total output tokens
- Per-stage and per-model breakdowns

Serialise the merged dataset as JSON.

## Locate the HTML Template

Locate `templates/meter-view.html.template` relative to the installed CocoPlus plugin root. Do not hard-code an OS-specific plugin directory.

Read the template. If missing:
Output: "CocoMeter template not found in the CocoPlus plugin templates directory. Re-install or update the CocoPlus plugin." Then stop.

## Inject Meter Data

Find the injection block:
- Start: `/* __METER_INJECTION_START__ */`
- End: `/* __METER_INJECTION_END__ */`

Replace with:
```js
const INJECTED_METER_DATA = <serialised_json>;
```

## Write and Open

Write the injected HTML to `.cocoplus/meter-view.html` atomically (write to `.tmp`, then rename).

Write sync metadata: `.cocoplus/meter/last-sync.json`:
```json
{ "last_sync": "<ISO timestamp>", "row_count": <n> }
```

Open `.cocoplus/meter-view.html`:
- macOS: `open .cocoplus/meter-view.html`
- Linux: `xdg-open .cocoplus/meter-view.html`
- Windows: `powershell -Command "Invoke-Item '.cocoplus/meter-view.html'"`

## Output

With Snowflake data:
```
✓ CocoMeter dashboard generated.
  Stages: <N>  |  Requests: <N>  |  Snowflake rows: <N>
  Total tokens: <N>  |  Cache efficiency: <N>%
  Opening: .cocoplus/meter-view.html
```

If Snowflake returned no rows:
```
⚠ No usage data from Snowflake yet.
  CORTEX_CODE_CLI_USAGE_HISTORY has up to 90-minute latency.
  Dashboard generated with local attribution data only.
  Run $meter sync after ~90 minutes to refresh.
  Opening: .cocoplus/meter-view.html
```

If browser open failed:
```
✓ CocoMeter dashboard generated.
  Could not open browser automatically.
  Open this file manually: .cocoplus/meter-view.html
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Abort if Snowflake query fails | Partial data is still valuable; the dashboard renders in local-only mode gracefully |
| Abort because request-map.jsonl is missing | A new project still needs a usable dashboard shell; render a local-only empty dashboard |
| Skip atomic write for meter-view.html | A mid-write crash would leave a corrupt file that the browser opens as blank |
| Skip last-sync.json update | `$meter sync` uses this to show when data was last refreshed |

## Exit Criteria

- [ ] `.cocoplus/meter-view.html` written with `INJECTED_METER_DATA` containing merged Snowflake + local data
- [ ] `.cocoplus/meter/last-sync.json` updated with current timestamp and row count
- [ ] Output reports stage count, request count, total tokens, and cache efficiency
- [ ] No git commit created (dashboard is ephemeral, gitignored)
