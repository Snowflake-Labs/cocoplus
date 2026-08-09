---
name: "adversary"
description: "Show CocoAdversary reviewer configuration and latest challenge results."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoadversary
  - snow-cocoplus
---

Your objective is to implement `$adversary`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/modes/adversary.on`, `.cocoplus/adversary/config.json`, and recent adversary reports. Summarize enabled state, configured challenge depth, latest high-severity finding, and known gaps.

Available subcommands: `$adversary enable`, `$adversary disable`, `$adversary run`, `$adversary show`, `$adversary audit`, `$adversary gap`.
