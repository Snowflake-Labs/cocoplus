---
name: "safety-normal"
description: "Set Safety Gate to normal mode. In normal mode, destructive SQL operations trigger a soft-gate confirmation prompt before execution. Recommended for development environments."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - safety-gate
---

Your objective is to set the Safety Gate to normal mode.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

Remove any existing safety mode flags:
```
rm -f .cocoplus/modes/safety.strict .cocoplus/modes/safety.off
```

Create normal mode flag:
```
touch .cocoplus/modes/safety.normal
```

Update AGENTS.md (keep ≤200 lines): replace Safety line with `- Safety: normal (WARN + confirm for destructive SQL)`

Output: "✓ Safety Gate set to NORMAL. Destructive SQL operations will require explicit confirmation before execution. This setting persists across sessions."
