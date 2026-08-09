---
name: "wisdom-learn"
description: "Record a curated CocoWisdom learning with optional session and rationale metadata."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocowisdom
---

Your objective is to implement `$wisdom learn "<text>" [--session <session-id>] [--reason <text>]`.

Append the learning to `.cocoplus/wisdom/learnings.md` with Date, Learning text, Reason, Source session, and whether it is positive guidance or should be routed to `$wisdom reject`.

If the learning describes a rejected approach, route to `wisdom-reject` instead of writing positive guidance.

Exit after writing and committing the learning artifact.
