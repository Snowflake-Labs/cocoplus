---
name: "cocoscout"
description: "Ambient relevance-ranked context loader. Fires automatically before Build stage execution and persona invocations. Ranks CocoGrove patterns, CocoContext files, environment snapshots, and prompt history by relevance to the current task. Not user-invocable."
version: "1.0.1"
author: "CocoPlus"
user_invocable: false
tags:
  - cocoplus
  - cocoscout
---

# CocoScout — Relevance-Ranked Context Loading

This skill fires automatically before Build stage execution and persona subagent invocations. It is not a user command. It selects and prepends the most relevant context to reduce token waste from bulk-loading.

## When CocoScout Fires

CocoScout activates when ALL of the following are true:
1. `.cocoplus/` is initialized
2. The current action is one of:
   - A persona subagent invocation (`$de`, `$ae`, `$ds`, `$da`, `$bi`, `$dpm`, `$dst`, `$cdo`)
   - A `/build` phase execution
   - A `/flow run` stage execution
3. At least one of the context sources below exists

If none of the context sources exist, CocoScout exits immediately (< 1ms, no output).

## Context Sources and Ranking

CocoScout evaluates four context sources:

### 1. CocoGrove Patterns (`.cocoplus/grove/patterns/`)
Score patterns by keyword overlap with the current task prompt. Include patterns whose score >= 0.3 (30% keyword overlap). Cap at 5 patterns to avoid context bloat.

### 2. CocoContext Files (`.cocoplus/context/`)
Include context files whose category is relevant to the current task type:
- SQL generation task → include `approved-models.md`, `warehouse-policy.md`, `naming-conventions.md`
- AI/Cortex function task → include `approved-models.md`, `pii-policy.md`, `quality-thresholds.md`
- Production deployment task → include `governance-gates.md`
- Any task → include files explicitly referenced by the current stage prompt

Cap total CocoContext content at 400 lines across all included files.

### 3. Environment Snapshots (`.cocoplus/snapshots/`)
Include the most recent snapshot (by filename timestamp) only if it is < 24 hours old. Never include more than one snapshot.

### 4. Prompt History (`.cocoplus/prompts/`)
If the current task involves a function that has existing prompt versions, include the most recent version's meta.json for evaluation score context. Cap at the 3 most recent versions.

## Context Assembly

Assemble selected context into a structured block:

```
## CocoScout Context (auto-loaded)

### Relevant Patterns
<pattern content>

### Organizational Standards
<context file content>

### Environment Reference
<snapshot excerpt — schema names and table list only, not full column stats>

### Prompt History
<most recent prompt version and score>
```

Prepend this block to the persona subagent's startup context.

## Performance Constraint

CocoScout must complete in < 5 seconds. If filesystem reads are taking longer, truncate to what has been loaded so far and proceed. Never block a persona invocation.

## What CocoScout Does Not Do

- Does not load context files in bulk without relevance scoring
- Does not include snapshots older than 24 hours
- Does not run Snowflake queries (all sources are local files)
- Does not output anything to the developer session — it operates silently

The developer can inspect what CocoScout loaded by checking `.cocoplus/hook-log.jsonl` for entries with `action: "scout_context_loaded"`.
