---
name: cocoreview
description: CocoReview — structured code review with six-severity findings vocabulary, progressive disclosure architecture, and universal anti-pattern baseline. Invoked via $review [file] [--complexity] [--security] [--architecture] [--language <lang>].
version: "1.4.0"
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

**METR taxonomy classification:** Classify every Phase 1 (universal anti-pattern) finding under one of five METR categories — sourced from METR's real-world evaluation findings on the empirical gap between benchmark pass rates and actual merge outcomes:

| Category | Covers |
|----------|--------|
| `code-quality` | Correctness defects, logic errors, missing null/error handling |
| `style` | Naming, formatting, convention deviation |
| `scope` | Change touches more than the stated task requires |
| `collateral-effects` | Change has side effects on unrelated behavior or callers |
| `defensive-code` | Missing or excessive defensive checks relative to actual trust boundary |

**Evidence citation requirement:** Every `blocking` and `important` finding must cite the evidence tier that grounds it: `e2e` (observed failure against a real execution), `reference` (contradicts an externally sourced standard), or `project-historical` (contradicts a documented prior decision in `cocoplus-context.md` or `plan.md`). A finding citing only `unit` evidence (a self-constructed test case) or `self-assessment` (the reviewing agent's own judgment with no external grounding) **may not exceed `nit` severity** — regardless of how confident the finding reads.

Finding format with taxonomy and evidence:
```yaml
- phase: 1
  metr_category: scope
  severity: important
  evidence_tier: project-historical
  finding: "Change modifies the retry backoff constant, which was not part of the requested WHERE-clause fix"
  file: pipeline.sql
  line: 88
```

**Mandatory specificity fields for `scope`, `collateral-effects`, and `defensive-code` findings:** these three categories must additionally include `requested_change` (what was actually asked for) and `observed_delta` (what the artifact does beyond or short of that) — a finding in these categories without both fields is incomplete and must not be surfaced as-is.

**Priority tier and effort estimate (Feature 47 Enhancement):** every finding, in every phase, additionally carries a `priority:` and an `effort:` field — orthogonal to severity, not derived from it.

`priority:` — urgency relative to the deployment lifecycle:
| Tier | Time Horizon | Effect |
|------|-------------|--------|
| `P1` | pre-deploy | Blocks `$ship` independently of severity |
| `P2` | this sprint | High-impact; should resolve before it compounds |
| `P3` | this month | Tracked and visible, not urgently blocking |
| `P4` | backlog | Accepted low-impact; present in the report and audit trail, not surfaced in daily status |

`effort:` — implementation cost for planning:
| Tier | Range | Description |
|------|-------|--------------|
| `XS` | < 30 min | Targeted one-line or config fix |
| `S` | 30 min – 2 hr | Focused change within one file or function |
| `M` | 2–8 hr | Meaningful change spanning multiple files or requiring test updates |
| `L` | 1–3 days | Substantial refactor or new mechanism |
| `XL` | 3+ days | Scope conversation warranted — **triggers explicit developer acknowledgment in the review output** |

These three dimensions — severity (impact), priority (urgency), effort (cost) — are independent. A `MINOR` finding at `P1`/`XS` is common: low impact but on a path that blocks deployment, trivial to fix. A `BLOCKING` finding at `P3`/`XL` is also valid: severe in quality terms but acceptable to schedule after release given its scope. Together they make every finding immediately actionable for triage without further analysis.

**XL acknowledgment:** any finding with `effort: XL` must be surfaced in a dedicated block requiring explicit developer acknowledgment before the review can be treated as actioned:
```
⚠ XL EFFORT — [finding-id]: [one-line summary]
This finding is estimated at 3+ days of work. Acknowledge before proceeding? (yes/defer)
```

**CocoPivot inheritance:** when CocoPivot deduplicates this finding with others from parallel pods, it inherits the **highest** priority tier and the **largest** effort estimate among all contributing sources — combined remediation may exceed any single source's original estimate.

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
- Any `BLOCKED` finding (see below) → `REQUEST_CHANGES`, identically to `blocking`

## BLOCKED Verdict — Fifth Output State (Feature 47 Enhancement)

`BLOCKED` is a fifth finding state alongside `blocking`/`important`/`nit`/`suggestion`/`learning`/`praise`. It exists for the case where the artifact requires a human decision the reviewing agent is not authorized to make — not a defect with a known fix, but a situation requiring architectural judgment, business context, or regulatory interpretation.

**The critical distinction:** `blocking` means "this is wrong and here is how to fix it." `BLOCKED` means "this requires a decision I am not authorized to make. Here is what I found and here are the options as I understand them." Issuing a `BLOCKED` finding is not a failure of the review — it is the review succeeding at knowing its own limits. A reviewer that never emits `BLOCKED` is not disciplined, it is overconfident; any review scope with legitimate architectural ambiguity should have a calibrated `BLOCKED` threshold.

**Required content for every `BLOCKED` finding** — all three are mandatory:
1. **What was found** — factual description only, no remediation advocacy
2. **Why human judgment is required** — the specific decision that must be made and why the pod cannot make it
3. **Options as understood** — enumerated without ranking or advocacy

Finding format:
```yaml
- severity: BLOCKED
  finding: "Schema migration adds a NOT NULL column to a 40M-row production table without a backfill strategy"
  why_human_judgment: "Choosing a backfill approach (online migration vs. maintenance window vs. default-value shim) is an availability/consistency tradeoff specific to this table's traffic pattern, which this review has no authority to decide"
  options:
    - "Online migration with a default value, backfilled asynchronously"
    - "Maintenance-window migration with full table lock"
    - "Add the column nullable now, enforce NOT NULL in application code, tighten the constraint in a follow-up migration"
```

**Workflow effect:** `$ship` treats `BLOCKED` identically to `blocking` — it halts progression until resolved.

### `$review clear-blocked --id <finding-id> --rationale <text>`

Records the developer's rationale in CocoAudit (via the shared audit-write logic), marks the `BLOCKED` finding resolved in `.cocoplus/lifecycle/review-state.json`, and unblocks `$ship` if no other `BLOCKING` or `BLOCKED` findings remain. Resolution may be: selecting one of the presented options, escalating to another human, or documenting a decision rationale independent of the presented options.

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
- [[blocking]/[important]/[BLOCKED]] [priority: P1-P4] [effort: XS-XL] [finding]

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

If any `BLOCKED` findings exist, add a `### Blocked Decisions` section listing each with its three required elements (what was found, why human judgment is required, options as understood). If any `XL`-effort findings exist, add the XL acknowledgment block for each before the Verdict section.

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
- Every Phase 1 finding carries a `metr_category` label (code-quality/style/scope/collateral-effects/defensive-code)
- Every `blocking` and `important` finding cites an `evidence_tier`; findings citing only unit/self-assessment evidence are capped at `nit`
- `scope`, `collateral-effects`, and `defensive-code` findings include both `requested_change` and `observed_delta`
- Every finding carries a `priority` (P1–P4) and `effort` (XS–XL) field, independent of severity
- `$ship` is blocked identically by any `BLOCKING` or `BLOCKED` finding
- Every `BLOCKED` finding includes what was found, why human judgment is required, and options as understood, without ranking
- `$review clear-blocked` requires a rationale and records it in the audit trail before unblocking `$ship`
- Every `XL`-effort finding is surfaced with an explicit developer acknowledgment prompt
