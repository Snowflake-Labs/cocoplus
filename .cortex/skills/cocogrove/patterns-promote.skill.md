---
name: "patterns-promote"
description: "Promote a CocoCupper finding to a reusable pattern in the CocoGrove pattern library. Interactive: confirms the finding, asks for a name and tags, writes a .md pattern file."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocogrove
---

Your objective is to promote a CocoCupper finding to a CocoGrove pattern.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Parse argument: `/patterns promote [finding-id]`
If no finding-id provided: output "Usage: /patterns promote [finding-id] — e.g., /patterns promote Finding-001" Then stop.

Read `.cocoplus/grove/cupper-findings.md`. Find the finding with the specified ID.
If not found: output "Finding [id] not found. Run `/cup history` to see available findings." Then stop.

Display the full finding to the developer.

Ask: "Promote this finding to a reusable pattern? (yes/no)"
If no: output "Promotion cancelled." Then stop.

Ask: "Pattern name (kebab-case, e.g., sql-pagination-pattern):"
Ask: "Domain (e.g., sql, data-modeling, testing):"
Ask: "Tags (comma-separated, e.g., sql, performance, snowflake):"

Generate a pattern ID: `pat-YYYYMMDD-NNN`

Write `.cocoplus/grove/patterns/[pattern-name].md`:

```markdown
---
id: "[pattern-id]"
name: "[pattern-name]"
domain: "[domain]"
tags: [[tags]]
promoted_from: "[finding-id]"
promoted_at: "[ISO 8601 timestamp]"
---

# [Pattern Name]

## Summary
[Finding summary]

## Context
[When to use this pattern]

## Pattern
[The reusable practice, based on the finding recommendation]

## Anti-Pattern
[What to avoid, based on the finding]
```

Update the finding in cupper-findings.md: change `**Promoted:** false` to `**Promoted:** [pattern-id]`

Output: "Pattern '[pattern-name]' promoted to CocoGrove. File: `.cocoplus/grove/patterns/[pattern-name].md`. Use `/patterns view` to see all patterns."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Promote without confirming with the developer first | Patterns in CocoGrove are authoritative reusable practices; auto-promoting without review could canonize a bad finding |
| Skip updating the finding's `Promoted` field in cupper-findings.md | Without updating the source, the same finding can be promoted multiple times creating duplicate patterns |
| Use a generic pattern name instead of asking the developer | A generic name makes the pattern unsearchable and unrecognizable across projects |

## Exit Criteria

- [ ] `.cocoplus/grove/patterns/[pattern-name].md` exists with YAML frontmatter containing `id`, `name`, `domain`, `tags`, `promoted_from`, and `promoted_at`
- [ ] The source finding in `.cocoplus/grove/cupper-findings.md` has been updated from `**Promoted:** false` to `**Promoted:** [pattern-id]`
- [ ] Developer confirmed promotion with "yes" before the pattern file was written
