---
name: "cocowatch"
description: "Developer engagement observer — non-blocking, always-on observational layer that tracks Delegation Intensity, Review Depth, and Engagement Zone throughout a session. Summary surfaced at $ship and FULL checkpoints."
blocking: false
user-invocable: false
version: "1.0.3"
author: "CocoPlus"
tags:
  - cocoplus
  - engagement-observer
---

This file is the canonical loader path for CocoWatch. Its behavioral contract is maintained in `cocowatch.skill.md` in the same directory.

Load `cocowatch.skill.md` and follow it exactly. The `blocking: false` and `user-invocable: false` frontmatter here are structural guarantees for loaders that expect a conventional `SKILL.md` entry point.

