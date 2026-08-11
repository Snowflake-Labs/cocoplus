---
name: "ops-suggest"
description: "Show time-aware CocoOps operational suggestions from the deterministic ops-suggest classifier. Usage: $ops suggest."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoops
user-invocable: true
blocking: false
---

Your objective is to display time-aware delivery suggestions for the current CocoPod.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Run:

```bash
invoke cocoops/ops-suggest-engine
```

Display the returned suggestions with their cited operational signal. Do not invent recommendations when the script reports insufficient data.

If a suggestion has no citation because `dora-snapshot.json` is missing or incomplete, label it as a data gap and show the command that would create the missing evidence (`$ops dora` or `$ops demo`). Do not present uncited suggestions as measured recommendations.

## Exit Criteria

- Suggestions come from `cocoops/ops-suggest-engine`
- Every suggestion includes the source signal or data gap
- Absence of data is reported as a data gap, not converted into a recommendation

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |
