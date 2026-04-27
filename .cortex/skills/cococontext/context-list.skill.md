---
name: "context-list"
description: "List all six CocoContext standard files with their status (line count and last-modified date). Shows which have been created and which are pending."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cococontext
---

Your objective is to display a status table of all CocoContext organizational standards files.

## Pre-flight Check

Check that `.cocoplus/` exists. If not:
Output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Read File Status

For each of the six standard context files, check `.cocoplus/context/<file>.md`:
- If exists: read line count and last-modified date
- If absent: mark as "not created"

The six files:
1. `approved-models.md`
2. `quality-thresholds.md`
3. `pii-policy.md`
4. `warehouse-policy.md`
5. `naming-conventions.md`
6. `governance-gates.md`

Also check for any additional `.md` files in `.cocoplus/context/` (custom entries added by the team) and include them in the table.

## Output

```
CocoContext Standards
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Context File             Lines   Last Modified
──────────────────────   ─────   ──────────────
approved-models.md         47    2026-04-20
quality-thresholds.md      31    2026-04-15
pii-policy.md              88    2026-04-01
warehouse-policy.md         —    not created
naming-conventions.md      52    2026-04-01
governance-gates.md         —    not created
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run `/context add` to create or update a standards file.
Run `/context view <name>` to read a file in full.
```

Replace example values with actual data from the filesystem.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Only show files that exist | Showing "not created" entries makes gaps visible — the point of the list is governance coverage awareness |

## Exit Criteria

- [ ] All six standard file slots shown regardless of whether they exist
- [ ] Existing files show accurate line count and last-modified date
- [ ] Missing files shown as "not created"
- [ ] Footer links to `/context add` and `/context view`
