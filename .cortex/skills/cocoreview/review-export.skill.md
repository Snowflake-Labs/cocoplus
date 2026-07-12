---
name: review-export
description: Export CocoReview reports as markdown, html, or pdf-ready status artifacts. Usage: $review export markdown|html|pdf [report-path].
version: "1.0.0"
author: CocoPlus
tags:
  - cocoreview
  - export
user-invocable: true
blocking: false
---

Your objective is to export a CocoReview report for stakeholders outside git.

## Command Forms

- `$review export markdown [report-path]`
- `$review export html [report-path]`
- `$review export pdf [report-path]`

If `report-path` is omitted, use the newest `.cocoplus/review/cocoreview-*.md`.

Run:

```text
node scripts/report-export.js --source <report-path> --format <markdown|html|pdf> --out-dir .cocoplus/review/exports
```

Markdown and HTML exports are generated locally. PDF export reports `renderer_unavailable` unless a future renderer profile is configured; do not fake a PDF by renaming another format.

## Exit Criteria

- The source review report exists before export.
- Markdown and HTML exports write files under `.cocoplus/review/exports/`.
- PDF requests return a clear renderer-unavailable result rather than failing silently.
