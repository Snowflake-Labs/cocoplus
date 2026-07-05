---
name: "patterns-promote"
description: "Promote a CocoCupper finding to a reusable pattern in the CocoGrove pattern library. Interactive: confirms the finding, asks for a name and tags, writes a .md pattern file."
version: "1.1.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocogrove
---

Your objective is to promote a CocoCupper finding to a CocoGrove pattern.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

## `$grove score <pattern-id>` — Promotion Scoring (Durability × Impact × Scope)

Before any promotion is confirmed, run `node scripts/grove-score.js --id <pattern-id>` (or run this scoring interactively when invoked directly as `$grove score`). Score the candidate pattern on three dimensions, each zero to three:

- **Durability** — 0: one-time fix · 1: temporary workaround · 2: stable pattern · 3: architectural truth. Assesses whether the pattern remains valid for 30+ days and across schema/data changes.
- **Impact** — 0: nice-to-know · 1: saves a minute · 2: prevents mistakes · 3: prevents breakage.
- **Scope** — 0: one file only · 1: one directory · 2: entire CocoPod · 3: all CocoPods of this type.

**Decision thresholds:**
- Total ≥ 6 → **promote** (move to CocoSkill or convention store)
- Total 4–5 → **watch** (revisit next review cycle)
- Total ≤ 3 → **ignore** (leave in capture store or delete if stale)
- **Override:** a score of 3 on any single dimension is a strong promotion candidate regardless of total — any architectural truth, any breakage-preventing finding, or any CocoPod-universal pattern requires explicit human review before demotion, even if the total would otherwise suggest "watch" or "ignore".

Display the scoring summary and decision threshold result before promotion is confirmed:
```
CocoGrove Promotion Score — [pattern-id]
  Durability: [0-3]  Impact: [0-3]  Scope: [0-3]  Total: [N]
  Decision: PROMOTE | WATCH | IGNORE [+ override note if a single-dimension 3 applies]
```

## Distillation Rules

Apply all three before writing any convention entry — these are mandatory text transformations, not style preferences:

1. **Descriptive-to-prescriptive** — the text must be a direct instruction, not an observation. ("This project uses pnpm" → "Use pnpm install, not npm.")
2. **Verbose-to-concise** — completable in two sentences or fewer; longer explanation belongs in a linked reference file, not the convention entry itself.
3. **Conditional-to-absolute** — hedging language ("sometimes", "might", "can", "it depends") must resolve to a specific condition or be removed. A hedging entry is a note to self, not an instruction.

Reject a promotion — even one with a passing score — if the pattern text has not been distilled per all three rules. Rewrite before writing the pattern file.

Parse argument: `$patterns promote [finding-id]`
If no finding-id provided: output "Usage: $patterns promote [finding-id] — e.g., $patterns promote Finding-001" Then stop.

Read `.cocoplus/grove/cupper-findings.md`. Find the finding with the specified ID.
If not found: output "Finding [id] not found. Run `$cup history` to see available findings." Then stop.

Display the full finding to the developer.

Run the promotion scoring workflow above before asking for confirmation. If the decision is IGNORE and no single dimension scored 3, output: "Score [N]/9 — below promotion threshold. Recommend leaving in capture store." and stop unless the developer explicitly overrides.

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

Output: "Pattern '[pattern-name]' promoted to CocoGrove. File: `.cocoplus/grove/patterns/[pattern-name].md`. Use `$patterns view` to see all patterns."

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
- [ ] `grove-score.js` computed the three-dimension total and decision threshold before promotion was confirmed
- [ ] Pattern text passes all three distillation rules (prescriptive, concise, absolute) before being written to the convention entry
