---
name: wisdom-search
description: CocoWisdom search — full-text search across rejection reasons. Invoked via $wisdom search "<pattern>". Returns matching records with excerpts.
version: "1.0.0"
author: CocoPlus
tags:
  - cocowisdom
  - institutional-memory
user-invocable: true
blocking: false
---

## Objective

Search CocoWisdom rejection records for a text pattern.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Parse Query

The developer invoked `$wisdom search "<pattern>"`. If no pattern provided, ask: "What pattern do you want to search for? Example: $wisdom search \"NULL handling\""

## Step 2 — Read Records

Read `.cocoplus/wisdom/rejections.jsonl`. If absent or empty, output: "No rejection records to search." Then stop.

## Step 3 — Search

Perform case-insensitive substring match of `<pattern>` against:
- `rejection_reason` field
- `dimension` field
- `gate` field

Collect all matching records. Sort by timestamp descending.

## Step 4 — Output Results

```
CocoWisdom Search: "<pattern>"
Found <n> matching records

rej-0042 | 2026-05-21 | sentinel | B-correctness
  "...NULL input to COALESCE not handled in aggregation context — **NULL handling** gap at line 47..."

rej-0038 | 2026-05-10 | secondeye | acceptance_criteria
  "...acceptance threshold lacks numerical bound — **null** edge case not specified in criteria..."
```

If no matches: "No records match '<pattern>'."

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Case-sensitive search | Rejection reasons are user-written text — case variance is common and must not hide matches |
| Search only rejection_reason field | Gate and dimension are key search fields for pattern discovery — exclude them and miss most value |

## Exit Criteria

- Case-insensitive match works
- Results show record ID, date, gate, dimension, and excerpt with match context
- Empty query is caught and user is prompted
