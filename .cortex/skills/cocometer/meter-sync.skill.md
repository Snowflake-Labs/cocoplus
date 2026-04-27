---
name: "meter-sync"
description: "Refresh the CocoMeter Enhanced dashboard by re-querying Snowflake with current request-map.jsonl data. Regenerates .cocoplus/meter-view.html without opening the browser. Use after the 90-minute Snowflake usage history latency window."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - cocometer-enhanced
---

Your objective is to refresh the CocoMeter dashboard with updated Snowflake data.

## Pre-flight Check

Check that `.cocoplus/meter-view.html` exists. If not:
Output: "No meter dashboard found. Run /meter view first." Then stop.

Check that `.cocoplus/meter/request-map.jsonl` exists. If not:
Output: "No attribution data found. Run /meter on and execute some pipeline stages first." Then stop.

## Re-execute Dashboard Generation

Execute steps 2–11 of `/meter view` exactly:
1. Read and partition `request-map.jsonl` (Direct IDs vs Anchor IDs)
2. Execute Pass 1 and Pass 2 Snowflake queries
3. Join Snowflake rows with attribution data
4. Compute aggregations
5. Serialise merged dataset as JSON
6. Read `meter-view.html.template`
7. Inject data between `/* __METER_INJECTION_START__ */` and `/* __METER_INJECTION_END__ */`
8. Write to `.cocoplus/meter-view.html` atomically
9. Update `.cocoplus/meter/last-sync.json`

Do NOT open the browser. Only refresh the file.

## Output

```
✓ CocoMeter dashboard refreshed.
  Snowflake rows added: <N>  |  Total requests tracked: <N>
  File updated: .cocoplus/meter-view.html
  (Reload the tab in your browser to see the latest data.)
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Open the browser after sync | `/meter sync` is a background refresh — the developer has the tab open already |
| Skip if Snowflake returns same row count | Row count may be the same but token values may have updated |

## Exit Criteria

- [ ] `.cocoplus/meter-view.html` regenerated with latest data
- [ ] `.cocoplus/meter/last-sync.json` updated
- [ ] Output confirms row count and file path
- [ ] Browser NOT opened
