---
name: "adversary-run"
description: "Run CocoAdversary challenge review against a target."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoadversary
---

Your objective is to implement `$adversary run [--target <path|stage|plan>] [--security] [--complexity]`.

Run a read-only challenge pass that looks for incorrect assumptions, weak evidence, hidden dependencies, security risk, complexity debt, and lifecycle gate bypass. Write the report under `.cocoplus/adversary/reports/`.
