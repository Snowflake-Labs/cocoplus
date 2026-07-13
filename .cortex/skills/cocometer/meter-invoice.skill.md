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
node scripts/invoice-generator.js --input <chargeback-output.json> --out-dir .cocoplus/meter/invoices
```

Never fabricate PDF output. If a PDF is requested, report renderer availability through the shared report-export path.
