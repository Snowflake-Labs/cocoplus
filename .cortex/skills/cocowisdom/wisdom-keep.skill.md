---
name: "wisdom-keep"
description: "Protect a CocoWisdom entry from consolidation. Usage: $wisdom keep --id <id> --text \"<rule>\""
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocowisdom, memory, must-keep]
user-invocable: true
---

# CocoWisdom Keep

Use this skill for `$wisdom keep --id <id> --text "<rule>"`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Run:

```text
node scripts/wisdom-route.js --keep --id <id> --text "<rule>"
```

The command appends a protected entry to `.cocoplus/wisdom/must-keep.md`. Must-keep entries are exempt from automatic consolidation.
