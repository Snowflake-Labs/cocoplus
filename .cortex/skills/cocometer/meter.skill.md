---
name: "meter"
description: "Show CocoMeter report for the current session: tools called, SQL statements executed, writes performed, estimated token consumption, and estimated Snowflake credit usage."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
---

Your objective is to display the current session CocoMeter report.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Read `.cocoplus/meter/current-session.json`. If it does not exist:
Output: "No active meter session. CocoMeter tracking starts automatically when a session begins with CocoMeter enabled. Run `/meter on` to enable and start a new session." Then stop.

Output a formatted report:

```
# CocoMeter — Current Session

Session ID: [session_id]
Started: [started_at]
Phase: [phase]

## Tool Usage
Tools Called: [tools_called]
SQL Statements: [sql_statements]
File Writes: [writes_performed]

## Token Estimate
Estimated tokens consumed: [tokens_consumed]
(Note: exact counts require Coco's native token reporting)

## Snowflake Credit Estimate
SQL operations × 0.00001 credits/statement = [estimate] credits
(rough estimate — actual credits depend on compute size and query complexity)
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show zeros for all fields if current-session.json exists but has no data | Zero-filled output looks like a bug; always explain that tracking starts accumulating on next tool use |

## Exit Criteria

- [ ] Report shows Session ID, Started timestamp, and Phase from current-session.json
- [ ] Tool Usage section shows tools called, SQL statements, and file writes
- [ ] Token Estimate and Snowflake Credit Estimate sections are shown with appropriate caveats
