# Clean Code 66-Rule Taxonomy — Cortex/Snowflake Application Guide

Loaded on demand during Phase 5 of `$review` and when the Boy Scout Rule (Constraint 5) is applied.

---

## Category C — Comments

| # | Rule | Cortex Violation | Cortex Correction |
|---|------|-----------------|-------------------|
| C1 | Inappropriate information | Git author/date in SQL comment block | Remove — git log owns history |
| C2 | Obsolete comment | `-- TODO: add eval` after eval was added 3 sprints ago | Delete obsolete comments immediately |
| C3 | Redundant comment | `-- returns a varchar` above `RETURNS VARCHAR` | Delete — the signature says it |
| C4 | Poorly written | `-- does the thing` | Write: `-- Classifies sentiment with AI_CLASSIFY using PRODUCT_REVIEW_CLASSIFIER v2` |
| C5 | Commented-out code | Old `AI_COMPLETE` prompt left commented above current version | Delete — it is in git history |

---

## Category E — Environments

| # | Rule | Cortex Violation | Cortex Correction |
|---|------|-----------------|-------------------|
| E1 | Multiple config systems | Both `safety-config.json` and `cocoplus.toml` with conflicting prod schemas | Single SSOT: `cocoplus.toml` via `$cocoplus sync` |
| E2 | Manual config sync | Updating warehouse in two places when Snowflake config changes | Run `$cocoplus sync` — propagates automatically |
| E3 | Test setup requires human | Eval set requires manual Snowflake role grants not documented | Document all required grants in `cocoplus-context.md` |

---

## Category F — Functions

| # | Rule | Cortex Violation | Cortex Correction |
|---|------|-----------------|-------------------|
| F1 | Too many things | Function classifies AND logs result AND sends notification | Split into three functions with single responsibilities |
| F2 | Output arguments | Stored procedure writes results to two tables as implicit side effects | Return structured result; let caller decide where to write |
| F3 | Flag arguments | `classify(text, TRUE)` where TRUE = verbose mode | Two functions: `classify(text)` and `classify_verbose(text)` |
| F4 | Dead function | `GENERATE_SUMMARY_V1` defined but never called, superseded by V2 | Drop — if needed, git history has it |

---

## Category G — General

| # | Rule | Cortex Violation | Cortex Correction |
|---|------|-----------------|-------------------|
| G1 | Multiple languages in one source | Inline Python UDF logic mixed with SQL orchestration | Separate — Snowpark for Python, SQL for orchestration |
| G2 | Obvious behavior unimplemented | `AI_CLASSIFY` with no NULL input handling | `CASE WHEN input IS NULL OR TRIM(input) = '' THEN NULL ELSE AI_CLASSIFY(...) END` |
| G3 | Incorrect behavior at boundaries | Classifier throws on empty string input | Test: `SELECT classify('')` — handle explicitly |
| G4 | Overridden safeties | `$safety off` left active after destructive operation in prior session | Re-enable with `$safety normal` after each destructive session |
| G5 | Duplication | Same `AI_COMPLETE` prompt string copied into 3 different functions | Extract to shared constant or CocoRecipe template |
| G6 | Code at wrong abstraction | Business-logic SQL in hook script | Business logic in SQL objects; hooks are control flow only |
| G7 | Base depends on derivative | Pipeline stage 1 reads output of stage 3 | Invert — child stages write to shared state; parent reads shared state |
| G8 | Too much information | 25-column view returned from classification function | Return only columns the caller needs |
| G9 | Dead code | `IF BETA_FEATURE THEN ... END IF` — flag always false | Delete dead branch |
| G10 | Vertical separation | Helper function defined 200 lines from its only caller | Group related functions together in the source file |
| G11 | Inconsistency | Sometimes `model_name`, sometimes `modelName`, sometimes `MODEL` | Pick one convention (snake_case for SQL) and apply everywhere |
| G12 | Clutter | Unused stored procedures, orphaned temp tables never dropped | Remove clutter; temp tables should be `TEMP` scoped |
| G13 | Artificial coupling | Evaluation table and feature store in same schema for no structural reason | Separate by responsibility into appropriate schemas |
| G14 | Feature envy | Hook script directly manipulates `flow.json` internals | Access flow state via `$flow` commands — hooks should log and signal |
| G15 | Selector arguments | `run_pipeline('full')` vs `run_pipeline('test')` switch inside one function | Two functions: `run_full_pipeline()`, `run_test_pipeline()` |
| G16 | Obscured intent | `SELECT AI_COMPLETE('claude-haiku-4-5', t)` inline without context | Add comment: `-- Haiku: cost-optimized summarization, ~$0.0003/call` |
| G17 | Misplaced responsibility | Credit cost calculation inside the classification function | Cost tracking belongs in CocoMeter layer |
| G18 | Inappropriate static | Hard-coded warehouse name `COMPUTE_WH` inside stored procedure | Read from session context or `cocoplus.toml [warehouses]` |
| G19 | Use descriptive variables | `r`, `x`, `tmp` as variable names | `response`, `classification_result`, `temp_score` |
| G20 | Function names say what they do | `process()`, `handle()` | `classify_customer_sentiment()`, `handle_sql_execution_error()` |
| G21 | Understand the algorithm | Copy-pasted DORA calculation formula without validation | Validate with a known dataset before deploying to ops-dora |
| G22 | Make logical dependencies physical | Two scripts depend on same state file with no declared dependency | Declare via `flow.json` edge — implicit is always wrong |
| G23 | Prefer polymorphism | `IF persona = 'de' THEN ... ELIF persona = 'ae' THEN ...` | Use agent routing table in `personas.json` |
| G24 | Follow standard conventions | `-- Author: SN` on every Snowflake function | Only unusual provenance needs attribution |
| G25 | Replace magic number | `WHERE score > 0.7` | `WHERE score > :SENTIMENT_POSITIVE_THRESHOLD` with constant named in context |
| G26 | Be precise | "usually completes within 5 seconds" | "SLA: p95 < 8 seconds (source: ops-dora.json 2026-06-01)" |
| G27 | Structure over convention | Naming convention to distinguish test functions | Use dedicated `TEST_` schema — structure beats naming |
| G28 | Encapsulate conditionals | `IF (score > 0.7 AND model = 'classifier-v2' AND NOT is_null)` | Extract to `is_positive_sentiment(score, model, input)` |
| G29 | Avoid negative conditionals | `IF NOT is_not_valid` | `IF is_invalid` |
| G30 | Functions do one thing | Function classifies AND writes to audit trail | Split at the write boundary |
| G31 | Hidden temporal couplings | Stage 2 must run after Stage 1, with no declared dependency | Declare in `flow.json` edges — never rely on implicit ordering |
| G32 | Don't be arbitrary | `SELECT * FROM T1 left join T2` — inconsistent casing | All SQL keywords uppercase or all lowercase — pick one |
| G33 | Encapsulate boundary conditions | `offset + 1` and `limit - 1` repeated across 4 functions | `nextIndex = offset + 1`, `lastIndex = limit - 1` as named vars |
| G34 | Descend one level of abstraction | Orchestration SQL mixed with transformation logic | Orchestration reads/writes; transformation transforms — separate |
| G35 | Configurable data at high levels | `accuracy_threshold = 0.85` buried 3 levels deep in a helper | Move to `cocoplus.toml [cost]` or `[review.rules]` |
| G36 | Avoid transitive navigation | `getStage().getAgent().getModel().getTokenLimit()` | Access what you need directly; don't chain through unrelated objects |

---

## Category N — Naming

| # | Rule | Cortex Violation | Cortex Correction |
|---|------|-----------------|-------------------|
| N1 | Descriptive names | `fn1`, `proc_x`, `model_a` | `classify_product_review`, `refresh_semantic_model`, `sentiment_classifier_v2` |
| N2 | Appropriate abstraction level | `parse_ai_json_response` in a function named `classify` | Rename internal to `parse_response`; keep external as `classify` |
| N3 | Standard nomenclature | Custom abbreviation `prcdre` for procedure | `procedure` or `proc` — use established terms |
| N4 | Unambiguous names | `handle()` could be anything | `handle_sql_execution_error()` — no ambiguity |
| N5 | Long names for long scopes | `i` as a variable in a 50-line loop body | `stageIndex`, `classificationResult` for long-lived variables |
| N6 | Avoid encodings | `str_model_name`, `int_threshold`, `b_is_valid` | `model_name`, `threshold`, `is_valid` — types are in the schema |
| N7 | Names describe side effects | `get_classification()` that also logs to audit trail | `classify_and_log()` or split into two functions |

---

## Category T — Tests (Evaluation)

| # | Rule | Cortex Violation | Cortex Correction |
|---|------|-----------------|-------------------|
| T1 | Insufficient tests | Only 3 happy-path eval rows for a classifier | Minimum: 50 labeled rows with balanced positive/negative split |
| T2 | Use a coverage tool | Guessing which functions have evaluation coverage | Track via `coco-map.json` eval coverage field |
| T3 | Don't skip trivial tests | "Too simple to test — it just calls AI_CLASSIFY" | Simple wrappers can fail trivially — test them |
| T4 | Ignored test = bug | `-- SKIP: this test flakes` above a failing eval | Fix or delete; never ignore a failing eval |
| T5 | Test boundary conditions | Testing only mid-range confidence scores | Test at: empty input, NULL, score=0.0, score=1.0, threshold boundary |
| T6 | Exhaustively test near bugs | One misclassification found — only that row fixed | Scan for all rows with similar characteristics |
| T7 | Patterns of failure reveal patterns | Random-seeming failures | Cluster failures — they usually share a structural cause |
| T8 | Test coverage patterns tell you something | All failures at score≈0.5 | Boundary condition at classifier threshold — adjust or name it |
| T9 | Tests should be fast | Full 10,000-row eval table for every dev iteration | Use stratified 100-row sample for dev; full table for CI only |

---

## Phase 5 Review Protocol

When applying Phase 5 in `$review`:
1. Load this guide
2. For each file in scope, scan each category in order: C, F, G, N, T
3. Each finding **MUST** include the rule number: `[G25]`, `[N7]`, etc.
4. Severity: most clean-code violations are `nit` or `suggestion`; fundamental issues are `important`
5. **Mandatory praise:** At least one `praise` finding citing a correctly-applied rule
6. If no violations found: emit `praise` for the most clearly honored rule observed

**Finding format:**
```yaml
- phase: 5
  rule: G25
  severity: nit
  finding: "Magic Number — threshold 0.7 should be SENTIMENT_POSITIVE_THRESHOLD"
  file: classify_sentiment.sql
  line: 42
```
