---
name: "skill-native-health-grader"
description: "Skill-native V2 replacement contract for scripts/health-grader.js. Executes the same behavioral obligation using Coco-native tools instead of a registered runtime script."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - skill-native
  - v2
---

Your objective is to perform the behavior formerly delegated to $script using Coco-native capabilities: Read, Write, Edit, Bash when explicitly needed by the host, Snowflake tools when the feature requires data access, and subagents when the feature requires independent review.

## Required Contract

- Preserve the artifact paths, schemas, and user-visible outputs documented by the owning feature skill.
- Do not call $script as the implementation path.
- Prefer deterministic file parsing and structured artifacts over free-form prose when producing machine-readable state.
- If an external side effect would occur, apply the same gate and confirmation semantics as the owning feature.

## Replacement Source

Former runtime script: $script.

## Exit Criteria

- [ ] The owning feature's documented artifact is produced or updated.
- [ ] The output schema remains compatible with existing readers.
- [ ] No registered runtime script invocation is required.
