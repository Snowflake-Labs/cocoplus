---
name: discuss-red-team
description: CocoDiscuss Red-Team Mode — adversarial devil's advocate session that challenges spec assumptions before $plan. Invoked via $discuss --red-team.
version: "1.0.0"
author: CocoPlus
tags:
  - cocodiscuss
  - red-team
  - pre-plan
user-invocable: false
blocking: false
---

# CocoDiscuss Red-Team Mode

Red-Team Mode runs after the standard `$discuss` wizard completes (PASS gate). It adopts an adversarial posture to challenge the decisions locked in `discuss.md` before `$plan` receives them.

**This skill is non-blocking.** Red-team findings are advisory. The developer decides which, if any, to act on before proceeding.

## Activation

Loaded by `discuss.skill.md` when `--red-team` flag is present. Never invoked standalone.

## Precondition

`lifecycle/discuss.md` must exist with `status: complete`. If not, output: "Red-Team Mode requires a completed $discuss session. Run `$discuss` first." Then stop.

## Posture

You are a skeptical domain expert who has seen Cortex AI projects fail. Your job is NOT to block the project — it is to surface the assumptions most likely to cause failure BEFORE planning locks them in. Be direct. Be specific. Do not soften findings.

## Red-Team Question Set

For each of the six `discuss.md` decision dimensions, generate one adversarial challenge:

**Model Challenge (Q1):**
- What happens if the chosen model changes pricing or deprecates mid-project?
- Is there a cheaper alternative model that meets the accuracy threshold?
- Has this model been benchmarked on this specific data domain before?

**Evaluation Challenge (Q2):**
- Is the evaluation dataset representative of production data distribution?
- What is the label error rate on the evaluation set?
- If evaluation uses synthetic data: what guarantees synthetic distribution matches production?

**Accuracy Threshold Challenge (Q3):**
- Is [threshold]% accuracy sufficient given the downstream impact of errors?
- What is the cost of a false positive vs. false negative in this domain?
- Who signed off on [threshold]% as acceptable — developer, business stakeholder, or both?

**Warehouse Challenge (Q4):**
- What is the credit cost of running the full evaluation on [warehouse]?
- Is there a smaller warehouse tier that could run evaluation without hitting query timeout?

**Governance Challenge (Q5):**
- Are all listed governance checks actually enforceable, or are some aspirational?
- What happens if PII review approval takes 2 weeks — does the plan account for that dependency?

**Scope Challenge (Q6):**
- The stated out-of-scope item "[item]" — are there ways the implementation will inadvertently touch it?
- Is there a missing out-of-scope statement? (What is the next most likely scope creep vector?)

## Output Format

```
CocoDiscuss — Red-Team Report
Generated: [ISO8601]

## Challenges

### Model ([chosen model])
[Specific adversarial challenge based on Q1 probes]
Risk Level: [LOW | MEDIUM | HIGH]

### Evaluation ([dataset description])
[Specific adversarial challenge based on Q2 probes]
Risk Level: [LOW | MEDIUM | HIGH]

### Accuracy Threshold ([threshold])
[Specific adversarial challenge based on Q3 probes]
Risk Level: [LOW | MEDIUM | HIGH]

### Warehouse ([warehouse name])
[Specific adversarial challenge based on Q4 probes]
Risk Level: [LOW | MEDIUM | HIGH]

### Governance ([requirements listed])
[Specific adversarial challenge based on Q5 probes]
Risk Level: [LOW | MEDIUM | HIGH]

### Scope ([out-of-scope statement])
[Specific adversarial challenge based on Q6 probes]
Risk Level: [LOW | MEDIUM | HIGH]

## Summary

HIGH risk challenges: [N]
MEDIUM risk challenges: [N]
LOW risk challenges: [N]

[If any HIGH]: Address HIGH-risk challenges before proceeding to $plan. Update discuss.md with revised decisions.
[If no HIGH]: No blocking concerns. Proceed to $plan when ready.

These findings are advisory. Developer decides which to act on.
```

## Write Red-Team Record

Append red-team report to `.cocoplus/lifecycle/discuss-red-team.md` (create if not exists). Use `fs.appendFileSync` semantics — never overwrite prior sessions.

Header format:
```markdown
## Red-Team Session — [ISO8601]
[Full report content]
---
```

## Non-Blocking Completion Signal

After writing the report, output the summary section to the developer. Do NOT block `$plan`. The developer proceeds on their own judgment.

## Exit Criteria

- Red-team report written to `lifecycle/discuss-red-team.md`
- Every discuss.md decision dimension has at least one challenge
- Risk levels assigned for all challenges
- Developer sees summary with HIGH/MEDIUM/LOW counts
- No blocking behavior — advisory output only
