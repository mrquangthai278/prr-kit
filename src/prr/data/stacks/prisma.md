# Prisma — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: @prisma/client, prisma.schema, schema.prisma, PrismaClient, prisma., prisma., prisma., Prisma.sql, npx prisma migrate, DATABASE_URL

---

## Security

- **[CRITICAL]** `` used with user-supplied input → direct SQL injection; unsanitised strings are interpolated verbatim into the query. Replace with `` and Prisma's tagged template literal `Prisma.sql`, which parameterises all values automatically.
- **[CRITICAL]** `` used with dynamic SQL built from user input → SQL injection allowing arbitrary data modification or deletion. Replace with `` and `Prisma.sql` tagged template for full parameterisation.
- **[HIGH]** Full Prisma model objects returned from API route handlers without field selection → password hashes, internal tokens, and sensitive metadata are exposed to the client. Use `select` or `omit` in every query that feeds an API response.
- **[HIGH]** Prisma schema using `@default(uuid())` on IDs exposed in public URLs where sequential or enumerable IDs are not desired → UUIDs are fine but confirm intent; for human-readable IDs consider `cuid2` or `ulid` which are also URL-safe and sortable.
- **[HIGH]** Multi-tenant or multi-user queries missing a `userId` (or tenant) filter → horizontal privilege escalation (IDOR): any authenticated user can read or modify any other user's data. Every query on user-owned resources must include a `where: { userId: session.user.id }` clause.
- **[MEDIUM]** Prisma error objects (`PrismaClientKnownRequestError`) forwarded directly to API responses → leaks table names, column names, and constraint names from the error message. Catch Prisma errors and rethrow sanitised, generic messages; log full errors server-side only.
- **[MEDIUM]** Migration files not reviewed before running in production → data-destructive operations (column drops, type changes) execute without a safety net. Review every generated migration file before applying; use a staging database as a dry-run environment.
- **[LOW]** `DATABASE_URL` containing credentials printed in server debug logs → credentials appear in log aggregators accessible to developers without DB access. Redact the connection string in logging middleware and avoid logging environment variables.

---

## Performance

- **[CRITICAL]** N+1 query pattern — accessing a relation field inside a loop without `include` on the parent query → Prisma fires a separate SELECT for every iteration. Use `include: { relation: true }` on the outer query, or switch to a raw aggregation.
- **[HIGH]** `findMany` without `take` / `skip` or cursor pagination → unbounded result set; the entire table is loaded into application memory on large datasets, causing OOM. Always add `take: N` and implement pagination.
- **[HIGH]** Missing `@@index` in `schema.prisma` for fields used in `where`, `orderBy`, or relation lookups → full table scan on every query. Add compound or single-column indexes and run `EXPLAIN` to verify they are used.
- **[HIGH]** `include: { relation: true }` on a relation that can have thousands of child records → all children are loaded into memory even when only a count or summary is needed. Use `_count` for counts or paginate the relation separately.
- **[HIGH]** Multiple sequential Prisma calls in a single request that could be batched → each call is a separate database round-trip with its own latency. Batch with `prisma.([call1, call2])` for atomicity and fewer round-trips.
- **[HIGH]** `` used without a `timeout` option → long-running transactions hold row-level locks indefinitely, causing deadlocks under concurrent load. Set `{ timeout: 5000 }` (or an appropriate maximum) on every transaction.
- **[MEDIUM]** `findMany` with deeply nested `include` → Prisma may generate N+1 queries for nested relations even with `include`. Use `select` with only the specific fields needed to limit the query tree depth.
- **[MEDIUM]** Not using `select` to limit returned columns → all columns, including large text or binary fields, are fetched and serialised even when only two fields are consumed. Add a `select` clause to every query in a hot path.
- **[MEDIUM]** Offset-based pagination (`skip / take`) used on large tables → the database must scan and discard all skipped rows, getting slower as the offset grows. Switch to cursor-based pagination using `cursor: { id: lastId }` and `take`.
- **[MEDIUM]** `new PrismaClient()` created per request in a serverless function → each invocation opens a new connection pool, exhausting database connections under load. Use a module-level singleton with `globalThis` caching, and add a connection pooler (PgBouncer or Prisma Accelerate).
- **[MEDIUM]** No connection pooler (PgBouncer or Prisma Accelerate) used in a serverless deployment → each function invocation creates a fresh TCP connection to the database, which is expensive and limited by the database's max connection count. Add Prisma Accelerate or a sidecar pooler.
- **[LOW]** `prisma generate` not run in CI after `schema.prisma` changes → the committed generated client is out of sync, causing type errors or runtime mismatches that only surface in production. Run `prisma generate` as a CI step after any schema change.
- **[LOW]** `prisma db pull` not used when the database is the source of truth → `schema.prisma` drifts from the actual database schema, leading to migration conflicts. Run `db pull` regularly when working with an existing database.

---

## Architecture

- **[CRITICAL]** `new PrismaClient()` instantiated inside a route handler or on every request → each call opens a new connection pool; the database max-connection limit is hit quickly under any real load. Instantiate once at module level and export the singleton; use `globalThis` caching in serverless.
- **[HIGH]** `PrismaClient` used directly inside route handlers with no abstraction layer → business logic is tightly coupled to the ORM, making unit testing require a real database. Extract all DB calls into repository or service modules that can be mocked independently.
- **[HIGH]** `schema.prisma` without explicit field ordering or using `@map` to control column names → in some migration scenarios columns are reordered or renamed unexpectedly, causing migration drift. Use `@map` and `@@map` consistently and review generated SQL before applying.
- **[HIGH]** Prisma client used in an Edge Runtime (Vercel Edge, Cloudflare Workers) without Prisma Accelerate → the standard Prisma client uses Node.js APIs unavailable in the Edge runtime, causing deployment failures. Use Prisma Accelerate or Prisma's Driver Adapters for Edge deployments.
- **[MEDIUM]** Update timestamp fields defined with `@default(now())` instead of `@updatedAt` → the field is only set on creation, never on subsequent updates. Replace with `@updatedAt` so Prisma automatically sets the field on every update operation.
- **[MEDIUM]** Adding a NOT NULL column to a live table without a default value in the migration → the migration fails on a non-empty production table. Always provide a default (`@default`) or make the column optional (`?`) when adding columns to tables with existing data.
- **[MEDIUM]** Soft-delete implemented via a custom middleware that only intercepts `findMany` / `findFirst` → direct `delete` / `deleteMany` calls bypass the filter and hard-delete records. The middleware must also intercept `delete` and `deleteMany` to redirect them to an update of the `deletedAt` field.
- **[MEDIUM]** Prisma used for complex analytics or reporting queries → Prisma's query builder cannot express window functions, CTEs, or advanced aggregations efficiently. Use `` with `Prisma.sql` or a dedicated analytics connection for reporting workloads.
- **[MEDIUM]** Cross-cutting concerns (audit logging, soft-delete, multi-tenancy row filters) implemented ad hoc in each service rather than via Prisma middleware → inconsistent application and easy to miss in new code. Centralise these concerns in `prisma.()` middleware or Prisma Client extensions.
- **[LOW]** Prisma model names not matching SQL table naming convention and `@@map` not used → Prisma generates PascalCase table names that differ from the snake_case convention of the existing database, causing migration confusion. Use `@@map("table_name")` to align model names with SQL conventions.
- **[LOW]** Enums defined in `schema.prisma` but not yet reflected in the database via a migration → Prisma generates the enum type but queries fail until the migration is applied. Always run `prisma migrate dev` after adding or modifying enums.

---

## Code Quality

- **[HIGH]** `prisma.model.update()` called on a record that does not exist → Prisma throws `PrismaClientKnownRequestError` with code `P2025` (Record not found), not `null`. Handle the P2025 error explicitly and return a 404; do not assume the result can be `null`.
- **[HIGH]** `upsert` used without a guaranteed unique constraint on the `where` field → under concurrent requests two `create` branches may race and produce duplicate rows. Ensure the `where` field has a `@unique` or `@@unique` constraint in the schema.
- **[HIGH]** Multi-step database operations not wrapped in `` → a failure in any step leaves the database in a partially updated, inconsistent state with no rollback. Wrap all related mutations in a single `prisma.(async (tx) => { ... })` call.
- **[MEDIUM]** `connect` vs `create` in nested writes confused → `connect` links an existing related record by ID; `create` makes a new one. Using `connect` with a non-existent ID throws P2025; using `create` when the record already exists creates a duplicate. Understand the distinction before writing nested relation operations.
- **[MEDIUM]** `findUnique` vs `findFirst` confused → `findUnique` strictly requires a field with a `@unique` or `@@unique` constraint and cannot use `orderBy`; `findFirst` can use any field and supports sorting but acquires no uniqueness guarantee. Use the correct variant for the use-case.
- **[MEDIUM]** Prisma error codes (`P2002` unique constraint, `P2025` record not found) not caught and mapped to HTTP status codes → clients receive a generic 500 for recoverable errors. Catch `PrismaClientKnownRequestError` and map `P2002` to 409 Conflict, `P2025` to 404 Not Found, etc.
- **[MEDIUM]** `prisma.("query")` logging enabled in production → every SQL query, including those containing sensitive parameter values, is written to logs. Disable query logging in production or filter out sensitive query events.
- **[MEDIUM]** `prisma.()` not called in scripts, Lambda handlers, or test teardown → the connection pool is not released cleanly, leaving idle connections open on the database server. Always call `()` in a `finally` block for scripts and in `afterAll` for tests.
- **[LOW]** `@default(now())` used on the `updatedAt` field instead of `@updatedAt` → the field is set only on document creation and never updated by Prisma on subsequent writes. Change to `updatedAt DateTime @updatedAt`.
- **[LOW]** Missing `relationMode = "prisma"` in the datasource block when using PlanetScale (which does not support foreign key constraints) → Prisma skips relation validation and referential integrity is not enforced at the ORM level. Add `relationMode = "prisma"` and use Prisma's emulated relation checks.

---

## Common Bugs & Pitfalls

- **[HIGH]** `findUnique` used with a field that does not have a `@unique` or `@@unique` constraint → Prisma throws a runtime error; it does not silently fall back to `findFirst`. Switch to `findFirst` when querying non-unique fields.
- **[HIGH]** `prisma.` callback using the outer `prisma` instance instead of the `tx` argument → queries inside the callback execute outside the transaction scope and are not rolled back on error. Always use the `tx` parameter for all queries inside a transaction callback.
- **[HIGH]** `prisma migrate deploy` run in production without first running `prisma generate` → the deployed code uses an outdated generated client that may be missing new models or fields, causing runtime type errors. Run `prisma generate` as part of the deployment pipeline before starting the server.
- **[MEDIUM]** `prisma.model.create()` with a nested `connect` to a non-existent related record ID → Prisma throws P2025 with a message referencing the related model, which can be confusing. Validate that related IDs exist before the create, or handle P2025 and surface a clear error.
- **[MEDIUM]** `count` aggregate result compared with `!= null` → `count` always returns a number (0 when no records match), so the null check is always true and masks the real condition. Compare with `=== 0` or `> 0` explicitly.
- **[MEDIUM]** Soft-delete Prisma middleware intercepts `findMany` and `findFirst` but not `delete` / `deleteMany` → direct delete calls bypass the soft-delete logic, permanently removing records. Extend the middleware to intercept `delete` and `deleteMany` and convert them to `update({ data: { deletedAt: new Date() } })`.
- **[MEDIUM]** `` or `` with `COUNT(*)` → PostgreSQL (and some other databases) return `COUNT` as a `BigInt`, which `JSON.stringify` cannot serialise, throwing a runtime error. Convert with `Number()` or `.toString()` before returning the result.
- **[MEDIUM]** `updateMany` return value used to retrieve the updated records → `updateMany` returns `{ count: N }`, not the updated records. Call a subsequent `findMany` with the same `where` clause if the updated records are needed.
- **[LOW]** `schema.prisma` not formatted with `prisma format` before committing → unformatted schema files produce noisy, hard-to-read diffs and may trigger unnecessary reformatting by another developer. Add `prisma format` to a pre-commit hook.
- **[LOW]** Prisma CLI version and `@prisma/client` version out of sync → version mismatches produce deprecation warnings, unexpected query behaviour, and subtle type errors. Pin both `prisma` and `@prisma/client` to the same version in `package.json` and update them together.
