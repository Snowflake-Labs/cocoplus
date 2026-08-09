---
name: "diary"
description: "Show CocoDiary operator-facing work journal status."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocodiary
  - snow-cocoplus
---

Your objective is to implement `$diary`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/diary/` entries. Summarize entry count, latest entry, open decisions, and recent handoff notes.

Available subcommands: `$diary view`, `$diary list`, `$diary search`.
