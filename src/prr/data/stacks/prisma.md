# Prisma — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `prisma/schema.prisma`, `@prisma/client`, `prisma.`, `PrismaClient`, `prisma generate`

---

## Security

- **[CRITICAL]** Raw query with user input: `prisma.$queryRawUnsafe(sql)` → SQL injection. Use `prisma.$queryRaw` with tagged template (`Prisma.sql\`\``) for parameterization.
- **[HIGH]** Returning full Prisma model from API without field selection → exposes password hashes, internal fields. Use `select` or `omit`.
- **[MEDIUM]** `prisma.$executeRawUnsafe()` with dynamic SQL → injection risk.

---

## Performance

- **[HIGH]** N+1 — accessing relation in loop without `include`. Use `include: { relation: true }` or `select`.
- **[HIGH]** No pagination — `prisma.model.findMany()` without `take`/`skip` or cursor → unbounded result set.
- **[HIGH]** Missing `@@index` in schema for frequently filtered fields → full table scan.
- **[MEDIUM]** `findMany` with `include` on large relations → loads all related records. Use `_count` or paginated sub-query.
- **[MEDIUM]** Multiple separate Prisma calls that could be batched with `prisma.$transaction([...])`.
- **[LOW]** Not using `select` to limit returned fields — fetching all columns when only a few are needed.

---

## Architecture

- **[HIGH]** `new PrismaClient()` instantiated per request → connection pool exhaustion. Use singleton pattern.
- **[MEDIUM]** Prisma Client used directly in route handlers without repository/service abstraction → hard to mock in tests.
- **[MEDIUM]** Schema migration not reviewed for destructive operations (dropping columns, changing types without migration).
- **[LOW]** Missing `@@map` for table name when Prisma model name differs from convention.

---

## Common Bugs & Pitfalls

- **[HIGH]** `prisma.model.update()` on non-existent record → throws `P2025` error, not null. Always use `updateMany` or check existence first.
- **[MEDIUM]** `connect` vs `create` in nested writes — using `connect` with non-existent ID silently fails or throws.
- **[MEDIUM]** `upsert` without proper `where` uniqueness → unexpected behavior.
- **[LOW]** `@default(now())` on `updatedAt` instead of `@updatedAt` → not automatically updated on writes.
