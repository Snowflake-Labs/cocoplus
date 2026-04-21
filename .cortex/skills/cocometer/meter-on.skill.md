---
name: "meter-on"
description: "Enable CocoMeter token and credit tracking for this session. Creates tracking state in .cocoplus/meter/ and activates per-tool token capture via post-tool-use hook."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - tracking
---

Your objective is to enable CocoMeter token tracking.

## Pre-flight Check

Check that `.cocoplus/` directory exists. If not, output:
"CocoPlus not initialized in this directory. Run `/pod init` to begin."
Then stop.

## Check Current State

Check if `.cocoplus/meter/current-session.json` exists and has `"metering_active": true`.

If metering is already active, output:
"CocoMeter is already active for this session. Use `/meter` to see current usage."
Then stop.

## Enable Metering

1. Create or update `.cocoplus/meter/current-session.json`:
```json
{
  "session_id": "<sess-YYYYMMDD-HHMMSS>",
  "started_at": "<ISO 8601 timestamp>",
  "metering_active": true,
  "input_tokens": 0,
  "output_tokens": 0,
  "tool_calls": 0,
  "model_breakdown": {},
  "actions": []
}
```

2. Ensure `.cocoplus/meter/` directory exists (create if not).

3. Ensure `.cocoplus/meter/history.jsonl` exists (create empty if not).

## Confirm Activation

Output:
```
CocoMeter enabled.

Token tracking is now active for this session.
- Input and output tokens will be captured per tool call
- Use `/meter` to see current usage
- Use `/meter estimate <action>` to get a pre-flight estimate
- Use `/meter history` to see past sessions

Note: Token counts are estimates based on hook-captured data.
Actual Snowflake Cortex billing may differ.
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip checking if metering is already active before enabling | Starting a second session while one is active would reset the current session ID, losing in-progress tracking data |
| Create session JSON without creating the `meter/` directory first | Writing to a non-existent directory fails silently in some shells; always ensure the directory exists |

## Exit Criteria

- [ ] `.cocoplus/meter/current-session.json` exists with `"metering_active": true` and a valid `session_id` in `sess-YYYYMMDD-HHMMSS` format
- [ ] `.cocoplus/meter/history.jsonl` exists (created if absent)
- [ ] Output confirms metering is enabled with usage commands listed
