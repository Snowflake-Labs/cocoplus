---
name: "pilot-on"
description: "Activate CocoPilot mode for the current CocoPlus session."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopilot
  - v2
---

Your objective is to activate CocoPilot for the current session.

## Behavior

1. Verify `.cocoplus/` exists.
2. Create `.cocoplus/modes/cocopilot.on`.
3. Create or update `.cocoplus/lifecycle/pilot-session.json`:
   - `active: true`
   - `activated_at`
   - `session_id`
   - empty arrays for `suggestions`, `routed_inputs`, and `silent_actions` when absent
4. Output exactly:
   `CocoPilot active. I'll take it from here.`

## Permission Boundary

CocoPilot may route, suggest, and perform reversible silent capture. It may not perform irreversible actions, bypass underlying feature approval gates, or override explicit developer instructions.

## Exit Criteria

- [ ] `.cocoplus/modes/cocopilot.on` exists.
- [ ] `.cocoplus/lifecycle/pilot-session.json` has `active: true`.

