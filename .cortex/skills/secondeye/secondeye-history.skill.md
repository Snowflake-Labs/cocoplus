---
name: "secondeye-history"
description: "List all SecondEye review reports for this project. Shows review date, artifact reviewed, finding counts, and acknowledgment status."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - secondeye
---

Your objective is to list all SecondEye review history.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Find all files in `.cocoplus/lifecycle/` matching `secondeye-*.md`.
If none found: output "No SecondEye reviews yet. Run `/secondeye` to perform a review." Then stop.

For each file, read YAML frontmatter: secondeye_id, artifact, generated_at, critical_open, acknowledged.

Count findings per severity in each report by counting `## Critical`, `## Advisory`, `## Observations` section headings.

Output:

```
# SecondEye Review History

| Report ID | Artifact | Date | Critical | Advisory | Obs | Acknowledged |
|-----------|----------|------|----------|----------|-----|--------------|
[one row per report]

Total reviews: [N]
Unacknowledged critical findings: [N]
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show only latest report | Hides trend and unresolved critical history |
| Omit acknowledgment status column | Developers cannot quickly assess build gate risk |
| Skip empty-state guidance | Users do not know the next action when no reports exist |

## Exit Criteria

- [ ] History scan includes all `.cocoplus/lifecycle/secondeye-*.md` files
- [ ] Output table shows Report ID, Artifact, Date, Critical, Advisory, Observations, and Acknowledged status for each report
- [ ] Footer reports total review count and unacknowledged critical count
- [ ] If no reports exist, a clear guidance message directs the developer to run `/secondeye`
