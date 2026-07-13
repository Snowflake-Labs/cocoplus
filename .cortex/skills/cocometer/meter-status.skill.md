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
node scripts/chargeback-refresh.js --input <fixture.json>
```

Render the `onboarding` object as a pass/fail table. If `spansPresent` is false, report it as progressive rollout guidance, not a fatal error.
