# SQL — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.sql` files, raw SQL in code (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), `db.query(`, `connection.execute(`, `cursor.execute(`, `rawQuery`, migrations

---

## Security

- **[CRITICAL]** SQL query built with string concatenation/interpolation of user input → SQL injection. Always use parameterized queries / prepared statements.
- **[CRITICAL]** `UPDATE` or `DELETE` without `WHERE` clause → wipes entire table. Require explicit confirmation.
- **[HIGH]** `SELECT *` in application queries → over-fetches sensitive columns (passwords, tokens, PII).
- **[HIGH]** User-controlled `ORDER BY` column name without allowlist → SQL injection via column name.
- **[HIGH]** Missing `LIMIT` on user-controlled queries → full table dump, DoS.
- **[HIGH]** Stored procedure using `EXEC` / `sp_executesql` with user input → injection inside stored proc.
- **[HIGH]** Database user has DDL rights for application account → schema destruction on compromise. Use least-privilege role.
- **[HIGH]** Sensitive columns (SSN, card numbers, passwords) stored in plaintext → encrypt at rest or hash.
- **[MEDIUM]** Dynamic column/table name from user input even if quoted → SQL injection via quoting bypass.
- **[MEDIUM]** Excessive permissions granted to `PUBLIC` role → all users can access schema.
- **[MEDIUM]** Database connection string logged in application logs → credentials in log files.
- **[LOW]** DDL statements in application code path (not migrations) → accidental schema mutation.

---

## Performance

- **[CRITICAL]** N+1 query — SELECT inside loop for each row of outer query. Use JOIN or batch fetch.
- **[HIGH]** Missing index on `WHERE`, `JOIN ON`, `ORDER BY`, `GROUP BY` columns for frequent queries.
- **[HIGH]** Function applied to indexed column in WHERE: `WHERE LOWER(email) = ?` → index unused, full scan.
- **[HIGH]** Implicit type coercion in JOIN/WHERE (INT vs VARCHAR) → index skipped.
- **[HIGH]** `SELECT` without `LIMIT` on large table → unbounded result set, OOM.
- **[HIGH]** Correlated subquery in WHERE re-executed per row → O(n²). Rewrite as JOIN or CTE.
- **[HIGH]** `OFFSET` pagination on large tables → full scan up to offset. Use cursor/keyset pagination.
- **[MEDIUM]** `ORDER BY` on non-indexed column in large table → filesort.
- **[MEDIUM]** `COUNT(*)` on large table without suitable index → full scan.
- **[MEDIUM]** Missing `EXPLAIN ANALYZE` before shipping complex queries.
- **[MEDIUM]** Composite index column order wrong → index not used for partial prefix queries.
- **[MEDIUM]** `DISTINCT` papering over duplicates from bad JOIN → fix the JOIN cardinality.
- **[LOW]** Index on low-cardinality column (boolean, status with 3 values) → often ignored by optimizer.
- **[LOW]** Missing partial index for common filtered subset → full index scanned unnecessarily.

---

## Architecture

- **[HIGH]** Multi-step mutations without transaction → partial failure leaves inconsistent state.
- **[HIGH]** Missing foreign key constraints → orphaned records, broken referential integrity.
- **[HIGH]** Business logic in stored procedures/triggers → hard to version, test, deploy.
- **[HIGH]** Schema changes (ADD/DROP COLUMN) mixed with data migrations in same script → risky rollback.
- **[MEDIUM]** No rollback strategy for destructive migrations (DROP TABLE, TRUNCATE) → data loss on failed deploy.
- **[MEDIUM]** Denormalized data without documented justification → update anomalies accumulate.
- **[MEDIUM]** Missing soft-delete pattern for business-critical records → hard DELETE destroys audit trail.
- **[MEDIUM]** Long transactions locking rows → blocking other writers for extended time.
- **[MEDIUM]** Missing `created_at` / `updated_at` / `deleted_at` timestamps → no audit trail.
- **[LOW]** UUID vs sequential ID not chosen based on write patterns → UUID index fragmentation.
- **[LOW]** Not using database schema versioning tool (Flyway, Liquibase, Alembic).

---

## Code Quality

- **[HIGH]** Missing `NOT NULL` constraints on columns that should always have values.
- **[HIGH]** Missing `UNIQUE` constraint on columns requiring uniqueness (email, username) → duplicates possible despite app-level validation.
- **[MEDIUM]** `TIMESTAMP` without timezone (`TIMESTAMP` vs `TIMESTAMPTZ`) → timezone bugs for international users.
- **[MEDIUM]** `VARCHAR` without length limit or with unreasonably large limit → storage/performance implications.
- **[MEDIUM]** Inconsistent naming conventions (camelCase in app, snake_case in DB) → mapping confusion.
- **[MEDIUM]** Missing `CHECK` constraints for domain validation (positive amounts, valid status values).
- **[MEDIUM]** `ENUM` type not used where values are constrained → free-text with no DB-level validation.
- **[LOW]** SQL keywords not uppercase → inconsistent style.
- **[LOW]** Missing comments on complex queries (window functions, CTEs with non-obvious logic).

---

## Common Bugs & Pitfalls

- **[HIGH]** `NULL` compared with `=` instead of `IS NULL` → condition always false (`NULL = NULL` is `NULL` in SQL).
- **[HIGH]** Off-by-one in OFFSET pagination: `OFFSET (page-1) * limit` → page 0 and 1 return same rows.
- **[HIGH]** Transaction not committed → changes visible in session but lost on disconnect.
- **[MEDIUM]** `BETWEEN` inclusive on both ends — may include/exclude boundary unexpectedly for dates/times.
- **[MEDIUM]** `GROUP BY` without aggregate in non-strict mode → non-deterministic result columns.
- **[MEDIUM]** `LEFT JOIN` filtering in `WHERE` clause converting it to `INNER JOIN` behavior → use `WHERE t2.id IS NULL` for exclusive left join.
- **[MEDIUM]** Division without zero check → division by zero runtime error.
- **[MEDIUM]** `IN (NULL)` condition always false → use `IS NULL` separately.
- **[LOW]** `LIKE '%text%'` not using index → trigram index (pg_trgm) needed for substring search.
- **[LOW]** Storing comma-separated values in single column → violates 1NF, query complexity explosion.
