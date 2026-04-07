---
name: "safety-off"
description: "Disable the Safety Gate. All SQL operations proceed without interception. Use only in development environments where all data is non-production. Not recommended."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - safety-gate
---

Your objective is to disable the Safety Gate.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

Warn the developer:
"WARNING: Disabling the Safety Gate allows all SQL operations — including DROP TABLE, TRUNCATE, and DELETE without WHERE — to execute without any interception. Only do this if you are certain you are working in a non-production environment with no real data. Continue? (yes/no)"

If no: restore safety.normal and output "Safety Gate left at normal mode." Then stop.

Remove any existing safety mode flags:
```
rm -f .cocoplus/modes/safety.strict .cocoplus/modes/safety.normal
```

Create off flag:
```
touch .cocoplus/modes/safety.off
```

Update AGENTS.md: replace Safety line with `- Safety: OFF (no protection — all SQL allowed)`

Output: "⚠ Safety Gate disabled. No SQL operations will be intercepted. Run `/safety normal` or `/safety strict` to re-enable protection."
