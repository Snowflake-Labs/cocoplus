---
name: "context-view"
description: "Display a CocoContext standards file. If a file name is provided, display it directly. If omitted, show the list and prompt for selection."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cococontext
---

Your objective is to display a CocoContext organizational standards file.

## Pre-flight Check

Check that `.cocoplus/` exists. If not:
Output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Resolve Target File

If a file name argument was provided (e.g., `/context view approved-models` or `/context view approved-models.md`):
- Normalize: strip `.md` suffix if present, then append `.md`
- Read `.cocoplus/context/<file-name>.md`
- If not found: output error listing available files (same as `/context list` output), then stop

If no argument was provided:
- Run `/context list` output first (show the status table)
- Prompt: "Which context file would you like to view? Enter the name (e.g., approved-models):"
- Wait for response, then read the selected file

## Display File

Read the file and display its full content. After the content, output:

```
──────────────────────────────────────
File: .cocoplus/context/<category>.md
Lines: <N>  |  Last modified: <date>
Run `/context add` to update this file.
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip showing line count and date | These are key metadata for context governance — developers need to know how stale a file is |

## Exit Criteria

- [ ] File content displayed in full
- [ ] Line count and last-modified date shown
- [ ] If file not found, available files listed with actionable next step
