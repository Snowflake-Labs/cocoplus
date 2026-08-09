---
name: "style-diff"
description: "Compare current work against CocoStyle conventions."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostyle
---

Your objective is to implement `$style diff [--staged] [--path <path>]`.

Compare changed files against `.cocoplus/lifecycle/conventions.json`. Report convention matches, likely drift, and unresolved conflicts. Use source evidence links when available and avoid rewriting files automatically.
