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
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

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
