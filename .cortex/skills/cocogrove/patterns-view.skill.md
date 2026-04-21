---
name: "patterns-view"
description: "List all patterns in the CocoGrove pattern library (.cocoplus/grove/patterns/). Optional tag filter: /patterns view [tag]."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocogrove
---

Your objective is to list CocoGrove patterns.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

List all `.md` files in `.cocoplus/grove/patterns/`. If directory is empty:
Output: "No patterns in CocoGrove yet. Use `/patterns promote [finding-id]` to promote a CocoCupper finding."
Then stop.

Parse optional tag filter: `/patterns view [tag]`

For each pattern file, read the YAML frontmatter to extract: name, domain, tags, summary.
If a tag filter is provided, only include patterns whose tags include the filter value.

Output:
```
# CocoGrove Pattern Library

| Pattern | Domain | Tags | Summary |
|---------|--------|------|---------|
[one row per pattern]

Total: [N] patterns. Use pattern names in prompts by referencing .cocoplus/grove/patterns/[name].md
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| List files by filename without reading YAML frontmatter | Filenames alone don't show domain or tags; the table requires frontmatter fields for meaningful output |
| Ignore the tag filter and show all patterns | Filtering is the primary value for large libraries; ignoring it defeats the purpose of the command |

## Exit Criteria

- [ ] A table with columns Pattern, Domain, Tags, Summary is output for each matching pattern file
- [ ] If a tag filter was provided, only patterns whose `tags` include the filter value are shown
- [ ] Total pattern count is shown at the bottom of the output
