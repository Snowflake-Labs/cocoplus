---
name: "doc-run"
description: "Generate documentation for Snowflake objects. Runs SQL to extract column metadata, creates a data dictionary, and builds a lineage diagram. Usage: /doc run [schema.table] or /doc run (for all accessible tables)."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - doc-engine
---

Your objective is to generate documentation for Snowflake objects.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Parse argument: `/doc run [schema.table]`
If no argument: document all accessible tables (use SHOW TABLES to enumerate).

## For Each Table

Execute:

```sql
DESCRIBE TABLE [schema].[table];
```

Capture: column name, data type, nullable, default, comment.

Then execute for lineage:
```sql
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.OBJECT_DEPENDENCIES
WHERE REFERENCED_OBJECT_NAME = '[table]'
   OR REFERENCING_OBJECT_NAME = '[table]'
LIMIT 100;
```

## Generate Data Dictionary

Write `.cocoplus/docs/[schema]-[table]-datadict.md`:

```markdown
# Data Dictionary: [schema].[table]

**Generated:** [ISO 8601 timestamp]
**Schema:** [schema]
**Table:** [table]

## Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
[one row per column — use existing comment as description, or "(no description)" if empty]

## Lineage
**Upstream (depends on):**
[list of tables this table reads from]

**Downstream (consumed by):**
[list of tables/views/procedures that reference this table]
```

Write `.cocoplus/docs/schema-lineage.md` with a summary of all lineage relationships.

Output: "Documentation generated. [N] tables documented. Files written to .cocoplus/docs/."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Leave column Description blank instead of using "(no description)" | Blank descriptions make the data dictionary look incomplete and fail table formatting |
| Skip the lineage query if it returns no rows | An empty lineage section is valid and informative — it means the table has no upstream/downstream dependencies |
| Document only the first 10 tables when scanning all | Partial documentation is worse than none because it creates a false sense of completeness |

## Exit Criteria

- [ ] A `.cocoplus/docs/[schema]-[table]-datadict.md` file exists for each documented table with a `## Columns` table
- [ ] Each data dictionary has a `## Lineage` section (even if empty, labeled "No upstream/downstream dependencies found")
- [ ] `.cocoplus/docs/schema-lineage.md` exists with a summary of all lineage relationships
- [ ] Output reports the count of tables documented
