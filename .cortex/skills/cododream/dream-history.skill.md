---
name: "dream-history"
description: "List past CocoDream distillation sessions from .cocoplus/grove/dream-*.md files, showing timestamp, function count, and lesson candidate count for each session."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cododream
---

Your objective is to display a summary of past CocoDream distillation sessions.

## Pre-flight Check

Check that `.cocoplus/` exists. If not:
Output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Find Dream Files

Scan `.cocoplus/grove/` for all files matching `dream-*.md`. Sort by timestamp, newest first.

If no dream files found:
Output: "No CocoDream sessions found. Run `/dream` to start your first distillation session." Then stop.

## Read Session Metadata

The `n` argument controls how many sessions to display (default: 3 if not provided).

For each of the most recent n dream files, read:
- Timestamp (from filename: `dream-<timestamp>.md`)
- Function count (from the "Analysed: N functions" line in the file)
- Total lesson candidates (from the "Lesson candidates: N" line)
- Promoted count (count of lessons marked as promoted in the file, if tracking exists; otherwise show as unknown)

## Output

```
CocoDream History (last <n> sessions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<timestamp>  <N> functions  <M> candidates  (<K> promoted)
  .cocoplus/grove/dream-<timestamp>.md

<timestamp>  <N> functions  <M> candidates  (<K> promoted)
  .cocoplus/grove/dream-<timestamp>.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To promote a lesson, run: /patterns promote "<lesson title>"
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show all sessions without a default limit | Long lists obscure the most recent and relevant sessions; default n=3 is intentional |

## Exit Criteria

- [ ] Sessions displayed newest-first
- [ ] Each session shows timestamp, function count, candidate count, and file path
- [ ] If no sessions exist, actionable message pointing to `/dream` is shown
