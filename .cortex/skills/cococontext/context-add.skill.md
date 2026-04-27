---
name: "context-add"
description: "Guided wizard to capture or update organizational Snowflake/Cortex standards into .cocoplus/context/<category>.md. Presents a menu of 6 standard types, collects answers via multi-turn dialogue, and commits the file."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cococontext
---

Your objective is to capture organizational standards into a versioned context file.

## Pre-flight Check

Check that `.cocoplus/` exists. If not:
Output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Present Category Menu

Output:
```
Which context would you like to add or update?

1. approved-models      — Which Cortex models are approved for use
2. quality-thresholds   — Minimum accuracy and performance standards
3. pii-policy           — PII handling rules for AI functions
4. warehouse-policy     — Which warehouses to use for which query types
5. naming-conventions   — Object naming standards for Snowflake objects
6. governance-gates     — Required approval steps before production deployment
```

Wait for the developer to select a number (1–6).

Map selection to filename:
- 1 → `approved-models.md`
- 2 → `quality-thresholds.md`
- 3 → `pii-policy.md`
- 4 → `warehouse-policy.md`
- 5 → `naming-conventions.md`
- 6 → `governance-gates.md`

## Check Existing Content

If `.cocoplus/context/<category>.md` already exists, read and display it, then ask:
"This file already exists. Would you like to update it (add/change entries) or replace it entirely?"

Wait for response before proceeding.

## Collect Standards via Dialogue

For the selected category, ask 5–10 targeted questions. Examples per category:

**approved-models:**
- Which Cortex models are approved for production classification tasks? (e.g., mistral-large2, llama3.1-70b)
- Which models are approved for extraction/NER tasks?
- Are there models that are explicitly blocked? Why?
- Is there a default model to use when none is specified?
- Any cost or latency constraints that restrict model choice?

**quality-thresholds:**
- What is the minimum classification accuracy required for production? (e.g., 85%)
- Maximum acceptable p95 latency for AI function calls? (e.g., 2000ms)
- Minimum evaluation dataset size before promoting a model?
- Required precision/recall floor for extraction tasks?

**pii-policy:**
- Which columns are classified as PII in your Snowflake environment?
- Are AI functions permitted to process PII columns directly, or must they be masked first?
- What masking approach is required? (e.g., dynamic data masking, column-level security)
- Are AI function results that contain PII permitted to be written to non-PII tables?

**warehouse-policy:**
- Which warehouse(s) are approved for AI/Cortex function execution?
- Which warehouse(s) are reserved for reporting only?
- What is the maximum warehouse size for dev/staging vs production runs?
- Are there time-of-day restrictions on large warehouse usage?

**naming-conventions:**
- What prefix/suffix convention applies to Cortex UDF names? (e.g., `udf_`, `_ai`)
- Naming convention for evaluation tables?
- Required schema name for AI/ML objects?
- Case convention: UPPER_SNAKE, lower_snake, or CamelCase?

**governance-gates:**
- Which gates are required before promoting a model to production? (e.g., Data Steward sign-off, CDO review)
- Is a SecondEye critique mandatory for production AI functions?
- Required stakeholders for each gate?
- What documentation must exist before a gate can be passed?

Adapt questions based on previous answers. Multi-turn dialogue is expected.

## Compile and Validate

Compile developer responses into a structured markdown file. Use clear headers per topic. Aim for concise, actionable entries.

Count the compiled content lines. If > 200 lines:
Output: "This context file would exceed 200 lines (<N> lines). Please prioritize or summarize — which entries are most critical?"
Iterate until content is ≤ 200 lines.

## Write and Commit

Create `.cocoplus/context/` directory if it doesn't exist.

Write compiled content to `.cocoplus/context/<category>.md`.

Create a git commit:
```
git add .cocoplus/context/<category>.md
git commit -m "feat(context): <category> standards captured"
```

If the git commit fails, write the file but output:
"⚠ File written but git commit failed. Commit manually with: git add .cocoplus/context/<category>.md && git commit -m 'feat(context): <category> standards captured'"

## Output

```
✓ <category>.md updated (<N> lines)
Saved: .cocoplus/context/<category>.md
Committed: feat(context): <category> standards captured

This file will be loaded by CocoScout when tasks involve <relevant task type>.
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Write without checking line count | Files > 200 lines degrade CocoScout context loading performance — enforce the limit |
| Skip git commit | Context files are governance artifacts; version history is required for audit |
| Ask all questions at once | Multi-turn dialogue produces better responses than a single-shot form |

## Exit Criteria

- [ ] `.cocoplus/context/<category>.md` exists and is ≤ 200 lines
- [ ] Git commit created with message `feat(context): <category> standards captured`
- [ ] Output confirms file path and line count
