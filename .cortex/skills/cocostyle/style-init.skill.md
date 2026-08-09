---
name: "style-init"
description: "Initialize CocoStyle project convention capture."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostyle
---

Your objective is to implement `$style init`.

Create `.cocoplus/lifecycle/conventions.json` when missing. Seed it with schema version, created timestamp, source list, mode, and an empty conventions array. Do not infer rules from large files unless the operator also requested `$style refresh`.

Exit with the convention file path and next recommended command.
