---
name: "adversary-enable"
description: "Enable CocoAdversary challenge review mode."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoadversary
---

Your objective is to implement `$adversary enable [--scope <scope>]`.

Create `.cocoplus/modes/adversary.on` and initialize configuration. Adversary reviewers are read-only critics by default and must not mutate source files or approve gates.
