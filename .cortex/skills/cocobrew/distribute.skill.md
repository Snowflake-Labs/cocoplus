---
name: "distribute"
description: "Run the CocoBrew marketplace distribution quality gate before publishing or recommending a CocoPod skill."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocobrew
  - distribution
---

Use this skill for `$brew distribute <skill-path>`.

## Objective

Evaluate a CocoPod skill package before marketplace distribution or recommendation. The gate protects users from prompt-dump skills, undeclared permissions, install-time execution, untested behavior, and unjustified network use.

## Five Criteria

1. **Explicit tool permissions:** SKILL.md frontmatter must declare the tools or permissions the skill expects.
2. **Observable evals:** `evals/` must exist and contain at least one runnable evaluation.
3. **Failure behavior:** SKILL.md must document `on_failure:` behavior or an equivalent failure-handling section.
4. **No install-time execution:** The package must not execute code during installation. Execution belongs only to explicit command invocations.
5. **Justified network use:** Any `network:` frontmatter declaration must include `network_justification:`.

## Verdicts

- **Clear:** All quality criteria pass and no security gate fails. Distribution may proceed.
- **Advisory:** One or more quality criteria are incomplete, but no security gate fails. Distribution requires developer acknowledgment and is not recommended automatically by CocoBrew.
- **Block:** A security criterion fails, install-time execution is detected, or the package omits critical permission declarations. Distribution stops. There is no bypass flag.

## Workflow

1. Parse `$brew distribute <skill-path>`.
2. Read SKILL.md and package folders next to it.
3. Run deterministic checks before any LLM review:
   - frontmatter contains permissions/tools
   - `evals/` exists and is non-empty
   - failure handling section exists
   - no install hooks or install-time command blocks are declared
   - network declarations include justification
4. Run existing trifecta/security checks when available.
5. Write `.cocoplus/brew/distribution-gate-<timestamp>.json`.
6. For Clear, proceed with the configured distribution path.
7. For Advisory, stop for acknowledgment.
8. For Block, stop with exact failed criteria.

## Exit Criteria

- [ ] Block verdict prevents distribution.
- [ ] Advisory verdict requires explicit acknowledgment.
- [ ] The report names each failed criterion.
- [ ] No install-time execution is allowed.
