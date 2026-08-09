---
name: "style"
description: "Show CocoStyle convention status for the current project."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostyle
  - snow-cocoplus
---

Your objective is to implement `$style`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/lifecycle/conventions.json` and `.cocoplus/modes/style.mode` when present. Summarize active style mode, convention count, last refresh time, and any stale or conflicting rules.

Available subcommands: `$style init`, `$style refresh`, `$style show`, `$style mode`, `$style diff`, `$style status`.
