---
name: "wisdom-consolidation-log"
description: "View CocoWisdom consolidation exceptions. Usage: $wisdom consolidation-log"
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocowisdom, memory, consolidation]
user-invocable: true
---

# CocoWisdom Consolidation Log

Use this skill for `$wisdom consolidation-log`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Read `.cocoplus/wisdom/consolidation-log.md` and display entries in reverse chronological order. If the file does not exist, output: "No CocoWisdom consolidation exceptions recorded."
