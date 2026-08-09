---
name: "stall-reset"
description: "Reset CocoStall counters after an operator-approved recovery."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocostall
---

Your objective is to implement `$stall reset [--run-id <id>] [--reason "<text>"]`.

Reset stall counters only after recording the recovery reason, timestamp, and operator-visible state transition. Do not delete stall history; append a reset event.
