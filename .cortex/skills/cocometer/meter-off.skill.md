---
name: "meter-off"
description: "Disable CocoMeter token tracking. Finalizes the current session record and appends to history. Does not delete history — just stops active tracking."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - tracking
---

Your objective is to disable CocoMeter token tracking.

## Pre-flight Check

Check that `.cocoplus/` directory exists. If not, output:
"CocoPlus not initialized in this directory. Run `/pod init` to begin."
Then stop.

## Check Current State

Check if `.cocoplus/meter/current-session.json` exists with `"metering_active": true`.

If metering is NOT active, output:
"CocoMeter is not currently active. Use `/meter on` to enable tracking."
Then stop.

## Finalize Session

1. Read `.cocoplus/meter/current-session.json`.

2. Update the record:
   - Set `"metering_active": false`
   - Set `"ended_at": "<ISO 8601 timestamp>"`
   - Compute `"duration_minutes"` from started_at to now

3. Append the finalized record to `.cocoplus/meter/history.jsonl` (one JSON object per line).

4. Reset `.cocoplus/meter/current-session.json` to inactive state:
```json
{
  "session_id": null,
  "metering_active": false,
  "input_tokens": 0,
  "output_tokens": 0,
  "tool_calls": 0
}
```

## Confirm Deactivation

Output session summary:
```
CocoMeter disabled.

Session Summary:
- Duration: <X> minutes
- Input tokens: <n>
- Output tokens: <n>
- Tool calls: <n>
- Top models: <model: count>

Session saved to .cocoplus/meter/history.jsonl
Use `/meter history` to review past sessions.
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip appending to history.jsonl and just reset current-session.json | The session record is lost forever if not appended to history before reset — there is no recovery path |
| Mark `metering_active: false` without computing duration | Duration is part of the history record; a missing duration makes the history row incomplete and the totals wrong |

## Exit Criteria

- [ ] `.cocoplus/meter/current-session.json` has `"metering_active": false` and `session_id: null`
- [ ] The finalized session record (with `ended_at` and `duration_minutes`) has been appended to `.cocoplus/meter/history.jsonl`
- [ ] Output shows the session summary with duration, tokens, and tool call counts
