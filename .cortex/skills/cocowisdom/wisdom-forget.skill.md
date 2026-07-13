---
name: "wisdom-forget"
description: "Remove a must-keep CocoWisdom entry with rationale. Usage: $wisdom forget --id <id> --rationale \"<reason>\""
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocowisdom, memory, forget]
user-invocable: true
---

# CocoWisdom Forget

Use this skill for `$wisdom forget --id <id> --rationale "<reason>"`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Run:

```text
node scripts/wisdom-route.js --forget --id <id> --rationale "<reason>"
```

Forgetting without a rationale is rejected. The rationale is appended to `.cocoplus/wisdom/consolidation-log.md`.
