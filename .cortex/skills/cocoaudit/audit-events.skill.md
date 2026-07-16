---
name: "audit-events"
description: "V2-native deterministic contract for the owning CocoPlus feature. Executes the behavior formerly delegated to scripts/audit-events.js without registered runtime scripts."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - v2
---

Your objective is to perform this V2-native feature behavior using Coco-native capabilities: Read, Write, Edit, Bash when explicitly needed by the host, Snowflake tools when the feature requires data access, and subagents when the feature requires independent review.

## Required Contract

- Preserve the artifact paths, schemas, and user-visible outputs documented by the owning feature skill.
- Do not call legacy scripts as the implementation path.
- Prefer deterministic file parsing and structured artifacts over free-form prose when producing machine-readable state.
- If an external side effect would occur, apply the same gate and confirmation semantics as the owning feature.

## Exit Criteria

- [ ] The owning feature's documented artifact is produced or updated.
- [ ] The output schema remains compatible with existing readers.
- [ ] No registered runtime script invocation is required.
