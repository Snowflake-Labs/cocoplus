---
name: "meter-invoice"
description: "Generate CocoMeter chargeback invoices. Usage: $meter invoice"
version: "1.2.0"
author: "CocoPlus"
tags: [cocoplus, cocometer, chargeback, invoice]
user-invocable: true
---

# CocoMeter Invoice

Use this skill for `$meter invoice`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.

Generate invoice-ready HTML and CSV artifacts from refreshed chargeback facts. Each invoice must include token credits, warehouse credits when included, total credits, amount, cost center, and unmapped status.

For local fixture validation, run:

```text
invoke cocometer/invoice-generator --input <chargeback-output.json> --out-dir .cocoplus/meter/invoices
```

Never fabricate PDF output. If a PDF is requested, report renderer availability through the shared report-export path.

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
