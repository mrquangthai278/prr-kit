# SQLite — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `sqlite3`, `better-sqlite3`, `from 'better-sqlite3'`, `sqlite`, `*.db`, `*.sqlite`, `*.sqlite3`, `SQLITE_`

---

## Security
- **[CRITICAL]** SQL injection via string concatenation instead of `?` placeholders → attacker can read, modify, or delete all data in the file. Use parameterized queries with `?` placeholders in all drivers (`sqlite3`, `better-sqlite3`, `database/sql`).
- **[HIGH]** Database file stored in a web-accessible directory (e.g., `public/`, `static/`, `wwwroot/`) → direct HTTP download exposes entire database. Store the `.db` file outside the web root and serve data only via application endpoints.
- **[HIGH]** `ATTACH DATABASE` used with user-controlled filename → allows attacker to read or overwrite arbitrary `.db` files on the server. Never pass user input to `ATTACH DATABASE`; hardcode all attached database paths.
- **[HIGH]** WAL-mode journal files (`.db-wal`, `.db-shm`) served publicly → exposes uncommitted transaction data. Add `.db-wal` and `.db-shm` to the web server's deny list alongside the primary `.db` file.
- **[MEDIUM]** No encryption at rest for databases containing sensitive data → any process with filesystem access reads the entire database. Use SQLCipher or encrypt at the filesystem/disk level for sensitive deployments.
- **[MEDIUM]** Database file has world-readable permissions (e.g., `chmod 644`) → any OS user can open and read or copy the file. Set permissions to `600` (owner read/write only) and run the application as a dedicated user.

---

## Performance
- **[CRITICAL]** WAL mode not enabled (`PRAGMA journal_mode=WAL`) → default DELETE journal mode serializes all reads during writes, blocking concurrent read access. Run `PRAGMA journal_mode=WAL` once on database open for all applications with concurrent readers.
- **[HIGH]** `PRAGMA synchronous` not tuned for workload → default `FULL` mode flushes to disk on every transaction, causing very slow write throughput. Set `PRAGMA synchronous=NORMAL` for a balance of durability and performance in most workloads.
- **[HIGH]** Bulk inserts executed outside an explicit transaction → SQLite auto-commits each statement, causing a full fsync per row; 10,000 rows can take minutes. Wrap all bulk inserts in `BEGIN` / `COMMIT`.
- **[HIGH]** Missing indexes on columns used in `WHERE` or `ORDER BY` clauses → SQLite performs full-file linear scan. Run `EXPLAIN QUERY PLAN` on all queries and add indexes for any `SCAN TABLE` results.
- **[MEDIUM]** `VACUUM` not run periodically after large deletes → free pages accumulate inside the file, increasing its size and slowing reads. Schedule periodic `VACUUM` or enable `PRAGMA auto_vacuum=INCREMENTAL`.
- **[MEDIUM]** Large BLOBs (images, documents) stored directly in the database → inflates database file size, slows page cache, increases memory pressure. Store binary files on disk or object storage; keep only the file path or key in the DB.
- **[LOW]** `PRAGMA cache_size` not adjusted from the 2 MB default for large working sets → frequent page eviction causes repeated disk reads. Tune `PRAGMA cache_size` (negative value = KB) based on available RAM and dataset size.

---

## Architecture
- **[HIGH]** SQLite chosen for a workload requiring multiple concurrent writers (e.g., multi-process server, high-throughput API) → write serialization and locking cause `SQLITE_BUSY` errors under load. Migrate to PostgreSQL or MySQL for any workload with concurrent writes from multiple connections.
- **[HIGH]** Database file placed on a network-mounted filesystem (NFS, SMB) → POSIX file locking is unreliable over NFS, causing database corruption. SQLite must reside on a local filesystem; use a client-server DB for shared network storage.
- **[MEDIUM]** Repeated identical queries not using prepared statements → SQL parsed and planned on every execution. Prepare statements once and reuse them for hot code paths.
- **[MEDIUM]** Schema version not tracked with a `schema_version` table or `PRAGMA user_version` → no way to detect schema drift or apply incremental migrations. Use `PRAGMA user_version` to store and check schema version on startup.
- **[MEDIUM]** Application deployed with multiple processes sharing one SQLite file → each process holds its own connection, increasing lock contention. Use a single in-process connection or switch to a client-server database.
- **[LOW]** `WITHOUT ROWID` not considered for tables where the primary key is always used for access → standard rowid table adds an extra hidden integer column and a secondary lookup. Use `WITHOUT ROWID` for small, frequently accessed tables keyed only by their primary key.

---

## Code Quality
- **[HIGH]** `better-sqlite3` synchronous API used on the main Node.js event loop thread without a worker thread → every DB operation blocks the entire event loop during execution. Offload `better-sqlite3` calls to a worker thread or use the async `sqlite3` driver.
- **[MEDIUM]** Database connection not explicitly closed on process exit → in-flight WAL data may not be checkpointed, risking data loss or corruption on the next open. Register a `process.on('exit')` handler that calls `db.close()`.
- **[MEDIUM]** Multi-step operations (insert + update) not wrapped in `db.transaction()` (better-sqlite3) or `BEGIN`/`COMMIT` → partial failure leaves the database in an inconsistent state. Use `db.transaction(fn)()` for all operations that must be atomic.
- **[MEDIUM]** Foreign key enforcement not enabled (`PRAGMA foreign_keys=ON` missing) → SQLite ignores FK constraints by default, allowing orphaned rows silently. Enable `PRAGMA foreign_keys=ON` immediately after every new connection is opened.
- **[LOW]** Database opened with `readonly: false` when only reads are needed → accidental writes possible; WAL checkpointing triggered unnecessarily. Open with `{ readonly: true }` for connections that only read data.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** `PRAGMA foreign_keys` is `OFF` by default → all `FOREIGN KEY` constraints are silently ignored until explicitly enabled. Add `PRAGMA foreign_keys=ON` to every connection initialization path.
- **[HIGH]** Concurrent writes from multiple OS processes cause `SQLITE_BUSY` or `SQLITE_LOCKED` errors → SQLite allows only one writer at a time across all processes. Implement retry-with-backoff on `SQLITE_BUSY`, or restructure to a single writer process.
- **[HIGH]** `INTEGER PRIMARY KEY` assumed to be a UUID or random identifier → it is an alias for the 64-bit rowid and is sequential and predictable. Use a `TEXT` column with `gen_random_uuid()` or a UUID library if non-guessable IDs are required.
- **[MEDIUM]** Date and time values stored as inconsistently formatted `TEXT` (e.g., mix of ISO 8601 and locale strings) → lexicographic sort and comparison produce wrong results. Store all datetimes as ISO 8601 UTC strings (`YYYY-MM-DDTHH:MM:SSZ`) or as Unix epoch integers.
- **[MEDIUM]** `NULL` stored in a column where `0` or empty string is the intended value → `WHERE col = 0` misses NULL rows; aggregates like `COUNT` skip NULLs. Add `NOT NULL DEFAULT 0` (or appropriate default) to columns that should never be absent.
- **[LOW]** Boolean values stored as `0`/`1` INTEGER without a `CHECK` constraint → values like `2` or `-1` accepted silently. Add `CHECK (col IN (0, 1))` or use a named constant in application code.

