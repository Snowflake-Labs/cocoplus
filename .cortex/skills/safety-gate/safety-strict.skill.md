---
name: "safety-strict"
description: "Set Safety Gate to strict mode. In strict mode, all destructive SQL operations (DROP, TRUNCATE, DELETE without WHERE) are BLOCKED and cannot be executed. Use for production environments."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - safety-gate
---

Your objective is to set the Safety Gate to strict mode.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

Remove any existing safety mode flags:
```
rm -f .cocoplus/modes/safety.normal .cocoplus/modes/safety.off
```

Create strict mode flag:
```
touch .cocoplus/modes/safety.strict
```

Update AGENTS.md (keep ≤200 lines): replace Safety line with `- Safety: strict (BLOCK destructive SQL)`

Output: "✓ Safety Gate set to STRICT. Destructive SQL operations (DROP TABLE, TRUNCATE, DELETE without WHERE, ALTER TABLE DROP COLUMN) are now BLOCKED. This setting persists across sessions."
