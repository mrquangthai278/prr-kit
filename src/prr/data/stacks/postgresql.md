# PostgreSQL — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `pg`, `postgres`, `from 'pg'`, `psycopg2`, `asyncpg`, `pgx`, `DATABASE_URL` with `postgres://`, `*.sql` with PostgreSQL syntax

---

## Security
- **[CRITICAL]** SQL injection via string interpolation instead of parameterized queries (`$1`, `$2`) → attacker can read, modify, or delete any data. Use `$1`/`$2` placeholders with separate values array in all queries.
- **[CRITICAL]** Superuser (`postgres`) used for application connections → full DB access on compromise. Create a least-privilege application user with only required table permissions.
- **[HIGH]** `SECURITY DEFINER` functions without `SET search_path = schema, pg_catalog` → search_path injection allows privilege escalation. Always pin the search_path in SECURITY DEFINER functions.
- **[HIGH]** Row-level security (RLS) not enabled for multi-tenant data → any authenticated user can read all tenants' rows. Enable RLS and add policies per tenant identifier.
- **[HIGH]** Connection string with credentials in source code or logs → credentials exposed in version control or log aggregators. Use environment variables and ensure logging redacts connection strings.
- **[MEDIUM]** Unencrypted connections (no `sslmode=require`) to remote PostgreSQL → credentials and data sent in plaintext over network. Set `sslmode=require` (or `verify-full`) in all connection configs.
- **[MEDIUM]** Public schema permissions not revoked from the `public` role → any DB user can create objects in public schema. Run `REVOKE CREATE ON SCHEMA public FROM PUBLIC` after provisioning.
- **[MEDIUM]** `pg_stat_statements` view exposing query logs containing sensitive data → internal query patterns and data values visible to DB users with access. Restrict access to `pg_stat_statements` to DBA roles only.

---

## Performance
- **[HIGH]** Missing indexes on foreign key columns → sequential scan on every JOIN referencing that key, degrading at scale. Add a `CREATE INDEX` for each foreign key column not already covered by a unique constraint.
- **[HIGH]** `SELECT *` instead of specific columns → over-fetching wastes I/O and prevents index-only scans. Always select only the columns the application needs.
- **[HIGH]** N+1 queries — one query per row in a loop instead of a single JOIN or CTE → response time grows linearly with row count. Rewrite as a single query using JOIN, `IN`, or a CTE.
- **[HIGH]** Missing `EXPLAIN ANALYZE` review for queries reported as slow → root cause of slow queries unknown, fixes are guesswork. Run `EXPLAIN (ANALYZE, BUFFERS)` and inspect sequential scans and high actual rows.
- **[MEDIUM]** `LIKE '%pattern%'` without trigram index (`pg_trgm`) → forces full sequential scan for substring search. Install `pg_trgm` extension and create a GIN index on the column.
- **[MEDIUM]** Not using `RETURNING` clause after INSERT/UPDATE → requires a separate SELECT round-trip to fetch the generated ID or updated row. Add `RETURNING id` (or required columns) to INSERT/UPDATE statements.
- **[MEDIUM]** Large transactions holding locks for extended periods → concurrent writes block, causing queue build-up and timeouts. Break large batch operations into smaller chunks with intermediate commits.
- **[LOW]** No connection pooling (PgBouncer or application-level pool) → each new connection costs ~5-10 MB RAM; exhausted under load. Configure a connection pool sized to `(num_cores * 2) + disk_spindles`.

---

## Architecture
- **[HIGH]** Business logic duplicated in application layer that should be enforced in PostgreSQL constraints or triggers → logic can be bypassed by direct DB access or other services. Move invariants to CHECK constraints, triggers, or DB functions.
- **[HIGH]** No database migrations tool (Flyway, Liquibase, Alembic, golang-migrate) → schema drifts between dev/staging/production. Adopt a migrations tool and commit all migration files to version control.
- **[MEDIUM]** Not using schemas to namespace tables (e.g., `auth`, `billing`, `public`) → all tables in public schema creates naming conflicts and broad permission grants. Organize tables into schemas and grant per-schema privileges.
- **[MEDIUM]** Denormalized JSONB columns without GIN index or documented access pattern → arbitrary JSON stored without query performance consideration. Add GIN index (`jsonb_path_ops`) on JSONB columns used in WHERE clauses.
- **[MEDIUM]** UUID vs sequential ID choice not aligned with use case → random UUIDs cause index fragmentation; sequential IDs leak row counts. Use `gen_random_uuid()` (UUID v4) for external IDs; use `BIGSERIAL` for internal FKs.
- **[LOW]** Not using `ENUM` types for constrained string columns → invalid values accepted at application level only. Define PostgreSQL ENUM types or CHECK constraints to enforce value sets at the DB layer.

---

## Code Quality
- **[HIGH]** DDL changes applied directly to production database without a migration file → change cannot be reproduced, rolled back, or reviewed. All schema changes must go through a migration file committed to the repository.
- **[HIGH]** Missing `NOT NULL` constraints on columns the application always requires → NULLs accumulate silently, causing unexpected NullPointerExceptions in application code. Add `NOT NULL` to all columns with a non-optional meaning.
- **[MEDIUM]** Inconsistent column naming (mix of `snake_case` and `camelCase`) → ORM mapping errors and confusing SQL. Standardize on `snake_case` for all PostgreSQL identifiers.
- **[MEDIUM]** Missing `CHECK` constraints for data validation (e.g., `age > 0`, `status IN (...)`) → invalid data enters the DB and must be handled in every consumer. Add CHECK constraints to enforce domain rules at the storage layer.
- **[MEDIUM]** Foreign keys missing explicit `ON DELETE` / `ON UPDATE` behavior → accidental orphan rows or unintended cascades. Explicitly declare `ON DELETE RESTRICT`, `CASCADE`, or `SET NULL` based on the domain relationship.
- **[LOW]** No consistent timestamp columns (`created_at`, `updated_at`) on mutable tables → no audit trail for record lifecycle. Add `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ` with an update trigger.

---

## Common Bugs & Pitfalls
- **[HIGH]** Comparing nullable column with `= NULL` instead of `IS NULL` → expression always evaluates to NULL (never TRUE), silently returning wrong result set. Replace all `col = NULL` with `col IS NULL` and `col != NULL` with `col IS NOT NULL`.
- **[HIGH]** `TIMESTAMP` (without time zone) used for user-facing or cross-timezone data → stored value is ambiguous, causing daylight saving time bugs. Use `TIMESTAMPTZ` (timestamp with time zone) for all datetime columns.
- **[HIGH]** `INT` (32-bit) primary key on high-volume tables → overflows at ~2.1 billion rows, causing insert failures. Use `BIGINT` / `BIGSERIAL` or UUID for primary keys on tables expected to grow large.
- **[MEDIUM]** `VACUUM` not running (autovacuum disabled or tables excluded) → dead tuple bloat degrades query performance and index efficiency. Ensure autovacuum is enabled; monitor `pg_stat_user_tables.n_dead_tup`.
- **[MEDIUM]** `DISTINCT ON (col)` semantics misunderstood → which row is returned from each group is undefined without `ORDER BY`. Always pair `DISTINCT ON (col)` with `ORDER BY col, tie_breaker` to get deterministic results.
- **[MEDIUM]** `UPDATE`/`INSERT` inside a loop not wrapped in a transaction → each statement auto-commits, causing thousands of round trips and partial state on error. Wrap batch operations in `BEGIN` / `COMMIT`.
- **[LOW]** Unquoted mixed-case identifiers treated as lowercase → `CREATE TABLE "UserTable"` is different from `usertable`, causing "relation does not exist" errors. Use lowercase identifiers without quoting, or quote consistently everywhere.

