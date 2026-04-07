---
name: "spark-off"
description: "Exit CocoSpark brainstorm mode, optionally carry forward selected insights, and close the exploration session cleanly. Usage: /spark-off."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocospark
---

Your objective is to conclude an active CocoSpark brainstorm session.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

If `.cocoplus/modes/coco-spark.on` does not exist:
- Output: "No active CocoSpark session found. Run `/spark` to start a brainstorm." Then stop.

## Exit Brainstorm Mode

1. Remove `.cocoplus/modes/coco-spark.on`
2. Offer: "Capture insights as notes? (yes/no)"
3. If yes:
   - Prompt: "What insights should be carried forward?"
   - If `.cocoplus/lifecycle/spec.md` exists, append a short `## Brainstorm Insights` section and create commit `docs(spec): added brainstorm insights`
   - If `spec.md` does not exist, append the notes to the active `.cocoplus/spark-[timestamp].md` file and do not create a lifecycle commit
4. If no: make no additional file changes

## Output

Output:
```
Brainstorm concluded.
[Insights captured | No changes made]
Ready for `/spec` when you are.
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| End spark mode without removing flag | Leaves session state inconsistent and confuses later commands |
| Auto-inject brainstorm notes into lifecycle artifacts | Conflates exploration with approved plan/spec decisions |
| Skip explicit yes/no capture prompt | Insight persistence becomes accidental and non-deterministic |

## Exit Criteria

- [ ] `.cocoplus/modes/coco-spark.on` flag is removed when a session is active
- [ ] If insights are captured and `spec.md` exists, a `## Brainstorm Insights` section is appended and commit `docs(spec): added brainstorm insights` is created
- [ ] If insights are captured and `spec.md` is absent, notes are appended to the active `.cocoplus/spark-[timestamp].md` file without lifecycle commit
- [ ] Output confirms brainstorm closure and next-step guidance toward `/spec`
