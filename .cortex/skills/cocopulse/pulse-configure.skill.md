---
name: "pulse-configure"
description: "Configure CocoPulse observation intervals and scopes."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopulse
---

Your objective is to implement `$pulse configure [--interval <duration>] [--watch <path>]`.

Update `.cocoplus/pulse/config.json` with interval, watched paths, stale thresholds, and reporting mode. Reject configurations that would weaken active safety gates or bypass lifecycle evidence requirements.
