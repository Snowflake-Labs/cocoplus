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
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Remove any existing safety mode flags (cross-platform using the Bash tool):
```
node -e "['safety.normal','safety.off'].forEach(f=>{try{require('fs').unlinkSync('.cocoplus/modes/'+f)}catch(_){}});console.log('Old flags cleared.');"
```

Create strict mode flag: create the file `.cocoplus/modes/safety.strict` with empty content using the Write tool.

Update AGENTS.md (keep ≤200 lines): replace Safety line with `- Safety: strict (BLOCK destructive SQL)`

Output: "✓ Safety Gate set to STRICT. Destructive SQL operations (DROP TABLE, TRUNCATE, DELETE without WHERE, ALTER TABLE DROP COLUMN) are now BLOCKED. This setting persists across sessions."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Leave existing safety flags in place | Multiple active flags create undefined gate behavior |
| Skip AGENTS.md update | Operators lose visibility into active protection mode |
| Use strict mode without confirming persistence | Developers assume temporary mode and run risky commands later |

## Exit Criteria

- [ ] `.cocoplus/modes/safety.strict` exists
- [ ] `.cocoplus/modes/safety.normal` and `.cocoplus/modes/safety.off` do NOT exist
- [ ] `.cocoplus/AGENTS.md` Safety line reads `- Safety: strict (BLOCK destructive SQL)`
- [ ] Confirmation output states strict mode is active and destructive SQL is blocked
