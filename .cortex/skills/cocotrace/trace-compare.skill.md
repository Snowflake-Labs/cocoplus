---
name: "trace-compare"
description: "Compare CocoTrace asset health snapshots. Usage: $trace compare <before.json> <after.json>"
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocotrace, health, thermal-receipt]
user-invocable: true
---

# CocoTrace Compare

Use this skill for `$trace compare <before.json> <after.json>`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Run:

```text
node scripts/health-grader.js --compare <before.json> <after.json>
```

Display the thermal receipt exactly as a before/after delta, for example:

```text
blast radius 23 -> 18 v / health B+ -> A- ^
```
