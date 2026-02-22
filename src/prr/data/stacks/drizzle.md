# Drizzle ORM — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `drizzle-orm`, `from 'drizzle-orm'`, `drizzle()`, `pgTable`, `mysqlTable`, `sqliteTable`, `migrate()`, `drizzle-kit`

---

## Security
- **[CRITICAL]** Raw SQL via `sql` tagged template literal with user input not parameterized (e.g., `sql\`WHERE name = '${userInput}'\``) → SQL injection. Use Drizzle's query builder or pass user values as parameterized bindings: `sql\`WHERE name = ${userInput}\`` (Drizzle auto-parameterizes interpolated values in the `sql` tag).
- **[HIGH]** Drizzle schema file imported and exposed via an API route response → internal table structure, column names, and types leaked to clients. Never serialize schema objects into HTTP responses; expose only shaped DTOs.
- **[HIGH]** No row-level access control in query layer → any authenticated user can query any row by guessing IDs. Add a `WHERE userId = currentUserId` (or equivalent tenant filter) to every query that returns user-owned data.
- **[MEDIUM]** Database credentials stored in `drizzle.config.ts` and committed to the repository → credentials exposed in version control history. Read credentials from environment variables (`process.env.DATABASE_URL`) in the config file.
- **[MEDIUM]** Migrations run with superuser DB credentials in production CI/CD pipeline → accidental schema destruction possible. Use a migration-only role with `CREATE`, `ALTER`, `DROP` on the app schema; separate from the runtime role.

---

## Performance
- **[HIGH]** N+1 queries from nested `.findMany()` calls without using `.with()` for relations → one query fired per parent row to load children. Switch to Drizzle's relational query API with `.with({ relation: true })` to load related data in a single query.
- **[HIGH]** No `.limit()` on list queries → full table scan returned to application memory, OOM risk on large tables. Every `findMany` or `select` on an unbounded table must include `.limit(n)`.
- **[HIGH]** `db.select()` without column projection (no `{ field: table.field }` shape) → all columns fetched; breaks index-only scans and sends unnecessary data over the wire. Pass a columns object to `db.select({ id: table.id, name: table.name })` for every query.
- **[MEDIUM]** Multi-table mutations (insert + update across tables) not wrapped in a transaction → partial failure leaves data inconsistent. Use `db.transaction(async (tx) => { ... })` for all operations that must be atomic.
- **[MEDIUM]** Indexes not defined in the Drizzle schema alongside the table → indexes exist only in migration SQL but not tracked in the schema, causing drift. Define all indexes using `.index()` or `.uniqueIndex()` in the same schema file as the table.
- **[MEDIUM]** `drizzle-kit push` used in staging or production to apply schema changes → `push` may drop and recreate columns, causing data loss. Use `drizzle-kit generate` to produce migration SQL files, review them, then apply with `drizzle-kit migrate`.
- **[LOW]** Connection not pooled (no PgBouncer or application-level pool like `pg-pool`) → new TCP connection opened per request; connection exhaustion under load. Configure a connection pool and pass the pooled client to `drizzle()`.

---

## Architecture
- **[HIGH]** Database queries written directly in API route handlers or controllers → no separation of data access from transport layer, making queries untestable in isolation. Extract all DB queries into a repository or data-access layer; import the repository into route handlers.
- **[MEDIUM]** Drizzle's relational query API not used when related data is needed → developers write complex manual JOINs that are harder to maintain and more error-prone. Use `.query.table.findMany({ with: { relation: {} } })` for relation traversal.
- **[MEDIUM]** Schema spread across many files without a barrel `schema.ts` export → Drizzle relations and `db` instance require all schema tables; missing tables cause runtime errors. Collect all table definitions in a single `schema.ts` (or `schema/index.ts`) barrel export passed to `drizzle()`.
- **[MEDIUM]** No seed script for development database → developers set up data manually, causing environment divergence. Provide a `seed.ts` script using Drizzle inserts that can be run with `npx tsx seed.ts`.
- **[LOW]** Table names in schema not matching actual database table names (no `{ name: 'actual_table' }` option) → Drizzle generates incorrect SQL, causing "relation does not exist" errors. Set the explicit table name string in `pgTable('actual_table_name', ...)` when it differs from the variable name.

---

## Code Quality
- **[HIGH]** Column types in Drizzle schema not aligned with application TypeScript types (e.g., `text()` for a column that only holds enum values) → invalid values accepted at DB level. Use `text('col', { enum: ['a', 'b', 'c'] })` or add a Zod/Valibot parse step at the boundary.
- **[HIGH]** `.returning()` omitted after `.insert()` when the generated ID or defaults are needed → `result` is an empty array, causing `undefined` reference on the next line. Chain `.returning()` to every INSERT that the application reads back.
- **[MEDIUM]** `.notNull()` missing on columns that are logically required → `null` values accumulate and cause unexpected `null` checks throughout the codebase. Add `.notNull()` to every column the application treats as mandatory.
- **[MEDIUM]** `.$type<T>()` not used for columns that hold branded or opaque types (e.g., `UserId`, `OrderId`) → plain `string` or `number` types allow mixing IDs across entities. Use `text('user_id').$type<UserId>()` to brand column types and catch cross-entity ID bugs at compile time.
- **[MEDIUM]** Drizzle TypeScript types not inferred with `typeof table.$inferSelect` / `.$inferInsert` → manual type duplication drifts from schema over time. Use Drizzle's inferred types everywhere instead of hand-written interfaces.
- **[LOW]** Table naming inconsistency between Drizzle variable name and the DB table name passed as first arg → confusion when reading error messages or raw SQL logs. Keep Drizzle variable name and table name string identical (both snake_case).

---

## Common Bugs & Pitfalls
- **[HIGH]** `.insert().values()` result used without `.returning()` → the return value is a result metadata object (rowCount), not the inserted row; accessing `.id` returns `undefined`. Always add `.returning({ id: table.id })` (or the needed fields) after `.insert().values()`.
- **[HIGH]** Relations defined in the Drizzle schema with `relations()` but `.with()` not used in the actual query → N+1 still occurs because `relations()` only informs the query API; it does not automatically join. Use `db.query.table.findMany({ with: { relation: {} } })` to activate the relation.
- **[MEDIUM]** `drizzle-kit push` used against a production database → push computes a diff and may drop columns or tables to match the schema, causing irreversible data loss. Enforce a CI policy that only `drizzle-kit migrate` (with reviewed migration files) runs in production.
- **[MEDIUM]** Database connection created inside a request handler (e.g., `const db = drizzle(new Pool(...))` per request) → new pool created for every request, exhausting DB connections rapidly. Create the `db` instance once at module initialization and reuse it.
- **[MEDIUM]** `eq(table.col, undefined)` passed to a WHERE clause when an optional filter is absent → Drizzle generates `WHERE col = NULL` (never matches). Guard optional filters: `...(value !== undefined ? [eq(table.col, value)] : [])` using `and()`.
- **[LOW]** Drizzle type inference breaking on complex union or conditional columns → TypeScript errors cascade through the codebase. Pin Drizzle and `drizzle-kit` to the same exact semver version and upgrade them together.

