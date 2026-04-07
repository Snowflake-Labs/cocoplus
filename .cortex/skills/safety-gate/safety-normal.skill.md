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
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

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

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Keep strict/off flags while enabling normal | Mixed flags create unpredictable gate decisions |
| Skip warning semantics in the summary message | Developers may mistake normal mode for full blocking |
| Avoid updating AGENTS.md to save time | Runtime posture becomes opaque to the team |

## Exit Criteria

- [ ] `.cocoplus/modes/safety.normal` exists
- [ ] `.cocoplus/modes/safety.strict` and `.cocoplus/modes/safety.off` do NOT exist
- [ ] `.cocoplus/AGENTS.md` Safety line reads `- Safety: normal (WARN + confirm for destructive SQL)`
- [ ] Confirmation output states normal mode is active with warning + confirmation behavior
