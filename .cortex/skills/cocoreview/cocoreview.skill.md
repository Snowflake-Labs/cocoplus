---
name: cocoreview
description: CocoReview — structured code review with six-severity findings vocabulary, progressive disclosure architecture, and universal anti-pattern baseline. Invoked via $review [file] [--complexity] [--security] [--architecture] [--language <lang>].
version: "1.2.0"
author: CocoPlus
tags:
  - cocoreview
  - code-review
  - delivery-discipline
user-invocable: true
blocking: true
---

## Objective

You are executing CocoReview — a structured, evidence-grounded code review. Your task is to produce an actionable prioritized finding report using the six-severity vocabulary and the four-phase review process.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Routing Table

| Invocation | Loads |
|------------|-------|
| `$review <file>` | `universal-quality.md` + language guide inferred from file extension |
| `$review --security` | `universal-quality.md` + language guide + `security-review.md` |
| `$review --architecture` | `universal-quality.md` + `architecture-review.md` |
| `$review --complexity` | Run `pr-complexity.js` only — no LLM review |
| `$review --language <lang>` | `universal-quality.md` + explicit language guide |

## Step 1 — Parse Invocation and Run Complexity Analyzer

Parse the `$review` command for file path and flags. If no file path provided for non-complexity commands, ask: "Which file or directory should I review?"

**Always run `pr-complexity.js` first** (before any LLM work):

```
node .cortex/scripts/pr-complexity.js --file <path>
```

Read the output JSON. If `size_bucket` is `XL` (≥800 lines of change), surface a split recommendation:

```
⚠ CocoReview: This artifact is in the XL complexity bucket (<N> lines changed, complexity score <score>).
XL changes are significantly harder to review effectively. Consider splitting into:
- Schema/model changes (separate PR)
- Logic/transformation changes (separate PR)
- Test additions (can merge with logic changes)

Proceed with full review anyway? [YES/SPLIT]
```

If `--complexity` flag: display complexity output and stop (no LLM review).

## Step 2 — Load Reference Guides

Based on routing table above, load the appropriate guides from `.cortex/skills/cocoreview/`. Always load `universal-quality.md`. Load others based on flags and risk_flags from complexity analyzer output (e.g., if `security-sensitive` in risk_flags, load `security-review.md`).

## Step 3 — Context Gathering (Phase 1: ~2–3 minutes)

Before reviewing implementation, understand WHY the change exists:
- Read PR description if available (`.cocoplus/review/pr-description.md` or ask developer for context)
- Read linked issue or spec if referenced
- Check if this is part of an active CocoBrew lifecycle phase (read `lifecycle/meta.json`)

## Step 4 — High-Level Review (Phase 2: ~5–10 minutes)

Architecture and strategy BEFORE line-level inspection:
- Does the solution fit the problem? Is the approach right?
- Is the file organization coherent? Does it follow the project's structure (read `cocoplus-context.md` if present)?
- Is the test strategy adequate for the change scope?

**If architectural problems found: surface them now before line-by-line work begins.** There is no value in perfecting the implementation of a structurally wrong design.

## Step 5 — Line-by-Line Review (Phase 3: ~10–20 minutes)

Apply the loaded reference guides. For each finding, assign a severity from the six-severity vocabulary:

| Label | Meaning | Effect on Verdict |
|-------|---------|-------------------|
| `blocking` | Must resolve before merge | → REQUEST_CHANGES |
| `important` | Should resolve | → COMMENT or REQUEST_CHANGES |
| `nit` | Minor style concern | Non-blocking |
| `suggestion` | Optional improvement | Non-blocking |
| `learning` | Educational context note | Non-blocking |
| `praise` | Well-constructed pattern | Mandatory if good patterns exist |

**Reuse check is first-class:** Before accepting new code, verify no existing utility already covers the case. For Snowflake: before a new UDF, check if an existing function can be parameterized; before a new pipeline, check if an existing one can be extended.

**TOCTOU detection:** Specifically flag Snowflake `IF EXISTS THEN INSERT` patterns and recommend `MERGE` instead.

**Mandatory praise:** If ANY well-constructed pattern exists in the artifact, emit at least one `praise` finding. If no well-constructed pattern is found, emit: `praise: Evaluation scope was limited — no exemplary patterns identified in this review.`

## Step 6 — Security Review (if --security or security risk flags)

Apply the five-tier security severity scale:

| Tier | Merge Policy |
|------|-------------|
| Critical | Block merge — fix immediately |
| High | Block merge — fix before release |
| Medium | Should fix — can merge with tracking |
| Low | Non-blocking |
| Info | Non-blocking |

Snowflake-specific Critical triggers: hardcoded credentials in SQL, missing masking on PII columns, unprotected access to regulated column sets.

## Step 7 — Summary and Verdict (Phase 4: ~2–3 minutes)

Determine verdict based on highest finding severity:
- Any `blocking` finding → `REQUEST_CHANGES`
- Any `important` without `blocking` → `COMMENT`
- Only `nit`/`suggestion`/`learning`/`praise` → `APPROVE`

## Step 7b — Phase 5: Clean Code Enforcement (66-Rule Taxonomy)

Load on demand: `skills/cocoreview/clean-code.md`

For each SQL/Snowpark file in scope:
1. Scan Category C (Comments), F (Functions), G (General), N (Naming), T (Tests)
2. Record violations with mandatory rule-number citation

Finding format:
```yaml
- phase: 5
  rule: G25
  severity: nit
  finding: "Magic Number: threshold 0.7 should be SENTIMENT_POSITIVE_THRESHOLD"
  file: classify_sentiment.sql
  line: 42
```

**Mandatory praise invariant (Phase 5):** At least one `praise` finding must cite a correctly-applied clean-code rule:
```yaml
- phase: 5
  rule: G30
  severity: praise
  finding: "Single Responsibility honored — classify_sentiment() does exactly one thing"
```

If no clean-code violations are found, emit praise for the most clearly applied rule observed. Never omit the Phase 5 praise finding.

## Step 7c — Phase 6: Complexity Audit (CocoLean Five-Tag Classification)

Phase 6 applies the five CocoLean classification tags to the Cortex function layer of the reviewed artifact. This is a retrospective surface-area analysis on the completed artifact — not pre-commit like `$lean review`, but post-build and artifact-scoped. Phase 6 always runs on every artifact review.

For each construct in the artifact's Cortex function layer, determine which tags apply:

| Tag | Meaning | Finding Severity |
|-----|---------|-----------------|
| `delete` | No callers, no tests, no declared purpose in `spec.md` or `discuss.md` | `blocking` if touches trust boundary; `important` otherwise |
| `stdlib` | Logic reimplementing a Snowflake built-in — include specific replacement | `important` |
| `native` | AI function performing a task more correctly expressed as a native object (stream, task, dynamic table, alert, policy, materialized view) — include recommended object type | `important` |
| `yagni` | Abstractions, flags, or extension points with no corresponding spec requirement | `nit` if no security risk; `important` if expands attack surface or adds untested code paths |
| `shrink` | One logical operation expressed in more code than required | `nit` |

**Finding format (Phase 6):**
```yaml
- phase: 6
  tag: stdlib
  severity: important
  finding: "GET_PATH() built-in available — manual JSON key extraction reimplements it"
  file: classify_entity.sql
  line: 34
  action: "Replace with: GET_PATH(obj, 'entity.type')"
```

**Phase 6 tag distribution summary** (required in output): `delete:[N] stdlib:[N] native:[N] yagni:[N] shrink:[N]`

**Mandatory praise invariant (Phase 6):** If the artifact shows restraint — a task expressible in two lines is expressed in two lines, a native object is used instead of a custom function — emit a `praise` finding citing the specific example.

**Carve-outs:** Never tag trust boundary implementations, security controls, data loss prevention, compliance requirements, or error handling as `delete`, `yagni`, or `shrink`. These are always exempt.

**Integration:** Phase 6 uses the same five-tag vocabulary as `$lean review`. The difference: `$lean review` is diff-scoped and pre-commit; Phase 6 is artifact-scoped and post-build. Both tools share vocabulary so findings are trend-analyzable across CocoReview reports over time.

## Step 8 — Write and Commit Review Output

Write the structured review to `.cocoplus/review/cocoreview-<YYYY-MM-DD-HHMMSS>.md`:

```markdown
## CocoReview: [artifact_name]
**Complexity:** [score/1.0] — [bucket] — ~[N] min review

### Summary
[1–2 sentences: what this change does and overall quality assessment]

### Strengths
- [praise findings — explicit, specific, named]

### Required Changes
- [[blocking]/[important]] [finding]

### Suggestions
- [[nit]/[suggestion]] [finding]

### Questions
- [clarifying questions before confident verdict is possible]

### Security
- [security findings if --security was invoked]

### Tests
- [test coverage assessment]

### Clean Code (Phase 5)
- [[rule-id]] [finding] (severity: nit/praise)

### Complexity Audit (Phase 6)
**Tag distribution:** delete:[N] stdlib:[N] native:[N] yagni:[N] shrink:[N]
- [[tag]] [finding] (severity: important/nit/praise)

### Verdict
[APPROVE / COMMENT / REQUEST_CHANGES] — [one-line rationale]
```

Create git commit: `docs(review): add cocoreview for <artifact_name>`

Write complexity analyzer output to `.cocoplus/review/complexity-cache.json` (gitignored — derived).

## Step 9 — Output Confirmation

Display: "CocoReview complete. Report written to `.cocoplus/review/cocoreview-<timestamp>.md`"
Show the Summary and Verdict sections.

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip complexity analysis to save time | Complexity score determines whether to recommend a split — skipping silently accepts oversized reviews |
| Omit praise because nothing stood out | Praise is mandatory — if truly nothing is well-constructed, emit the limited-scope praise finding |
| Skip Phase 2 (high-level) and go to line-by-line | Perfecting a structurally wrong design wastes everyone's time |
| Map security tier to six-severity arbitrarily | Security tiers and six-severity labels are orthogonal — Critical security = blocking finding, not a new label |

## Exit Criteria

- `pr-complexity.js` run before any LLM work
- XL artifacts get split recommendation surfaced
- At least one `praise` finding in every review (Phases 1-4)
- Phase 5 clean-code section present with at least one rule-cited `praise` finding
- Phase 6 complexity audit section present with tag distribution summary
- Structured review template output committed to git
- `complexity-cache.json` is NOT committed (gitignored)
