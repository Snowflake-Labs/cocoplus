---
name: wisdom-list
description: CocoWisdom list — browses rejection records with optional filters for gate, date range, and dimension. Invoked via $wisdom list [--gate <gate>] [--since <date>] [--dimension <dim>].
version: "1.0.0"
author: CocoPlus
tags:
  - cocowisdom
  - institutional-memory
user-invocable: true
blocking: false
---

## Objective

List CocoWisdom rejection records with optional filters.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Parse Flags

Parse the command for optional filters:
- `--gate <gate>`: filter to records where `gate` equals `secondeye`, `sentinel`, or `da_critic`
- `--since <date>`: filter to records where `timestamp` >= `<date>` (accept YYYY-MM-DD format)
- `--dimension <dim>`: filter to records where `dimension` equals `<dim>`

## Step 2 — Read and Filter Records

Read `.cocoplus/wisdom/rejections.jsonl`. If absent or empty, output: "No rejection records found." Then stop.

Parse all JSONL lines. Apply filters. Sort by timestamp descending (most recent first).

## Step 3 — Output Table

Display up to 25 records per page:

```
CocoWisdom Rejection Records
Filters: <active filters or "none">
Showing <n> of <total> records

ID         Date        Gate        Dimension              Reason (first 80 chars)
─────────────────────────────────────────────────────────────────────────────────
rej-0042   2026-05-21  sentinel    B-correctness          NULL input to COALESCE not handled in agg...
rej-0041   2026-05-18  secondeye   acceptance_criteria    Accuracy threshold stated as 'accurate' — n...
rej-0040   2026-05-15  sentinel    A1-security            EXECUTE IMMEDIATE uses string concatenation...
```

If more than 25 records, show: "Showing 25 of <total>. Use `--since` or other filters to narrow results."

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Use OR logic when multiple filters provided | Filters narrow the search — OR logic defeats the purpose of combining filters |
| Skip truncation when reason is long | Long reasons flood the terminal — always truncate at 80 chars with "..." |

## Exit Criteria

- Filters work correctly and combine (AND logic)
- Output shows record ID, date, gate, dimension, truncated reason
- Empty results show "No records match the specified filters."
