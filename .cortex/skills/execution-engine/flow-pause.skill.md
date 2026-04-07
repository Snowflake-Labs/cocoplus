---
name: "flow-pause"
description: "Pause the running CocoFlow pipeline. Sets a pause flag that stops new stages from starting. Running stages complete their current action before stopping."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
---

Your objective is to pause the CocoFlow pipeline.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

Create flag file `.cocoplus/flow.pause` with content:
```
paused_at: [ISO 8601 timestamp]
reason: developer_requested
```

Output: "Pipeline paused. Currently running stages will complete their current action before stopping. Run `/flow resume` to continue."
