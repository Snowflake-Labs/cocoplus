---
name: "secondeye"
description: "Multi-model parallel plan critique. Spawns five SecondEye Critic instances in parallel (Efficiency, Completeness, Risk, Devil's Advocate, Edge Case Hunter), aggregates findings with HITL/AFK, BLOCKING/MINOR, and six-severity labels, and writes a structured report. Critical findings create a soft gate on $build. Usage: $secondeye [--artifact spec|plan|review] [--model haiku|sonnet|opus]."
version: "1.1.0"
author: "CocoPlus"
tags:
  - cocoplus
  - secondeye
---

Your objective is to run a multi-model adversarial critique of a lifecycle artifact.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

## Parse Arguments

- `--artifact [spec|plan|review]`: target artifact (default: plan)
- `--model [haiku|sonnet|opus]`: single-model mode (default: five-lens parallel)

Resolve artifact path:
- spec → `.cocoplus/lifecycle/spec.md`
- plan → `.cocoplus/lifecycle/plan.md`
- review → `.cocoplus/lifecycle/review.md`

Verify the artifact file exists. If not: output "Artifact [file] not found. Run the appropriate lifecycle phase first." Then stop.

## Create Staging Directory

Generate timestamp: `YYYYMMDD-HHMMSS`
Create: `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/`

## Spawn Critics

If single-model mode (`--model` flag provided): spawn only one critic with that model and the Completeness lens.

Otherwise: spawn five critics IN PARALLEL:

**Critic 1 — Efficiency Lens (Haiku)**
Write task prompt to `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/haiku-task.md`:
```
You are a SecondEye Critic. Your lens is: EFFICIENCY.
Artifact to review: [artifact path]
Staging file: .cocoplus/lifecycle/.secondeye-staging/[timestamp]/haiku-findings.md

Efficiency lens: redundant steps, over-engineered solutions, token-expensive approaches, too many passes.

Assign each finding a `severity` label: blocking | important | nit | suggestion | learning | praise
At least one `praise` finding is required if any well-constructed pattern is present.
```

**Critic 2 — Completeness Lens (Sonnet)**
Write task prompt to `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/sonnet-task.md`:
```
You are a SecondEye Critic. Your lens is: COMPLETENESS.
Artifact to review: [artifact path]
Staging file: .cocoplus/lifecycle/.secondeye-staging/[timestamp]/sonnet-findings.md

Completeness lens: missing requirements, unresolved dependencies, gaps between spec and plan, unhandled edge cases.

Assign each finding a `severity` label: blocking | important | nit | suggestion | learning | praise
At least one `praise` finding is required if any well-constructed pattern is present.
```

**Critic 3 — Risk Lens (Opus)**
Write task prompt to `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/opus-task.md`:
```
You are a SecondEye Critic. Your lens is: RISK.
Artifact to review: [artifact path]
Staging file: .cocoplus/lifecycle/.secondeye-staging/[timestamp]/opus-findings.md

Risk lens: hard-to-reverse decisions, external dependencies that could fail, data loss scenarios, security gaps, unvalidated assumptions.

Assign each finding a `severity` label: blocking | important | nit | suggestion | learning | praise
At least one `praise` finding is required if any well-constructed pattern is present.
```

**Critic 4 — Devil's Advocate Lens (Sonnet)**
Write task prompt to `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/da-task.md`:
```
You are a SecondEye Critic. Your lens is: DEVIL'S ADVOCATE.
Artifact to review: [artifact path]
Staging file: .cocoplus/lifecycle/.secondeye-staging/[timestamp]/da-findings.md

Devil's Advocate lens: Find the strongest possible argument that this plan should NOT proceed as written.
Identify ONE of: the single most damaging assumption, the most likely architectural failure, or the most serious underspecified requirement.
Do not seek balance. Your mandate is adversarial rigor — construct the most compelling case for why this plan will fail.

All your findings are classified BLOCKING by default.
Assign severity `blocking` to all DA findings by default.
For each finding, include a required "rebuttal_score" field (1–5) when the developer responds:
- Score 4–5: concede (response is sufficient)
- Score 1–3: re-assert the concern and explain why the response is insufficient
```

**Critic 5 — Edge Case Hunter Lens (Haiku)**
Write task prompt to `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/edge-task.md`:
```
You are a SecondEye Critic. Your lens is: EDGE CASE HUNTER.
Artifact to review: [artifact path]
Staging file: .cocoplus/lifecycle/.secondeye-staging/[timestamp]/edge-findings.md

Edge Case Hunter lens: identify evaluation blind spots, rare input shapes, data distribution shifts, failure cases not represented in the plan, and acceptance criteria that would miss bad behavior.

Assign severity `important` by default; use `blocking` only for correctness, security, or deployment-blocking risk.
At least one `praise` finding is required if any well-constructed pattern is present.
```

Spawn all five SecondEye Critic subagents in parallel, one per task prompt file.
Wait for all five to complete.

## Aggregate Findings

Read all five staging files.
Deduplicate: findings from different critics that describe the same issue → merge, mark [Consensus].
Classify severity: Critical / Advisory / Observation.
Sort: Critical first, then Advisory, then Observation.

**HITL/AFK classification** — for each finding:
- **HITL:** Requires human judgment before resolution. Default for: Critical severity findings, findings about evaluation methodology, architectural decisions, scope changes, findings where resolution involves a choice between options with different trade-offs.
- **AFK:** Can be resolved autonomously in the next `$build` pass. Default for: Warning and Info findings that map to known fix patterns (add a NULL check, refactor a subquery, apply an existing CocoGrove pattern).

**Six-Severity label aggregation** — for each finding, record the `severity` field from the critic output:
- `blocking` — always maps to BLOCKING verdict contribution
- `important` — maps to CONCERNS if no `blocking` findings; BLOCKING only if it touches correctness, security, or architectural scope
- `nit`, `suggestion`, `learning`, `praise` — non-escalating; present in report but never change the top-level verdict

**Verdict derivation from severity labels:**
- BLOCKING verdict: any finding carries `blocking` label AND passes existing BLOCKING threshold
- CONCERNS verdict: any finding carries `important` label and no `blocking` label findings exist
- APPROVE verdict: only `nit`, `suggestion`, `learning`, and `praise` labels present

**Praise enforcement:** After reading all five staging files, verify each critic emitted at least one `praise` finding. If any critic produced zero praise findings, add a note in the report: "No praise findings from [critic lens] — critic did not surface any well-constructed patterns."

**BLOCKING/MINOR classification** — for each finding (orthogonal to HITL/AFK):
- **BLOCKING:** Must be resolved by the developer — involves correctness, security, architectural conflict, or genuine ambiguity about intent. Findings with `severity: blocking` are always BLOCKING. Findings with `severity: important` are BLOCKING only if they touch correctness, security, or architectural scope.
- **MINOR:** Can be auto-resolved without developer input — involves style, naming, missing documentation, or a non-critical coverage gap mapping to a known fix pattern. Findings with `nit`, `suggestion`, or `learning` severity are MINOR by default.

Read `da-findings.md`. All DA findings are BLOCKING by default. The developer may downgrade a DA finding to Advisory with explicit override and rationale, but the default is mandatory-review.

Compute `action_summary`:
- `hitl_count`: count of HITL-classified findings
- `afk_count`: count of AFK-classified findings
- `blocking_count`: count of BLOCKING-classified findings
- `minor_count`: count of MINOR-classified findings
- `da_finding_count`: count of Devil's Advocate findings
- `edge_case_count`: count of Edge Case Hunter findings
- `severity_counts`: `{ blocking: N, important: N, nit: N, suggestion: N, learning: N, praise: N }`

`critical_open = any finding with severity: "blocking" exists`

## Write Report

Write `.cocoplus/lifecycle/secondeye-[timestamp].md`:

```markdown
---
secondeye_id: "se-[timestamp]"
artifact: "[artifact path]"
generated_at: "[ISO 8601 timestamp]"
models_used: [haiku, sonnet, opus, sonnet-da, haiku-edge]
critical_open: [true/false]
acknowledged: false
acknowledged_at: null
action_summary:
  hitl_count: [N]
  afk_count: [N]
  blocking_count: [N]
  minor_count: [N]
  da_finding_count: [N]
  edge_case_count: [N]
  severity_counts:
    blocking: [N]
    important: [N]
    nit: [N]
    suggestion: [N]
    learning: [N]
    praise: [N]
---

# SecondEye Review: [artifact name]

**Date:** [ISO 8601 timestamp]
**Models:** Haiku (Efficiency) + Sonnet (Completeness) + Opus (Risk) + Sonnet (Devil's Advocate) + Haiku (Edge Case Hunter)
**Action Summary:** [blocking_count] BLOCKING · [minor_count] MINOR · [hitl_count] HITL · [afk_count] AFK · [da_finding_count] DA · [edge_case_count] Edge Cases
**Severity:** [blocking] blocking · [important] important · [nit] nit · [suggestion] suggestion · [learning] learning · [praise] praise

## [Devil's Advocate] Findings
[DA findings — all BLOCKING by default, tagged [BLOCKING] [HITL] [severity:blocking]]

## [Edge Case Hunter] Findings
[Evaluation blind spot findings — tagged [HITL/AFK] [BLOCKING/MINOR] [severity:important|blocking]]

## Blocking Findings
[Findings with severity:blocking — each tagged [HITL/AFK] [BLOCKING]]

## Important Findings
[Findings with severity:important — each tagged [HITL/AFK] [BLOCKING/MINOR]]

## Nits, Suggestions & Learning
[Findings with severity:nit|suggestion|learning — each tagged [AFK] [MINOR]]

## Praise
[Findings with severity:praise — well-constructed patterns surfaced by critics]

## Consensus Findings
[Findings identified by multiple critics — include severity label from highest-severity critic]
```

## Cleanup

Delete `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/` and all contents.

## Output

If `critical_open = true`:
```
SecondEye review complete. CRITICAL FINDINGS DETECTED.
[list critical finding titles — each with HITL/AFK and BLOCKING/MINOR tags]
Action required: [blocking_count] BLOCKING · [hitl_count] HITL requiring developer attention
$build is soft-gated until you acknowledge these findings.
Run `$secondeye acknowledge --hitl-only` to acknowledge HITL stages.
Run `$secondeye acknowledge --blocking-only` to acknowledge BLOCKING findings only.
Report: .cocoplus/lifecycle/secondeye-[timestamp].md
```

If no critical findings:
```
SecondEye review complete. No critical findings.
[N] advisory findings ([blocking_count] BLOCKING, [minor_count] MINOR) · [N] observations
HITL stages: [hitl_count] · AFK stages: [afk_count]
Report: .cocoplus/lifecycle/secondeye-[timestamp].md
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Run only one critic by default | Loses adversarial diversity and weakens coverage |
| Skip deduplication when aggregating findings | Inflated issue counts reduce signal quality |
| Keep staging files after report generation | Leaks temporary artifacts and confuses future runs |
| Skip praise enforcement | Praise is a structural invariant — a system that only identifies defects produces defensiveness |
| Use old Critical/Advisory/Observation labels in report | Six-severity labels replaced the three-level system — old labels create aggregation inconsistency |

## Exit Criteria

- [ ] Artifact path is resolved and validated before critic execution
- [ ] `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/` is created for critic task files and removed during cleanup
- [ ] Every finding is tagged with `severity` label (blocking/important/nit/suggestion/learning/praise), HITL/AFK, and BLOCKING/MINOR
- [ ] Each critic produced at least one `praise` finding, or the report notes its absence explicitly
- [ ] Report frontmatter includes `action_summary` with `hitl_count`, `afk_count`, `blocking_count`, `minor_count`, and `severity_counts`
- [ ] Verdict derived from severity labels: BLOCKING if any `blocking` finding; CONCERNS if any `important`; APPROVE if only non-escalating labels
- [ ] Critic outputs are aggregated into `.cocoplus/lifecycle/secondeye-[timestamp].md` with `critical_open` and acknowledgment metadata
- [ ] Output clearly indicates whether `$build` is soft-gated and shows the `--hitl-only` and `--blocking-only` acknowledge options
