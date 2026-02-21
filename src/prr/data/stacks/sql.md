# SQL — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.sql` files, raw SQL strings in code (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `JOIN`), `db.query(`, `connection.execute(`, `cursor.execute(`

---

## Security

- **[CRITICAL]** SQL query built with string concatenation or interpolation of user input → SQL injection. Always use parameterized queries / prepared statements.
- **[CRITICAL]** `UPDATE` or `DELETE` statement without `WHERE` clause → full table update/delete. Always verify intent.
- **[HIGH]** `SELECT *` in application queries → over-fetches sensitive columns (passwords, tokens, PII). Explicitly list required columns.
- **[HIGH]** User-controlled `ORDER BY` column name without allowlist validation → SQL injection via column name.
- **[HIGH]** Missing `LIMIT` on user-controlled pagination → user can request entire table, DoS risk.
- **[MEDIUM]** Stored procedures accepting dynamic SQL (`EXEC`, `sp_executesql`) with user input → injection in stored procs.
- **[MEDIUM]** Database user has excessive privileges (DDL rights for application account) → blast radius if compromised.
- **[MEDIUM]** Sensitive columns (SSN, card numbers) stored in plain text → missing encryption at rest.

---

## Performance

- **[CRITICAL]** N+1 query pattern — executing a SELECT inside a loop for each row from an outer query. Use JOIN or batch fetch instead.
- **[HIGH]** Missing index on columns used in `WHERE`, `JOIN ON`, `ORDER BY` for frequently executed queries.
- **[HIGH]** Function applied to indexed column in `WHERE` clause (`WHERE LOWER(email) = ?`, `WHERE YEAR(created_at) = ?`) → index not used, full table scan.
- **[HIGH]** Implicit type conversion in `JOIN` or `WHERE` conditions (comparing INT to VARCHAR) → index not used.
- **[HIGH]** `SELECT` with no `LIMIT` on potentially large tables in application code → unbounded memory usage.
- **[MEDIUM]** `ORDER BY` on non-indexed columns in large tables → filesort, expensive.
- **[MEDIUM]** `SELECT COUNT(*)` on large tables without index → full scan. Use `COUNT(indexed_column)` or approximate counts.
- **[MEDIUM]** Missing `EXPLAIN` / `EXPLAIN ANALYZE` analysis before shipping complex or new queries.
- **[MEDIUM]** Subquery in `WHERE` re-executed for every row (correlated subquery) → O(n²). Rewrite as JOIN.
- **[LOW]** Missing composite index for queries filtering on multiple columns together.
- **[LOW]** Index on low-cardinality column (boolean, status with 2-3 values) → often unused by optimizer.

---

## Architecture

- **[HIGH]** Multi-step operations (insert + update + delete) without wrapping in a transaction → partial updates on failure.
- **[HIGH]** Missing foreign key constraints → orphaned records, data integrity not enforced at DB level.
- **[HIGH]** Business logic in stored procedures or triggers → hard to version, test, and deploy.
- **[MEDIUM]** Schema changes (ADD COLUMN, DROP COLUMN) mixed with data migrations in same script → risky to rollback.
- **[MEDIUM]** No rollback strategy for destructive migrations (DROP TABLE, DROP COLUMN) → data loss on failed deploy.
- **[MEDIUM]** Denormalized data without documented justification → update anomalies over time.
- **[MEDIUM]** Missing soft-delete pattern for business-critical records → hard DELETE loses audit trail.
- **[LOW]** Missing `created_at` / `updated_at` timestamps on all tables → no audit trail.

---

## Code Quality

- **[MEDIUM]** Inconsistent naming (camelCase in app, snake_case in DB, or mixed) → mapping confusion.
- **[MEDIUM]** `TIMESTAMP` without timezone (`TIMESTAMP` vs `TIMESTAMPTZ` in Postgres) → timezone bugs for international users.
- **[MEDIUM]** `VARCHAR` without length limit (or unreasonably large limit) → storage/performance implications.
- **[MEDIUM]** Missing `NOT NULL` constraint on columns that should always have a value.
- **[MEDIUM]** Missing `UNIQUE` index on columns with uniqueness requirements (email, username) → duplicates possible.
- **[LOW]** SQL keywords not uppercase → inconsistent style, harder to parse.
- **[LOW]** Missing comments on non-obvious query logic (window functions, complex JOINs).

---

## Common Bugs & Pitfalls

- **[HIGH]** `NULL` comparison with `=` instead of `IS NULL` → condition never matches (`NULL = NULL` is false in SQL).
- **[HIGH]** Off-by-one in pagination: `OFFSET (page - 1) * limit` → page 0 and page 1 return same rows without correct calculation.
- **[MEDIUM]** `BETWEEN` is inclusive on both ends — may include/exclude boundary values unexpectedly.
- **[MEDIUM]** `GROUP BY` without aggregate causing non-deterministic results in non-strict SQL modes.
- **[MEDIUM]** `DISTINCT` used to paper over bad JOINs producing duplicates → fix the JOIN instead.
- **[LOW]** Division without zero check → division by zero error at runtime.
