# CocoReview: Snowflake SQL Review Guide

Supplement to `universal-quality.md`. Apply after universal anti-patterns.

---

## Snowflake-Specific Patterns

### Clustering Key Alignment

Check if WHERE clause filters on the table's cluster key. Queries that do not filter on the cluster key cause full micro-partition scans.

**How to identify:** Look for `CLUSTER BY` in table DDL (or check `SYSTEM$CLUSTERING_INFORMATION`). If a WHERE clause filters on non-clustered columns over a large table, flag as `important`.

---

### Join Order

The right-side table in a JOIN is the build side (smaller table). Verify the largest table is on the LEFT side of every JOIN. Incorrect join order causes memory pressure and spills to storage.

**Detection:** JOINs where the right-side table is clearly larger (e.g., fact table on right, dimension table on left should be reversed).

---

### Aggregation Caching

Aggregations on deterministic expressions are eligible for result-set caching. Non-deterministic functions (RANDOM(), CURRENT_TIMESTAMP() in GROUP BY) defeat caching.

**Detection:** CURRENT_TIMESTAMP(), SYSDATE(), RANDOM() appearing in GROUP BY or SELECT of an aggregation query.

---

### Cortex Function Invocation Patterns

`CORTEX.COMPLETE`, `CORTEX.EMBED`, `AI_CLASSIFY`, `AI_EXTRACT` should be invoked in batch mode where possible. Row-by-row invocation in a LATERAL JOIN is 10–100× more expensive than batch.

**Detection:** Cortex functions called inside a LATERAL JOIN without a pre-batching CTE. Flag as `important` or `blocking` depending on expected row count.

```sql
-- Expensive: row-by-row
SELECT id, SNOWFLAKE.CORTEX.COMPLETE('llama3-70b', prompt) FROM prompts; -- OK for small sets

-- Batch approach: use SNOWFLAKE.CORTEX.COMPLETE with array input where available
```

---

### VARIANT/OBJECT Extractions

Paths into VARIANT or OBJECT that do not exist return NULL silently — not an error. All VARIANT path extractions should be guarded with coalesce or TRY_CAST.

```sql
-- Risky
SELECT record:user:email::STRING FROM events;

-- Safe
SELECT COALESCE(record:user:email::STRING, 'unknown') FROM events;
```

---

### FLATTEN Semantics

`FLATTEN` with `OUTER:FALSE` (default) drops rows where the array is empty or NULL. `OUTER:TRUE` preserves the parent row. Incorrect mode produces silent row loss.

**Detection:** FLATTEN calls without explicit OUTER specification on nullable array columns.

---

### Window Function Frame Specifications

`ROWS BETWEEN` and `RANGE BETWEEN` have different semantics with duplicate values. `RANGE BETWEEN` is almost always wrong for financial calculations with duplicate timestamps.

---

### Temporary Table Lifecycle

Temp tables created in a stored procedure must be explicitly dropped or will persist for the session lifetime, consuming storage and potentially conflicting in concurrent executions.

**Detection:** `CREATE TEMPORARY TABLE` or `CREATE TEMP TABLE` without a corresponding `DROP TABLE IF EXISTS` at procedure end.

---

### Error Handling in Stored Procedures

Snowflake Scripting procedures must use `EXCEPTION WHEN OTHER THEN` for general error catching. Missing exception blocks leave procedures in a half-executed state on failure.

```sql
BEGIN
  -- ... procedure logic ...
EXCEPTION
  WHEN OTHER THEN
    RAISE; -- or handle + log
END;
```
