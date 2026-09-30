---
name: "pilot-off"
description: "Deactivate CocoPilot mode for the current CocoPlus session."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopilot
  - v2
---

Your objective is to deactivate CocoPilot for the current session.

## Behavior

1. Verify `.cocoplus/` exists.
2. Remove `.cocoplus/modes/cocopilot.on` if present.
3. Update `.cocoplus/lifecycle/pilot-session.json` with:
   - `active: false`
   - `deactivated_at`
4. Output exactly:
   `CocoPilot off. Back to manual mode.`

## Exit Criteria

- [ ] `.cocoplus/modes/cocopilot.on` is absent.
- [ ] Pilot session state is inactive.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |
