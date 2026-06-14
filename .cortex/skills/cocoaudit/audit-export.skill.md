---
name: audit-export
description: Export the full CocoAudit trail as a stakeholder-ready compliance document
version: "1.0.0"
author: sgsshankar
tags: [audit, compliance, export]
commands: ["$audit export"]
user-invocable: true
---

# Audit Export

Namespace router — dispatches to `cocoaudit.skill.md` export workflow.

**Steps:**
1. Read `lifecycle/audit.md` (append-only source of truth)
2. Count total event blocks (lines starting with `## [`)
3. Generate timestamp: `YYYY-MM-DDTHH-MM-SSZ` (hyphens replace colons)
4. Write `.cocoplus/audit-export-[timestamp].md` with header + full verbatim trail
5. Output path and event count
6. Never overwrite prior export files — each invocation is uniquely timestamped
