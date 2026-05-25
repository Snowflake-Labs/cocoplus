# CocoReview: Security Review Guide

OWASP-aligned five-tier security review guide for Snowflake SQL and data pipeline artifacts.

## Security Severity Scale

| Tier | Meaning | Merge Policy |
|------|---------|-------------|
| Critical | Immediate exploitation possible; data breach risk | Block merge — fix immediately |
| High | Significant vulnerability requiring specific conditions | Block merge — fix before release |
| Medium | Defense-in-depth concern | Should fix — can merge with tracking |
| Low | Best-practice violation | Non-blocking |
| Info | Optional enhancement | Non-blocking |

In Snowflake deployments handling PII or regulated data, **Critical** triggers for:
- Hardcoded credentials in SQL (passwords, API keys, tokens)
- Missing data masking policies on PII-classified columns
- Unprotected references to regulated column sets
- Direct SELECT from PII tables without row-level security or masking policies applied

The blast radius in a data warehouse is orders of magnitude larger than a typical application security issue — one misconfigured query can expose millions of records.

---

## SQL Injection (Critical if exploitable)

**Detect:** EXECUTE IMMEDIATE with string concatenation from user-supplied inputs.

```sql
-- Vulnerable
EXECUTE IMMEDIATE 'SELECT * FROM ' || :table_name;

-- Safe
EXECUTE IMMEDIATE 'SELECT * FROM IDENTIFIER(:table_name)' USING (table_name => :table_name);
```

**Note:** `IDENTIFIER()` binding in Snowflake prevents identifier injection. Always use it for dynamic table/column references.

---

## Credential Exposure (Critical)

Hardcoded credentials, passwords, API keys, or tokens in SQL files or stored procedures. Use Snowflake Secrets or external key management — never embed credentials inline.

---

## PII and Regulated Data (Critical to Medium)

- Columns classified as PII accessed without masking policy: **Critical**
- Columns in regulated schemas (HIPAA, GDPR, CCPA) accessed without appropriate access controls: **High**
- PII written to non-masked output tables: **Critical**

---

## Over-Privileged Access (High to Medium)

Functions or procedures that request ACCOUNTADMIN or SYSADMIN roles when a lower-privilege role would suffice: **High**.
Functions that SELECT * from tables when only specific columns are needed: **Medium**.

---

## Row-Level Security Gaps (High)

Row Access Policies (RAPs) applied at the table level but bypassed by views that `SELECT *` without reapplying the policy context. Always verify RAPs are respected in view definitions.

---

## Error Message Information Disclosure (Medium)

Error messages that reveal schema names, table structures, column names, or data values to callers. Snowflake stored procedures that propagate raw SQL error messages to the caller should sanitize them first.

---

## Privilege Escalation in Dynamic SQL (High)

Stored procedures with EXECUTE AS OWNER that run dynamic SQL derived from caller-supplied input can escalate privilege from the caller's role to the owner's role.

```sql
-- Risk: EXECUTE AS OWNER + dynamic SQL from input
CREATE OR REPLACE PROCEDURE get_data(table_name STRING)
  EXECUTE AS OWNER  -- runs with owner privileges
AS
BEGIN
  EXECUTE IMMEDIATE 'SELECT * FROM ' || table_name; -- injection = privilege escalation
END;
```

---

## Data Masking Policy Bypass (Critical)

Views or queries that use column-level masking policies but access the underlying table with a role that has the `APPLY MASKING POLICY` privilege can bypass masking. Audit all roles with masking policy admin privileges.
