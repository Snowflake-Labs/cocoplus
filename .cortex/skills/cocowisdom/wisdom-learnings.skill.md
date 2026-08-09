---
name: "wisdom-learnings"
description: "List explicit CocoWisdom learning and rejection records."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocowisdom
---

Your objective is to implement `$wisdom learnings [--filter <text>]`.

Read `.cocoplus/wisdom/learnings.md` and `.cocoplus/wisdom/do-not-use.md`, then display a filtered list with date, category, summary, and source session. Negative records must remain clearly marked as do-not-use guidance.

Exit when the operator has a concise list of matching learning records or a clear "No matching learnings found" message.
