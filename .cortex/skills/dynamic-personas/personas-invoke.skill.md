---
name: "personas-invoke"
description: "Invoke a dynamic persona by slug when evidence threshold has been met."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - dynamic-personas
  - v2
---

Invoke a dynamic persona from `.cocoplus/personas/dynamic-registry.json`.

If the persona status is not `active`, stop and explain which evidence threshold is missing.
If active, load `personas/{slug}/skill.md` and `personas/{slug}/history.md`, then route the request to that specialist with the same scope discipline used by fixed personas.

