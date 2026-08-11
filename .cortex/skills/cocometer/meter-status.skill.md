---
name: "meter-status"
description: "CocoMeter FinOps onboarding status. Usage: $meter status"
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocometer, chargeback, finops]
user-invocable: true
---

# CocoMeter Status

Use this skill for `$meter status`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Evaluate the FinOps onboarding checklist exposed by the CocoMeter chargeback layer:

- `schemaReady`
- `factHasData`
- `costCentersMapped`
- `unmappedUsers`
- `spansPresent`

For local fixture validation, run:

```text
invoke cocometer/chargeback-refresh --input <fixture.json>
```

Render the `onboarding` object as a pass/fail table. If `spansPresent` is false, report it as progressive rollout guidance, not a fatal error.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |

## Exit Criteria

- [ ] Command behavior matches the owning feature contract.
- [ ] Required reads, writes, and user-visible outputs are described.
- [ ] Safety, governance, and artifact constraints are preserved.
- [ ] Missing state produces a clear, non-destructive result.
