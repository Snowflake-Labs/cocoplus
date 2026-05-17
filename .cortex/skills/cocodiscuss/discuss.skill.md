---
name: discuss
description: Run a structured decision-capture dialogue before $plan — locks implementation choices (model, evaluation methodology, accuracy threshold, scope boundaries) into discuss.md to prevent silent decision drift during planning
version: 1.0.2
user-invocable: true
command: $discuss
author: "CocoPlus"
tags:
  - cocoplus
feature: CocoDiscuss (Feature 30)
---

# $discuss

Run a structured pre-planning dialogue that captures implementation decisions before `$plan` runs. Prevents the planning agent from silently filling in gaps with choices the developer never consciously made.

## Preconditions

- `.cocoplus/` must be initialized
- `lifecycle/spec.md` must exist (run `$spec` first)

## Arguments

None. The wizard adapts its questions to the content of `spec.md`.

## Step-by-Step Behavior

### Phase 1 — Read Spec and Determine Context

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." and exit.

2. **Verify spec.md:** Read `.cocoplus/lifecycle/spec.md`. If not found, output: "Spec phase must complete before `$discuss`. Run `$spec` first." and exit.

3. **Detect work type:** Analyze `spec.md` to determine the primary type of work:
   - **AI Function build:** spec mentions AI_COMPLETE, AI_CLASSIFY, AI_EXTRACT, or similar Cortex function development
   - **Cortex Search:** spec mentions search service configuration or retrieval
   - **Semantic Model:** spec mentions Analytics Engineer semantic modeling
   - **Data Pipeline:** spec describes ETL, transformation, or data movement work

4. **Load CocoContext standards** (if available): Read `.cocoplus/context/approved-models.md`, `quality-thresholds.md`, `warehouse-policy.md` to pre-populate answers where organizational standards are definitive.

### Phase 2 — Structured Decision Wizard

Run the following question set adapted to the work type. For each question:
- If CocoContext has a definitive answer (e.g., `approved-models.md` lists only one approved model), display the standard's answer with attribution and confirm with developer (press Enter to accept or type override)
- For open questions, ask clearly and wait for developer response

**Standard question set (for AI Function builds):**

**Q1 — Model selection:**
```
Which Cortex model will this function use?
[Show approved models from CocoContext if available, or list common options]
> 
```

**Q2 — Evaluation methodology:**
```
What data will be used as the evaluation baseline?
Options: Production sample, synthetic data, existing labeled set
How many examples? (minimum recommended: 50 for classification, 100+ for extraction)
> 
```

**Q3 — Accuracy threshold:**
```
What accuracy level must the function reach before deployment is approved?
(Express as a percentage, e.g., 85%)
> 
```

**Q4 — Warehouse assignment:**
```
Which warehouse runs evaluation queries?
[Show warehouse-policy.md options if available]
> 
```

**Q5 — Production safety requirements:**
```
What governance checks must pass before this function can be deployed?
(e.g., Data Steward approval, PII review, security scan)
> 
```

**Q6 — Scope boundaries:**
```
What is explicitly out of scope for this build?
(One clear statement — prevents scope creep from entering the plan)
> 
```

**Adapted question set for Cortex Search builds:**
- Replace Q1 (model) with: "What embedding model will Cortex Search use?"
- Replace Q3 (accuracy) with: "What latency threshold is acceptable? (e.g., <200ms)"
- Keep Q2, Q4, Q5, Q6 with Search-appropriate framing

**Adapted question set for Semantic Model builds:**
- Replace Q1-Q3 with: "Which fact table? Which dimensions? What is the primary metric this model will surface?"
- Keep Q4, Q5, Q6

### Phase 3 — Write discuss.md

5. **Write all answers** to `.cocoplus/lifecycle/discuss.md`:
```markdown
---
discuss_date: [ISO8601]
discuss_phase: pre-plan
status: complete
---

## Model
[Answer or "From approved-models.md: [standard]"]

## Evaluation Data
[Answer]

## Accuracy Threshold
[Answer]

## Warehouse
[Answer or "From warehouse-policy.md: [standard]"]

## Production Safety Requirements
[Answer]

## Scope Boundaries
[Answer]
```

6. **Create git commit:** `feat(discuss): implementation decisions captured pre-plan`

### Phase 4 — CocoSpec Scoring Gate

7. **Run deterministic pre-checks before scoring:**
   - Run `.cocoplus/scripts/spec-validator.js .cocoplus/lifecycle/spec.md .cocoplus/lifecycle/discuss.md`.
   - Apply vague-language penalties from the JSON output before the final score (maximum 3-point deduction).
   - If the script is missing, warn and continue with the scorer fallback.

8. **Invoke CocoSpec scorer** (background Haiku subagent, read-only): Score the combined `spec.md` + `discuss.md` on five dimensions (0–2 points each, maximum 10):

   | Dimension | What Is Scored | Score 0 | Score 1 | Score 2 |
   |---|---|---|---|---|
   | **Value** | Why is this being built? | No rationale | Rationale present but unmeasurable | Clear rationale with verifiable metrics |
   | **Scope** | What is the MVP? What is out of scope? | No scope | MVP defined but out-of-scope not stated | Both MVP and explicit out-of-scope defined |
   | **Acceptance** | Are criteria testable? | No criteria | Criteria stated but not testable | Testable pass/fail criteria |
   | **Boundaries** | Error handling, performance, security? | None | Partial | All four boundary types addressed |
   | **Risk** | EHRB indicators? Mitigations? | None | Risks identified, no mitigation | Risks identified with mitigation or escalation |

9. **Write score** to `lifecycle/spec-score.md`.

10. **Gate behavior:**

   **Score ≥9 — PASS:**
   ```
   ✓ Specification complete (score: [N]/10)
   
   Decisions captured in lifecycle/discuss.md
   Score written to lifecycle/spec-score.md
   
   Ready for $plan.
   ```

   After PASS, run `.cocoplus/scripts/alignment-check.js`. If it returns conflicts, block subagent spawning and surface each conflict by field, value, and source file. If clean, proceed.

   **Quick Mode check (score ≥9, scope ≤3 files, no EHRB indicators):**
   ```
   ✓ Specification complete (score: [N]/10)
   
   Your specification qualifies for Quick Mode:
   - Score: [N]/10
   - Scope: [N] files (≤3)
   - No EHRB indicators detected
   
   Quick Mode skips the Plan phase and proceeds directly to Build.
   Confirm Quick Mode? [Y to skip $plan and go to $build | N to proceed with $plan]
   ```
   - If developer confirms Quick Mode: update `lifecycle/meta.json` with `quick_mode: true`; output: "Quick Mode activated. Run `$build` to proceed directly."
   - If developer declines: output: "Running full lifecycle. Run `$plan` to proceed."

   **Score 7–8 — CONCERNS:**
   ```
   ⚠ Specification score: [N]/10 (concerns)
   
   Targeted rescore required for:
   [dimension names and concrete guidance]
   
   Address only these dimensions in spec.md or discuss.md, then run $discuss again.
   ```

   **Score ≤6 — FAIL with Uncertainty Declaration:**
   ```
   ⚠ Specification score: [N]/10 (fail)
   
   Gaps detected:
   [List of dimensions scoring below 2]
   
   Named assumptions (things being assumed, not stated):
   UNCERTAIN: [specific assumption] | ASSUMPTION: [what is being assumed]
   [Repeat for each sub-2 dimension]
   
   Address these gaps before proceeding to $plan.
   ```

   If developer exits mid-discuss, save partial `discuss.md` with `status: incomplete`. Warn that plan-checker will only validate answered questions.

## Error Cases

- **`spec.md` not found:** Output message directing user to run `$spec` first
- **Developer exits mid-wizard:** Save partial discuss.md with `status: incomplete`; no CocoSpec gate is run on incomplete discuss
- **CocoSpec scorer fails:** Note failure in output; do not block developer from proceeding unless deterministic alignment conflicts were found
- **alignment-check.js reports conflicts:** Block subagent launch until the conflicting shared decision inputs are resolved
- **Cannot write discuss.md:** Output filesystem error

## Exit Criteria

This skill is complete when:
- `lifecycle/discuss.md` is written with all answered questions
- CocoSpec scorer has run and produced a score in `lifecycle/spec-score.md`
- `spec-validator.js` output has been considered before scoring
- `alignment-check.js` has run after PASS and produced either no conflicts or a blocking conflict report
- Developer has received the gate outcome (PASS, CONCERNS, FAIL, Quick Mode offer, or alignment conflict report)

## Anti-Rationalization

Do NOT:
- Block `$plan` if CocoDiscuss was not run — `$discuss` is always optional
- Auto-promote Quick Mode without explicit developer confirmation
- Require developer to answer all questions if CocoContext provides definitive answers
- Run CocoSpec scorer on partial (incomplete) discuss.md files
