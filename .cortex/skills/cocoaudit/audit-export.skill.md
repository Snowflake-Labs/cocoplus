---
name: audit-export
description: Export the full CocoAudit trail as a stakeholder-ready compliance document
version: "1.0.0"
author: sgsshankar
tags: [audit, compliance, export]
commands: ["$audit export"]
user-invocable: true
blocking: true
---

# $audit export

Export the complete CocoAudit trail as a uniquely timestamped compliance document. For stakeholder packaging, route Markdown/HTML/PDF formats through the shared exporter.

## Steps

1. Read `lifecycle/audit.md` (append-only source of truth)
2. Count total event blocks (lines starting with `## [`)
3. Generate timestamp: `YYYY-MM-DDTHH-MM-SSZ` (hyphens replace colons for filesystem safety)
4. Write `.cocoplus/audit-export-[timestamp].md` with header + full verbatim trail
5. If a format was requested, run `node scripts/report-export.js --source <exported-md> --format <markdown|html|pdf> --out-dir .cocoplus/audit-exports`
6. Output path, event count, and export renderer status to developer
7. Never overwrite prior export files — each invocation is uniquely timestamped (idempotent per export)

## Exit Criteria

- Export file written to `.cocoplus/audit-export-[timestamp].md`
- Developer sees path and total event count
- No prior export file overwritten
- HTML export is available through `report-export.js`; PDF reports renderer status if no renderer is configured

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Reuse same filename on same-day exports | Timestamp includes time — each export is unique and non-destructive |
| Read audit.md selectively | Source of truth is verbatim — export must include all events, not filtered view |
