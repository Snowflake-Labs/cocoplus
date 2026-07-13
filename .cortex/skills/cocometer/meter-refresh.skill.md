---
name: "meter-refresh"
description: "Refresh CocoMeter chargeback facts. Usage: $meter refresh"
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocometer, chargeback, refresh]
user-invocable: true
---

# CocoMeter Refresh

Use this skill for `$meter refresh`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Run the 35-day trailing chargeback refresh. The warehouse implementation must delete and reinsert the trailing window idempotently, exclude SYSTEM/sandbox/background metadata records, strip system reminders, extract SQL from tool argument arrays, and resolve cost centers through explicit user map, user tag, role map, then `UNMAPPED`.

For local fixture validation, run:

```text
node scripts/chargeback-refresh.js --input <fixture.json>
```
