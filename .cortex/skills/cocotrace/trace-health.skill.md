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
invoke cocotrace/health-grader --input .cocoplus/trace/snowflake-assets.json
```

Report the A-F health grade unless `[trace].show_grade = false` in `cocoplus.toml`. Always show the component metrics: dead assets, circular dependencies, coupling, security findings, layer violations, and churn hotspots.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |

## Exit Criteria

- [ ] Command behavior matches the owning feature contract.
- [ ] Required reads, writes, and user-visible outputs are described.
- [ ] Safety, governance, and artifact constraints are preserved.
- [ ] Missing state produces a clear, non-destructive result.
