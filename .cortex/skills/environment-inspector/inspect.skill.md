---
name: "inspect"
description: "Scan the Snowflake environment: schemas, tables, views, stored procedures, Cortex endpoints, and user permissions. Writes timestamped snapshot to .cocoplus/snapshots/. Use $inspect --schema <name> for a schema-specific scan."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - environment-inspector
---

Your objective is to perform a Snowflake environment scan and write a timestamped snapshot.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Parse arguments:
- `--schema <name>`: scan only that schema
- `--full`: extended metadata (column-level details, query history)
- No arguments: standard scan

## Scan Snowflake Environment

Execute the following via SnowflakeSqlExecute (skip any query that fails — log failure, continue scan). For every failure, capture:
- Query label
- Exact SQL attempted
- Snowflake error text or tool error
- Likely cause when it can be inferred from the error text (permission, missing schema, unsupported account feature, connection issue)
- Whether the failure affected final counts

**1. Schemas:**
```sql
SHOW SCHEMAS;
```

**2. Tables (per accessible schema):**
```sql
SHOW TABLES IN SCHEMA [schema_name];
```

**3. Views:**
```sql
SHOW VIEWS IN SCHEMA [schema_name];
```

**4. Stored Procedures:**
```sql
SHOW PROCEDURES IN SCHEMA [schema_name];
```

**5. User Grants:**
```sql
SHOW GRANTS TO USER CURRENT_USER();
```

**6. Cortex Functions (if --full):**
```sql
SHOW FUNCTIONS LIKE '%CORTEX%';
```

## Write Snapshot

Generate timestamp: `YYYYMMDD-HHMMSS`
Write `.cocoplus/snapshots/[timestamp]-env.md`:

```markdown
# Environment Snapshot

**Taken:** [ISO 8601 timestamp]
**Scan Type:** [standard / schema-specific / full]
**Schema Filter:** [schema name or "all"]

## Schemas
[list of schemas]

## Tables
[table names grouped by schema, with row count if available]

## Views
[view names grouped by schema]

## Stored Procedures
[procedure names grouped by schema]

## User Permissions
[grant summary]

## Cortex Functions (if --full)
[Cortex function names]

## Diagnostics
**Scan Duration:** [seconds]
**Objects Counted:** [N schemas, N tables, N views, N procedures]
**Failed Queries:** [N]

[For each failure: query label, SQL, error, likely cause, impact]

## Scan Notes
[any errors encountered — which queries failed and why]
```

If the inspector is invoked by Assist Mode or another background workflow, never fail the parent workflow solely because one inspector query failed. Write the diagnostics into the snapshot and report the snapshot path.

Output: "Environment scan complete. Snapshot written to `.cocoplus/snapshots/[timestamp]-env.md`. Found: [N] schemas, [N] tables, [N] views, [N] procedures. Diagnostics: [N] failed queries."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Stop the entire scan when one SQL query fails | The scan must be fault-tolerant; skipping a failed query and logging the error is correct — aborting wastes all prior results |
| Overwrite the latest snapshot instead of creating a timestamped one | Timestamped snapshots are historical records; overwriting loses environment change history |
| Skip the `## Scan Notes` section when there are no errors | An explicit "No errors" note is more trustworthy than a missing section that could mean the section was forgotten |
| Report "scan failed" without the query and error text | Environment failures are usually permission or object-scope issues; diagnostics need enough detail to fix them |

## Exit Criteria

- [ ] `.cocoplus/snapshots/[timestamp]-env.md` exists with Schemas, Tables, Views, Stored Procedures, and User Permissions sections
- [ ] `## Diagnostics` section exists with scan duration, object counts, failed query count, and exact failed SQL/error text when applicable
- [ ] `## Scan Notes` section exists (even if it says "No errors encountered")
- [ ] Output reports counts of schemas, tables, views, and procedures found
