---
name: "spec"
description: "Enter the Spec phase of CocoBrew. Guides the developer through structured requirements capture: goal, success criteria, constraints, personas involved, data sources, and deliverables. Writes spec.md to .cocoplus/lifecycle/ and creates a git commit."
version: "1.0.4"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Spec phase (1/6) of the CocoBrew lifecycle. Your objective is to capture complete project requirements through structured dialogue.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Check `.cocoplus/lifecycle/meta.json`. If `current_phase` is not `not_started` and not `spec`:

If `current_phase` is `build`, `test`, `review`, or `shipped`:
Output:
```
⚠️  WARNING: Current phase is [phase]. Re-entering Spec at this stage will invalidate downstream artifacts.

Active git worktrees from CocoHarvest (agent/stage-*) will become stale and out of sync with the new specification. You must clean them up manually with:
  git worktree remove --force agent/stage-<name>
  git worktree prune

To proceed anyway, re-run $spec with the --force flag: $spec --force
```
Then stop — unless the `--force` flag was provided in the invocation arguments. If `--force` was provided, output "Proceeding with forced Spec re-entry. Existing downstream artifacts will be invalidated." and continue.

Otherwise (phase is `plan`): Output "Current phase is [phase]. The Spec phase can only be entered from the beginning or re-entered to update requirements. Proceed? (yes/no)"
If no: stop.

## Requirements Capture Dialogue

Before the dialogue starts:

1. Check `.cocoplus/lifecycle/bloom.md`.
   - If it exists, read it first and summarize the Core Capability as the anchor for the specification.
   - If it does not exist and `.cocoplus/lifecycle/meta.json` does not contain `"bloom_waived": true`, output: "No working-backwards document found — consider running `$bloom` before specifying. Run `$bloom --skip` to suppress this message." Then continue normally.
2. Run `.cocoplus/scripts/scope-classify.js` against the initial task description if one was provided, or against the first goal answer once available.
   - Script output must be `quick` or `full`.
   - `--quick` forces Quick Flow. `--full` forces Full Flow.
   - Record the final `"flow_type": "quick" | "full"` in `.cocoplus/lifecycle/meta.json`.
   - If Quick Flow is selected, the lifecycle may skip `$plan` after spec capture and proceed to a single structured build artifact at `.cocoplus/lifecycle/quick-build.md`.

Ask each question in sequence. Wait for the developer's response before proceeding to the next question. Do not batch questions.

**Question 1:** What is the primary goal of this project? (Be specific — what problem does it solve and for whom?)

**Question 2:** What are the success criteria? (How will you know this project succeeded? List 2-5 measurable outcomes.)

**Question 3:** What is explicitly out of scope for this work? (List anything the project will not attempt in this phase.)

**Question 4:** Which existing Snowflake objects are involved? (List tables, views, stages, functions, procedures, or schemas already in play. If none, say "None".)

**Question 5:** Who are the target users? (Who will use or benefit from this output? If unknown, say "TBD".)

**Question 6:** What is the target timeline? (If unknown, say "TBD".)

## Outcome Statement Pre-Gate

Before vague language detection or five-dimension scoring, require an Outcome Statement. This is CocoContract's initial human-authored oracle for the function's behavioral contract — it must exist before any scoring runs.

Ask the developer: "State the outcome in this form: 'When this function works, [persona] sees [result].' Name a specific persona and a non-implementation result."

Validate the answer:
1. A `## Outcome Statement` section must be producible from the answer (non-empty).
2. It must follow the template "When this function works, [persona] sees [result]" with a named persona (not a generic "user" or "developer") and a result stated in observable, non-implementation language.
3. It must not match these anti-patterns (case-insensitive): "the function returns", "the system handles", "users can". A match means the statement describes implementation behavior, not an observed outcome.

If the statement fails any check, return a FAIL verdict immediately with the specific rejection reason and re-ask before any dimension scoring occurs:

```
CocoSpec Outcome Statement — FAIL
  Reason: [specific rejection — e.g. "matched anti-pattern 'the function returns'" or "persona is generic ('a user')"]
  Restate using: "When this function works, [specific persona] sees [observable result]."
```

Do not proceed to Vague Language Detection or scoring until a passing Outcome Statement is recorded. Once passed, store it verbatim for the `## Outcome Statement` section of `spec.md`.

## Vague Language Detection

Before writing the specification document, use `.cocoplus/scripts/spec-validator.js` for deterministic vague language detection on the draft spec answers. If the script is unavailable, fall back to the inline scan below.

Scan all six answers for these term categories (exact word match, case-insensitive):
- Performance: "fast", "quick", "slow", "performant", "efficient", "responsive"
- Quality: "accurate", "precise", "reliable", "correct", "good"
- Scale: "scalable", "flexible", "extensible", "large", "small"
- Safety: "secure", "safe", "private", "compliant"
- UX: "simple", "easy", "user-friendly", "intuitive", "clean"
- Cost: "cost-effective", "affordable", "cheap", "expensive"

For each detected instance, record: `{ "term": "<term>", "answer": "<question N>", "context": "<surrounding text>" }`

Penalty: each unique detected instance deducts 1 point from CocoSpec score (maximum deduction: 3 points). Applied after 5-dimension scoring.

If any instances detected, surface findings before writing spec.md:

```
CocoSpec Vague Language Findings: −[N] points
  ⚠ "[term]" in [answer] — specify with a measurable value (e.g., accuracy ≥ X%, latency ≤ Yms, cost ≤ Z credits per 1,000 rows)
```

Ask the developer: "Would you like to refine these answers before I write the specification? (yes/no)"
If yes: re-ask only the affected questions, then re-run detection on updated answers.
If no: note the vague language findings in spec.md under a "Specification Warnings" section.

## Write Specification Document

Generate a phase ID: `spec-YYYYMMDD-NNN` (use current date, NNN = 001 unless spec already exists).

Write `.cocoplus/lifecycle/spec.md`:

```markdown
# Project Specification

**Date:** [ISO 8601 timestamp]
**Phase:** Spec (1/6)
**Phase ID:** [generated phase ID]

## Outcome Statement
[Passed Outcome Statement, verbatim — referenced by CocoContract as the initial human-authored oracle]

## Goal
[Developer's answer to Question 1]

## Success Criteria
[Developer's answers to Question 2, formatted as bullet list]

## Out of Scope
[Developer's answers to Question 3, formatted as bullet list]

## Existing Snowflake Objects
[Developer's answers to Question 4, formatted as bullet list]

## Target Users
[Developer's answer to Question 5]

## Timeline
[Developer's answer to Question 6]
```

## Update AGENTS.md

Append to `.cocoplus/AGENTS.md` (do not exceed 200 lines):
```
## CocoBrew Lifecycle
Phase: Spec (1/6)
Phase ID: [phase-id]
Spec completed: [timestamp]
```

## Update lifecycle/meta.json

Update `.cocoplus/lifecycle/meta.json`:
```json
{
  "current_phase": "spec",
  "flow_type": "[quick|full]",
  "phases_completed": ["spec"],
  "created_at": "[original timestamp]",
  "phase_history": [
    { "phase": "spec", "phase_id": "[phase-id]", "completed_at": "[timestamp]" }
  ]
}
```

## Create Git Commit

```
git add .cocoplus/lifecycle/spec.md .cocoplus/lifecycle/meta.json .cocoplus/AGENTS.md
git commit -m "feat(spec): initial project specification captured"
```

## Completion Output

Output: "Spec captured. Commit created: `feat(spec): initial project specification captured`. You may now proceed to `$plan`."

## Anti-Rationalization

| Temptation | Why Not |
|------------|---------|
| Ask all 6 questions at once | Batched questions reduce answer quality — always one at a time |
| Skip questions if developer seems impatient | All 6 are required — spec.md must be complete |
| Skip git commit | Every phase must commit for rollback traceability |
| Accept "the function returns X" as the Outcome Statement because it's specific | Specific implementation detail is still not an observed outcome — the anti-pattern check exists precisely to catch this |
| Let a generic persona ("a user", "a developer") pass because the rest of the statement is well-formed | The persona must be specific — a generic persona makes the whole statement unfalsifiable against a real workflow |

## Exit Criteria

- [ ] A passing Outcome Statement is recorded before any dimension scoring runs
- [ ] `.cocoplus/lifecycle/spec.md` exists with all seven sections (Outcome Statement, Goal, Success Criteria, Out of Scope, Existing Snowflake Objects, Target Users, Timeline)
- [ ] `.cocoplus/lifecycle/spec.md` has a valid Phase ID in format `spec-YYYYMMDD-NNN`
- [ ] `.cocoplus/lifecycle/meta.json` `phases_completed` array contains `"spec"` and `current_phase` is `"spec"`
- [ ] Git commit with message `feat(spec): initial project specification captured` exists in log
