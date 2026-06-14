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

Export the complete CocoAudit trail as a uniquely timestamped compliance document.

## Steps

1. Read `lifecycle/audit.md` (append-only source of truth)
2. Count total event blocks (lines starting with `## [`)
3. Generate timestamp: `YYYY-MM-DDTHH-MM-SSZ` (hyphens replace colons for filesystem safety)
4. Write `.cocoplus/audit-export-[timestamp].md` with header + full verbatim trail
5. Output path and event count to developer
6. Never overwrite prior export files — each invocation is uniquely timestamped (idempotent per export)

## Exit Criteria

- Export file written to `.cocoplus/audit-export-[timestamp].md`
- Developer sees path and total event count
- No prior export file overwritten

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Reuse same filename on same-day exports | Timestamp includes time — each export is unique and non-destructive |
| Read audit.md selectively | Source of truth is verbatim — export must include all events, not filtered view |
