---
name: "quality-run"
description: "Run the Code Quality Advisor on demand against a specified file or all SQL files. Usage: /quality run [file-path] or /quality run (for all .sql files). Finds anti-patterns and writes a findings report."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - code-quality
---

Your objective is to run a code quality review.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Parse argument: `/quality run [file-path]`
If no argument: find all `.sql` files in the current directory tree (excluding `.git/` and `.cocoplus/`).
If file-path provided: verify the file exists.

## SQL Anti-Pattern Detection

For each SQL file, check for these anti-patterns:

| ID | Pattern | Severity | Detection |
|----|---------|----------|-----------|
| QA-001 | SELECT * | medium | regex: `SELECT\s+\*` |
| QA-002 | Missing WHERE on UPDATE/DELETE | critical | regex: `(UPDATE\|DELETE FROM)\s+\S+\s*$` |
| QA-003 | Unbounded result (no LIMIT) | low | large SELECT without LIMIT |
| QA-004 | Cartesian product (implicit JOIN) | high | regex: `FROM\s+\w+\s*,\s*\w+` without WHERE |
| QA-005 | Deprecated OVER ROWS syntax | low | regex: `ROWS BETWEEN UNBOUNDED PRECEDING` |
| QA-006 | Hardcoded credentials | critical | regex: `password\s*=\s*['"][^'"]+['"]` |

## Write Findings Report

Generate timestamp.
Write `.cocoplus/quality-findings-[timestamp].md`:

```markdown
# Quality Findings Report

**Date:** [ISO 8601 timestamp]
**Files Analyzed:** [N]
**Findings:** [count by severity]

## Critical
[findings]

## High
[findings]

## Medium
[findings]

## Low
[findings]

## Summary
[overall assessment]
```

Output: "Quality review complete. [N] findings ([C] critical, [H] high, [M] medium, [L] low). Report: `.cocoplus/quality-findings-[timestamp].md`."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Report "no findings" without scanning the file (assuming clean code) | Anti-pattern detection requires actually running regex checks — assumptions produce false negatives |
| Skip writing the findings file if there are zero findings | An empty findings report is still a valid audit record; zero findings must be explicitly documented |
| Scan `.cocoplus/` SQL files along with project SQL files | CocoPlus internal files should never be analyzed — always exclude `.git/` and `.cocoplus/` from the scan |

## Exit Criteria

- [ ] `.cocoplus/quality-findings-[timestamp].md` exists with Date, Files Analyzed, and Findings summary header
- [ ] Each SQL file in scope was checked against all 6 anti-pattern rules (QA-001 through QA-006)
- [ ] Output shows finding counts by severity (critical, high, medium, low)
