---
name: "stall"
description: "Show CocoStall loop and no-progress detection status."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostall
  - snow-cocoplus
---

Your objective is to implement `$stall`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/stall/state.json` and `.cocoplus/stall/thresholds.json` when present. Summarize current stall risk, repeated failure signatures, latest no-progress loop, and recommended recovery action.

Available subcommands: `$stall status`, `$stall thresholds`, `$stall reset`.
