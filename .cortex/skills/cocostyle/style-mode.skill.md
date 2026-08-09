---
name: "style-mode"
description: "Set or display CocoStyle enforcement mode."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostyle
---

Your objective is to implement `$style mode [observe|suggest|enforce]`.

Read or write `.cocoplus/modes/style.mode`. `observe` records drift without advising, `suggest` reports convention mismatches, and `enforce` blocks final completion claims when required conventions are violated.

Report the previous mode, new mode, and effective scope.
