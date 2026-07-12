---
name: report-export
description: Export CocoPlus report artifacts as markdown, html, or pdf-ready status outputs. Usage: $report export <path> --format markdown|html|pdf.
version: "1.0.0"
author: CocoPlus
tags:
  - cocoplus
  - reporting
  - export
user-invocable: true
blocking: false
---

Export a CocoPlus report artifact using the shared deterministic exporter.

## Command

```text
$report export <path> --format markdown|html|pdf
```

Run:

```text
node scripts/report-export.js --source <path> --format <format> --out-dir .cocoplus/exports
```

Supported source artifacts include CocoOps, CocoTrace, CocoAudit, CocoReview, and CocoSketch reports.

Markdown and HTML are generated locally. PDF returns `renderer_unavailable` until an external renderer profile is configured; never create a fake PDF.

## Exit Criteria

- Source file exists.
- Markdown and HTML produce concrete files.
- PDF requests return an explicit renderer status.
