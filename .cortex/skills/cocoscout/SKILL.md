---
name: "cocoscout"
description: "Ambient relevance-ranked context loader with two-lens relevance ranking (Technical + Domain) and Anchor Lens methodology vocabulary injection. Fires automatically before Build stage execution and persona invocations. Not user-invocable."
version: "1.0.2"
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

## Two-Lens Relevance Ranking

CocoScout computes two relevance scores for each context item and combines them as a **weighted composite** based on persona type:

**Technical relevance** — structural relationship: does this item relate to the current function's implementation approach? (SQL patterns for DE tasks; evaluation configuration for DS tasks)

**Domain relevance** — business intent alignment: does this item relate to the same business capability the current task implements? (a prior "customer churn" pattern is domain-relevant to a "revenue decline prediction" task even if their SQL differs)

**Persona weights:**
| Persona | Technical | Domain |
|---------|-----------|--------|
| `$de`, `$ds`, `$ae` | 70% | 30% |
| `$da`, `$bi` | 40% | 60% |
| `$dpm`, `$dst`, `$cdo` | 20% | 80% |

Glossary entries (`.cocoplus/grove/language/glossary.md`) are ranked by term overlap with task message, separate from pattern ranking. Load matching glossary terms alongside patterns.

Weights are configurable per-project in `plugin.json` under `cocoScout.weights`.

## Anchor Lens — Methodology Vocabulary Injection

CocoScout includes a third relevance dimension: the **Anchor Lens**. It maps the developer's task description to methodology vocabulary and injects anchor names into the build agent's context preamble. The anchor catalog is loaded once from `grove/anchors/catalog.md` at initialization (not per-task). Lookup is string-pattern matching — requires no LLM call, completes in <50ms.

**Two modes:**

**Recognition Mode:** Map task description to anchor names:
- "make this function handle edge cases better" → `Boundaries` (SPARV), `EHRB-Cortex Pattern`, `Cortex Scalar UDF Pattern`
- "the evaluation keeps producing inconsistent results" → `LLM-Evaluations`, `Evaluation-Before-Optimization Discipline`, `Property-Based Testing`
- "improve the accuracy of this classification function" → `Evaluation-Before-Optimization Discipline`, `LLM-Evaluations`, `Cortex Scalar UDF Pattern`

**Guidance Mode:** Recommend anchor vocabulary for task type:
- Evaluation task → `LLM-Evaluations`, `Evaluation-Before-Optimization Discipline`, `Property-Based Testing`
- Schema change task → `EHRB-Cortex Pattern`, `Surgical Changes`
- Documentation task → `Diátaxis Framework`, `Docs-as-Code`

Per-persona anchor weighting (same weights as Technical/Domain):
- DE/DS/AE → weight toward technical/implementation anchors
- DA/BI → weight toward domain methodology anchors
- DPM/DST/CDO → weight toward governance and communication anchors

If `grove/anchors/catalog.md` does not exist, skip anchor injection silently.

## Context Sources and Ranking

CocoScout evaluates five context sources:

### 1. CocoGrove Patterns (`.cocoplus/grove/patterns/`)
Score patterns by two-lens weighted composite. Include patterns whose composite score >= 0.3. Cap at 5 patterns.

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

### 5. Project Knowledge Base (`lifecycle/kb.md`)
Always load for Build phase tasks, regardless of keyword relevance score — project-specific knowledge is always relevant during Build. Ranked at a consistent low tier (appended last). The file is small (project-specific, curated by CocoCupper) so loading it does not create token pressure.

## Context Assembly

Assemble selected context into a structured block:

```
## CocoScout Context (auto-loaded)

### Relevant Patterns
<pattern content — two-lens ranked>

### Domain Vocabulary
<glossary terms matching task message>

### Organizational Standards
<context file content>

### Environment Reference
<snapshot excerpt — schema names and table list only, not full column stats>

### Prompt History
<most recent prompt version and score>

### Project Knowledge
<lifecycle/kb.md content>

### Methodology Vocabulary
Applicable anchors for this task: [anchor list with one-line activations]
```

Prepend this block to the persona subagent's startup context.

## Performance Constraint

CocoScout must complete in < 5 seconds. If filesystem reads are taking longer, truncate to what has been loaded so far and proceed. Never block a persona invocation.

## What CocoScout Does Not Do

- Does not load context files in bulk without relevance scoring
- Does not include snapshots older than 24 hours
- Does not run Snowflake queries (all sources are local files)
- Does not run LLM calls for anchor lookup (string-pattern matching only)
- Does not output anything to the developer session — it operates silently

The developer can inspect what CocoScout loaded by checking `.cocoplus/hook-log.jsonl` for entries with `action: "scout_context_loaded"`.
