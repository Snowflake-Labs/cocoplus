# CocoReview: Architecture Review Guide

SOLID principles + Clean Architecture layer validation for data pipeline and Snowflake artifacts.

---

## Layer Validation (Clean Architecture for Data Pipelines)

Data pipelines have a natural layering: **Staging → Intermediate → Mart → ML/Reporting**. Changes should respect this layer hierarchy:

| Layer | Responsibility | What should NOT be here |
|-------|---------------|------------------------|
| Staging (raw) | Land data as-is from sources | Business logic, transformations, aggregations |
| Intermediate | Clean, normalize, standardize | Business metric definitions, user-facing naming |
| Mart | Business-defined dimensions and facts | Raw source fields, staging artifacts |
| ML/Reporting | Aggregated views for consumers | Intermediate cleaning logic |

**Detection:** Business metric calculations in staging layer, or raw source joins in mart layer. Flag as `important`.

---

## Single Responsibility (SOLID-S)

Each SQL object (procedure, view, function) should do one clearly nameable thing. If you cannot name what it does in 5 words or fewer, it probably does too much.

**Detection:** Procedures >200 lines that mix concerns (data loading + transformation + notification + logging in one unit). Flag as `important`.

---

## Open/Closed Principle (SOLID-O)

Pipeline code should be open for extension (new data sources, new metrics) without requiring modification of existing stable units. 

**Detection:** Hardcoded source lists in JOIN conditions that would require modifying the procedure to add a new source. Suggest parameterization or a lookup table approach.

---

## Dependency Inversion (SOLID-D)

Higher-level pipeline stages should not depend on lower-level implementation details. Marts should depend on intermediate model interfaces, not on raw staging table structures.

**Detection:** Mart views that directly reference staging tables (`raw_*`, `stg_*` prefix schemas). Flag as `important` — adds coupling between mart and source changes.

---

## Pipeline Idempotency

Data pipeline stages should produce the same output when re-run on the same input. Non-idempotent stages (those that append without deduplication, or insert without checking existence) are architectural liabilities.

**Detection:** INSERT statements without MERGE or deduplication logic in incremental pipeline stages. Flag as `important` or `blocking` for production pipelines.

---

## Observability

Production pipeline stages should log their execution: rows processed, duration, any error counts. Stages with no logging are opaque to operators.

**Detection:** Procedures that modify data but write nothing to a log table or `QUERY_HISTORY`. Flag as `nit` for development code, `important` for production pipeline code.

---

## Determinism and Reproducibility

ML training pipelines and metric calculations should produce deterministic outputs from identical inputs. Non-determinism (sampling without seeds, timestamp-dependent logic without parameterized dates) makes debugging and replication impossible.

**Detection:** `SAMPLE()` without fixed seed, `CURRENT_DATE` in a training pipeline without a configurable date parameter. Flag as `important` for ML artifacts.
