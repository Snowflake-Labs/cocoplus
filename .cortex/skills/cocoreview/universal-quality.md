# CocoReview: Universal Anti-Pattern Baseline

These nine anti-patterns apply before any language-specific guide loads. They apply equally to SQL, Python, and JavaScript.

---

## 1. Parameter Sprawl

Functions exceeding four positional arguments should use a configuration object/record type.

**Detection:** Count positional parameters. If >4 with no config object, flag as `nit` (or `important` if the function is public API).

**Example (SQL):**
```sql
-- Sprawl
CALL process_data(schema, table, start_date, end_date, filter_col, filter_val, output_schema, output_table);

-- Better
CALL process_data({ schema: ..., table: ..., date_range: {...}, output: {...} });
```

---

## 2. Leaky Abstractions

Internal implementation types (ORM objects, HTTP response shapes, raw VARIANT structures) surfacing at API or function boundaries.

**Detection:** Function return types that expose internal storage format rather than a stable interface type.

---

## 3. Stringly-Typed Code

Magic strings replacing typed constants, enums, or union types.

**Detection:** String literals used in conditional branches where a defined set of values is expected.

```sql
-- Stringly-typed
WHERE status = 'active_but_pending_review'

-- Better: use a reference table or documented constant
WHERE status = (SELECT code FROM ref.status_codes WHERE label = 'ACTIVE_PENDING')
```

---

## 4. Nested Conditionals

Ternary chains deeper than one level, or if/else trees deeper than three levels. In SQL: CASE WHEN chains with nested CASE WHEN expressions.

**Detection:** Count nesting depth. Flag `nit` at depth 2, `important` at depth 3+.

---

## 5. Copy-Paste Variants

Near-duplicate blocks differing only in variable names or string literals. A strong signal that a parameterized helper is warranted.

**Detection:** Blocks >5 lines that are structurally identical except for 1–3 values.

---

## 6. No-Op Updates

State setters that write unconditionally without change detection. In SQL: UPDATE statements that set every column regardless of whether the value changed.

```sql
-- No-op risk
UPDATE customer SET name = :name, email = :email, status = :status WHERE id = :id;

-- Better (only update changed fields, or use MERGE with change detection)
MERGE INTO customer USING (SELECT :name AS name, :email AS email) AS src
ON customer.id = :id
WHEN MATCHED AND (customer.name != src.name OR customer.email != src.email)
THEN UPDATE SET name = src.name, email = src.email;
```

---

## 7. TOCTOU Race Conditions

Check-then-act patterns that are not atomic. Particularly dangerous in Snowflake's multi-cluster concurrent environment.

**Detection:** `IF EXISTS THEN INSERT` patterns. Always recommend `MERGE` for Snowflake.

**Severity:** `blocking` for production-facing code — TOCTOU in a data warehouse can produce duplicate rows silently.

```sql
-- TOCTOU (race condition)
IF (SELECT COUNT(*) FROM orders WHERE order_id = :id) = 0 THEN
  INSERT INTO orders VALUES (:id, ...);

-- Correct: MERGE is atomic
MERGE INTO orders USING (SELECT :id AS order_id, ...) AS src
ON orders.order_id = src.order_id
WHEN NOT MATCHED THEN INSERT VALUES (...);
```

---

## 8. Over-Broad Reads

Loading full datasets to work with subsets. Filters belong in the storage layer, not the application layer.

**Detection:** `SELECT *` or full-table reads where a WHERE clause or projection would reduce the result set.

**Snowflake note:** Over-broad reads defeat micro-partition pruning and clustering key alignment. What is a minor inefficiency in a transactional DB is a major cost driver in a data warehouse.

---

## 9. Redundant State

Fields derivable from other fields stored redundantly. Creates consistency risk — the derived field can diverge from its source.

**Detection:** Columns or fields that are always equal to a formula applied to other columns in the same record.

```sql
-- Redundant: total_amount is always quantity * unit_price
ALTER TABLE order_items ADD COLUMN total_amount NUMBER; -- Don't store this

-- Better: derive at query time
SELECT quantity * unit_price AS total_amount FROM order_items;
```
