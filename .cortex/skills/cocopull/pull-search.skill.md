---
name: pull-search
description: CocoPull session archive search — full-text search across past sessions. Handles $pull search "<query>" with --since and --feature filters, and $pull index rebuild.
version: "1.0.0"
author: CocoPlus
tags:
  - cocopull
  - context-distillation
  - session-search
user-invocable: true
blocking: false
---

## Objective

Search the CocoPull session archive for relevant past sessions.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Handling `$pull index rebuild`

If the developer invoked `$pull index rebuild`:
1. Run `node .cortex/scripts/session-indexer.js --rebuild`
2. Output: "CocoPull index rebuilt. <N> session records indexed."
3. Stop.

## Handling `$pull search "<query>"`

### Step 1 — Parse Flags

Extract:
- `<query>` — required search string (in quotes)
- `--since <date>` — optional date filter (YYYY-MM-DD)
- `--feature <name>` — optional feature filter (e.g., `cocoharvest`, `safety-gate`)

If no query provided, ask: "What do you want to search for? Example: `$pull search \"schema migration\"`"

### Step 2 — Read Index

Read `.cocoplus/index/sessions.jsonl`. If absent or empty, output:
"No session archive found. Sessions are indexed automatically at session end. If this is a new project, run `$pull index rebuild` after completing some sessions." Then stop.

### Step 3 — Search

Case-insensitive substring match of query against:
- `summary` field
- `features_used` array values
- `archetype` field

Apply `--since` filter (timestamp >= date) and `--feature` filter (features_used contains value) if provided.

Sort results by timestamp descending.

### Step 4 — Output Results

```
CocoPull Search: "<query>"
Found <n> matching sessions

────────────────────────────────────────────────────────────
Session ID    Date        Archetype     Duration   Features
────────────────────────────────────────────────────────────
sess-7e8fa   2026-05-21  deep-build    94 min     cocoharvest, cocoflow, secondeye
sess-6c8d1   2026-05-18  review-cycle  42 min     sentinel, cocowisdom

Excerpt from sess-7e8fa:
  "...decomposed schema migration into 3 parallel CocoHarvest stages, resolved
   NULL handling concern in sentinel Dimension B..."
────────────────────────────────────────────────────────────
```

If no matches: "No sessions match '<query>'. Try a broader search term or `--since` a wider date range."

## Exit Criteria

- Index rebuild calls `session-indexer.js --rebuild` and reports count
- Search matches on summary, features, and archetype
- Filters apply correctly (AND logic between --since and --feature)
- Results show session ID, date, archetype, duration, features, and summary excerpt
