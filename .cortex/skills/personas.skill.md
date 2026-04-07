---
name: "personas"
description: "List all available CocoPlus specialist personas with their triggers, models, modes, and locked tool sets. No preconditions required — works without /pod init."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - personas
---

Your objective is to display the complete CocoPlus persona catalog.

Output the following table:

```
# Available Personas

| Persona | Trigger | Model | Mode | Isolation | Tools |
|---------|---------|-------|------|-----------|-------|
| Data Engineer | $de | sonnet | auto | worktree | SnowflakeSqlExecute, DataDiff, Bash, Read, Write, Edit |
| Analytics Engineer | $ae | sonnet | auto | none | SnowflakeSqlExecute, ReflectSemanticModel, Read, Write, Edit |
| Data Scientist | $ds | sonnet | auto | none | NotebookExecute, SnowflakeSqlExecute, Bash, Read, Write |
| Data Analyst | $da | sonnet | auto | none | SnowflakeSqlExecute, Read, Write |
| BI Analyst | $bi | sonnet | auto | none | SnowflakeSqlExecute, Read, Write |
| Data Product Manager | $dpm | sonnet | auto | none | Read, Write |
| Data Steward | $dst | sonnet | auto | none | SnowflakeSqlExecute, Read, Write |
| Chief Data Officer | $cdo | opus | plan | none | Read |
| CocoBrew Coordinator | (automatic) | sonnet | auto | none | Read, Write, Edit, Bash |
| CocoCupper | (automatic) | haiku | auto | none | Read |
| SecondEye Critic | (via /secondeye) | haiku/sonnet/opus | plan | isolated | Read |

## Invocation Examples

Direct invocation:    $de Review this SQL for performance issues
With continuation:    $de --continue Fix the issues you identified
In CocoHarvest:       Automatic based on workstream classification
```
