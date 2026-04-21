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
| Data Analyst | $da | haiku | auto | none | SnowflakeSqlExecute, SnowflakeMultiCortexAnalyst, Read |
| BI Analyst | $bi | haiku | auto | none | ReflectSemanticModel, SnowflakeMultiCortexAnalyst, Read |
| Data Product Manager | $dpm | sonnet | plan | none | Read, Write, SnowflakeProductDocs |
| Data Steward | $dst | sonnet | plan | none | SnowflakeSqlExecute, DataDiff, Read, Write |
| Chief Data Officer | $cdo | opus | plan | none | Read, SnowflakeProductDocs |
| CocoBrew Coordinator | (automatic) | sonnet | auto | none | Read, Write, Edit, Bash |
| CocoCupper | (automatic) | haiku | auto | none | Read |
| SecondEye Critic | (via /secondeye) | sonnet (default; /secondeye may spawn haiku/opus critics) | plan | none | Read |

## Invocation Examples

Direct invocation:    $de Review this SQL for performance issues
With continuation:    $de --continue Fix the issues you identified
In CocoHarvest:       Automatic based on workstream classification
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Display a partial persona list to keep output short | The persona catalog is a reference table — omitting personas causes developers to invoke the wrong specialist or miss options |

## Exit Criteria

- [ ] All 11 personas are listed in the output table with Trigger, Model, Mode, Isolation, and Tools columns
- [ ] Invocation examples section is shown with direct, continuation, and CocoHarvest examples
