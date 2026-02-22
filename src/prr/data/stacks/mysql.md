# MySQL — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `mysql`, `mysql2`, `from 'mysql2'`, `PyMySQL`, `DATABASE_URL` with `mysql://`, `*.sql` with MySQL syntax, `InnoDB`, `SHOW TABLES`

---

## Security
- **[CRITICAL]** SQL injection via string concatenation instead of prepared statements → attacker can read, modify, or drop any data. Use `?` placeholders with parameterized queries in all drivers (`mysql2`, `PyMySQL`).
- **[CRITICAL]** Root MySQL user used for application connections → full server access on credential compromise. Create a dedicated application user with `GRANT SELECT, INSERT, UPDATE, DELETE ON app_db.*` only.
- **[HIGH]** `FILE` privilege granted to application DB user → allows reading arbitrary server files via `LOAD DATA INFILE`. Revoke `FILE` privilege; it is never needed by application code.
- **[HIGH]** `LOAD DATA INFILE` used with user-controlled file paths → arbitrary file read from server filesystem. Validate and allowlist all paths; prefer inserting data via application logic.
- **[HIGH]** Relying solely on `mysql_real_escape_string` for injection prevention → charset-based bypasses exist with certain encodings. Use prepared statements exclusively; escaping is not a sufficient substitute.
- **[MEDIUM]** `general_log` enabled in production → all queries including those containing passwords or PII written to log file. Disable `general_log` in production; use `slow_query_log` for performance diagnostics only.
- **[MEDIUM]** Remote root login not disabled → exposed MySQL port allows brute-force root access. Run `DELETE FROM mysql.user WHERE User='root' AND Host != 'localhost'` and `FLUSH PRIVILEGES`.

---

## Performance
- **[HIGH]** Missing indexes on columns used in `WHERE`, `JOIN ON`, or `ORDER BY` clauses → full table scan on every query, degrading linearly with row count. Run `EXPLAIN` on all slow queries and add indexes on unindexed filter columns.
- **[HIGH]** `SELECT *` used instead of explicit column list → over-fetches data, prevents covering indexes, and breaks when schema changes. List only required columns in every SELECT.
- **[HIGH]** `OFFSET` pagination on large tables (e.g., `LIMIT 20 OFFSET 10000`) → MySQL scans and discards offset rows on every page request. Use keyset pagination: `WHERE id > last_seen_id LIMIT 20`.
- **[MEDIUM]** `MyISAM` storage engine still used → no transaction support, table-level locking blocks concurrent writes. Migrate all tables to `InnoDB` (`ALTER TABLE t ENGINE=InnoDB`).
- **[MEDIUM]** Not running `EXPLAIN` or `EXPLAIN FORMAT=JSON` on queries before deploying → performance regressions not caught until production load. Add query analysis to the PR review checklist for any new or modified queries.
- **[MEDIUM]** `ORDER BY RAND()` used for random row selection → forces full table sort; extremely slow on large tables. Use `WHERE id >= FLOOR(RAND() * (SELECT MAX(id) FROM t)) LIMIT 1` or pre-compute random sets.
- **[LOW]** Large `TEXT` or `BLOB` columns in frequently queried tables → increases row size, reduces rows per page, slows full-table operations. Store large content in object storage; keep only a reference URL in the DB.

---

## Architecture
- **[HIGH]** No foreign key constraints defined → orphaned child records accumulate silently; referential integrity broken. Define `FOREIGN KEY` constraints with explicit `ON DELETE` and `ON UPDATE` behavior on all relationships.
- **[HIGH]** Structured data serialized as JSON in `TEXT` columns without using MySQL's `JSON` type → no schema validation, no index support, no partial updates. Use MySQL `JSON` column type with generated columns for indexable fields.
- **[MEDIUM]** Multi-statement operations (e.g., insert + update + deduct balance) not wrapped in a transaction → partial failure leaves data in inconsistent state. Wrap related mutations in `START TRANSACTION` / `COMMIT` with `ROLLBACK` on error.
- **[MEDIUM]** Database charset not set to `utf8mb4` at server, database, and table level → 4-byte characters (emoji, certain CJK) cause truncation or `Incorrect string value` errors. Set `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` at all three levels.
- **[MEDIUM]** Read replicas not used for reporting or analytics queries → heavy read queries compete with write traffic on primary. Route `SELECT` queries for reports to a read replica using separate connection.
- **[LOW]** No defined archival or partitioning strategy for high-volume tables → tables grow unbounded, slowing all queries. Implement `PARTITION BY RANGE` on date columns or periodic archival to cold storage.

---

## Code Quality
- **[HIGH]** `DATETIME` used instead of `TIMESTAMP` for timezone-aware data (or vice versa without understanding the difference) → `TIMESTAMP` auto-converts to UTC but has 2038 overflow; `DATETIME` stores literally. Explicitly choose: `TIMESTAMP` for UTC-stored times, `DATETIME` for calendar values.
- **[HIGH]** Passwords stored as plaintext or using MD5/SHA1 → trivially reversible on breach. Use bcrypt, scrypt, or Argon2 via the application layer; never hash passwords in SQL.
- **[MEDIUM]** `INT(11)` display width used as if it were a storage-size constraint → display width is deprecated in MySQL 8 and has no effect on storage. Use `INT`, `BIGINT`, or `TINYINT` without display width specifiers.
- **[MEDIUM]** Missing `ON DELETE` / `ON UPDATE` clause on foreign key definitions → default behavior is `RESTRICT`, which may not match domain intent. Explicitly declare the desired referential action on every foreign key.
- **[MEDIUM]** Schema changes deployed without using a migration tool (Flyway, Liquibase, or similar) → environments diverge; no rollback path. Commit all schema changes as versioned migration files.
- **[LOW]** `ENUM` columns changed by adding values in the middle of the list → alters the underlying integer representation, corrupting existing data. Only append new values to the end of an ENUM list, or use a lookup table instead.

---

## Common Bugs & Pitfalls
- **[HIGH]** `utf8` charset used instead of `utf8mb4` → MySQL's `utf8` is a 3-byte encoding; 4-byte characters (emoji, some CJK) are silently truncated or cause insertion errors. Migrate all columns, tables, and the connection charset to `utf8mb4`.
- **[HIGH]** Column defined with `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` unexpectedly updates on unrelated writes → every UPDATE on the row changes the timestamp even if that column is not intended to track modification. Remove `ON UPDATE` from columns that should not auto-update.
- **[MEDIUM]** `GROUP BY` without strict mode (`ONLY_FULL_GROUP_BY` disabled) → non-aggregated columns silently return an arbitrary row's value. Enable `ONLY_FULL_GROUP_BY` in `sql_mode` and fix all queries that rely on the lenient behavior.
- **[MEDIUM]** Case-insensitive collation (`utf8mb4_general_ci`) causing unexpected equality matches (e.g., `'a' = 'A'`, or `'cafe' = 'café'`) → uniqueness constraints may not work as expected. Choose collation deliberately: `utf8mb4_bin` for case-sensitive, `utf8mb4_unicode_ci` for case-insensitive with correct Unicode rules.
- **[MEDIUM]** Reserved words used as column or table names without backtick quoting (e.g., `order`, `key`, `rank`) → syntax errors or incorrect query parsing. Quote reserved words with backticks or rename the identifiers.
- **[LOW]** `AUTO_INCREMENT` counter not reset after bulk delete → ID gaps mislead users into thinking records were deleted. Gaps are normal; document this and never expose raw IDs as business-meaningful order indicators.

