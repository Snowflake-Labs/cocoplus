---
name: "trace-health"
description: "Compute CocoTrace Snowflake asset health grade. Usage: $trace health"
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocotrace, health, governance]
user-invocable: true
---

# CocoTrace Health

Use this skill for `$trace health`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Run:

```text
node scripts/health-grader.js --input .cocoplus/trace/snowflake-assets.json
```

Report the A-F health grade unless `[trace].show_grade = false` in `cocoplus.toml`. Always show the component metrics: dead assets, circular dependencies, coupling, security findings, layer violations, and churn hotspots.
