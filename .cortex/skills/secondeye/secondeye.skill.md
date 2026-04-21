---
name: "secondeye"
description: "Multi-model parallel plan critique. Spawns three SecondEye Critic instances in parallel (Haiku: efficiency, Sonnet: completeness, Opus: risk), aggregates findings, and writes a structured report. Critical findings create a soft gate on /build. Usage: /secondeye [--artifact spec|plan|review] [--model haiku|sonnet|opus]."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - secondeye
---

Your objective is to run a multi-model adversarial critique of a lifecycle artifact.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Parse Arguments

- `--artifact [spec|plan|review]`: target artifact (default: plan)
- `--model [haiku|sonnet|opus]`: single-model mode (default: three-model parallel)

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

Otherwise: spawn three critics IN PARALLEL:

**Critic 1 — Efficiency Lens (Haiku)**
Write task prompt to `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/haiku-task.md`:
```
You are a SecondEye Critic. Your lens is: EFFICIENCY.
Artifact to review: [artifact path]
Staging file: .cocoplus/lifecycle/.secondeye-staging/[timestamp]/haiku-findings.md

Efficiency lens: redundant steps, over-engineered solutions, token-expensive approaches, too many passes.
```

**Critic 2 — Completeness Lens (Sonnet)**
Write task prompt to `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/sonnet-task.md`:
```
You are a SecondEye Critic. Your lens is: COMPLETENESS.
Artifact to review: [artifact path]
Staging file: .cocoplus/lifecycle/.secondeye-staging/[timestamp]/sonnet-findings.md

Completeness lens: missing requirements, unresolved dependencies, gaps between spec and plan, unhandled edge cases.
```

**Critic 3 — Risk Lens (Opus)**
Write task prompt to `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/opus-task.md`:
```
You are a SecondEye Critic. Your lens is: RISK.
Artifact to review: [artifact path]
Staging file: .cocoplus/lifecycle/.secondeye-staging/[timestamp]/opus-findings.md

Risk lens: hard-to-reverse decisions, external dependencies that could fail, data loss scenarios, security gaps, unvalidated assumptions.
```

Spawn all three SecondEye Critic subagents in parallel, one per task prompt file.
Wait for all three to complete.

## Aggregate Findings

Read all three staging files.
Deduplicate: findings from different critics that describe the same issue → merge, mark [Consensus].
Classify: Critical / Advisory / Observation
Sort: Critical first, then Advisory, then Observation.

`critical_open = any Critical finding exists`

## Write Report

Write `.cocoplus/lifecycle/secondeye-[timestamp].md`:

```markdown
---
secondeye_id: "se-[timestamp]"
artifact: "[artifact path]"
generated_at: "[ISO 8601 timestamp]"
models_used: [haiku, sonnet, opus]
critical_open: [true/false]
acknowledged: false
acknowledged_at: null
---

# SecondEye Review: [artifact name]

**Date:** [ISO 8601 timestamp]
**Models:** Haiku (Efficiency) + Sonnet (Completeness) + Opus (Risk)

## Critical Findings
[Critical findings]

## Advisory Findings
[Advisory findings]

## Observations
[Observations]

## Consensus Findings
[Findings identified by multiple critics]
```

## Cleanup

Delete `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/` and all contents.

## Output

If `critical_open = true`:
```
SecondEye review complete. CRITICAL FINDINGS DETECTED.
[list critical finding titles]
/build is soft-gated until you acknowledge these findings.
Run `/secondeye acknowledge` to review and acknowledge before building.
Report: .cocoplus/lifecycle/secondeye-[timestamp].md
```

If no critical findings:
```
SecondEye review complete. No critical findings.
[N] advisory findings, [N] observations.
Report: .cocoplus/lifecycle/secondeye-[timestamp].md
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Run only one critic by default | Loses adversarial diversity and weakens coverage |
| Skip deduplication when aggregating findings | Inflated issue counts reduce signal quality |
| Keep staging files after report generation | Leaks temporary artifacts and confuses future runs |

## Exit Criteria

- [ ] Artifact path is resolved and validated before critic execution
- [ ] `.cocoplus/lifecycle/.secondeye-staging/[timestamp]/` is created for critic task files and removed during cleanup
- [ ] Critic outputs are aggregated into `.cocoplus/lifecycle/secondeye-[timestamp].md` with `critical_open` and acknowledgment metadata
- [ ] Output clearly indicates whether `/build` is soft-gated and points to `/secondeye acknowledge` when critical findings exist
