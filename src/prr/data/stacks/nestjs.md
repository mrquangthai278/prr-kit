# NestJS — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `@Module(`, `@Injectable(`, `@Controller(`, `NestFactory`, `nest-cli.json`, `@nestjs/` in deps

---

## Security

- **[CRITICAL]** Route handler missing `@UseGuards(AuthGuard)` on protected endpoints → unauthenticated access.
- **[CRITICAL]** Missing `ValidationPipe` globally or per-handler → raw unvalidated user input reaches business logic. Enable with `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))`.
- **[CRITICAL]** Raw SQL query with string interpolation of user input → SQL injection. Always use parameterized queries or ORM methods.
- **[HIGH]** Returning TypeORM/Prisma entity directly from controller → exposes all fields including passwords, internal IDs. Always map to a DTO/response class.
- **[HIGH]** Missing `@Roles()` decorator with `RolesGuard` on admin endpoints → privilege escalation.
- **[HIGH]** No rate limiting on auth endpoints (login, register, password reset) → brute force vulnerability.
- **[HIGH]** Secrets/config values hardcoded in source instead of `ConfigService` → exposed in version control.
- **[MEDIUM]** Missing CORS configuration or overly permissive `origin: '*'` in production.
- **[MEDIUM]** JWT secret not validated for minimum length/entropy in config.
- **[MEDIUM]** Error messages leaking stack traces or internal paths to client → use exception filters to sanitize.

---

## Performance

- **[HIGH]** N+1 query in repository — loading relations in a loop instead of using TypeORM `relations` option or Prisma `include`.
- **[HIGH]** Synchronous/blocking operations (file I/O, CPU-heavy computation) in async handler → blocks the event loop. Offload to worker threads or queue.
- **[HIGH]** Missing database indexes on columns used in `WHERE`, `ORDER BY`, `JOIN` in frequent queries.
- **[MEDIUM]** Missing `@Cacheable()` or manual caching for expensive repeated DB reads. Use `CacheModule` for frequently requested, rarely changed data.
- **[MEDIUM]** Loading entire large dataset into memory when only count or aggregation is needed.
- **[MEDIUM]** Missing pagination on list endpoints → unbounded response size.
- **[LOW]** Missing connection pool configuration for database → default pool may be too small under load.
- **[LOW]** Unused interceptors/guards that run on every request → unnecessary overhead.

---

## Architecture

- **[HIGH]** Business logic in controller class → controllers should only handle HTTP concerns (routing, parsing, response). Move logic to service.
- **[HIGH]** Circular dependency between modules without `forwardRef` → instantiation error. With `forwardRef` → design smell, consider restructuring.
- **[HIGH]** Missing module declaration for provider → `Cannot determine dependencies` error at runtime.
- **[HIGH]** Service calling another service via HTTP (internal) instead of direct injection → unnecessary network hop, tight coupling.
- **[MEDIUM]** God service with >500 lines violating SRP → split by domain responsibility.
- **[MEDIUM]** Repository logic (query building) in service class → use repository pattern consistently.
- **[MEDIUM]** Missing exception filter → unhandled exceptions expose stack traces in production response.
- **[MEDIUM]** Using `any` type on DTO fields defeats TypeScript and class-validator type checking.
- **[LOW]** Module not feature-scoped (everything in AppModule) → coupling, hard to test in isolation.

---

## Code Quality

- **[HIGH]** Missing `async`/`await` on repository/service method calls → unhandled promise, silent data loss.
- **[HIGH]** Missing class-validator decorators on DTO (`@IsString()`, `@IsEmail()`, `@IsNotEmpty()`) → no input validation even with ValidationPipe.
- **[MEDIUM]** Property injection (`@Inject()` on property) instead of constructor injection → harder to test, unclear dependencies.
- **[MEDIUM]** Missing `@ApiProperty()` / `@ApiResponse()` Swagger decorators on public API endpoints → undocumented API.
- **[MEDIUM]** Inconsistent error response format across controllers → clients cannot reliably parse errors.
- **[LOW]** Missing `readonly` on injected dependencies in constructor → accidental reassignment.
- **[LOW]** Module imports not organized (feature modules mixed with infrastructure modules) → poor separation.

---

## Common Bugs & Pitfalls

- **[HIGH]** `@Body()` without DTO class → ValidationPipe has nothing to validate against, all input passes through.
- **[HIGH]** Forgot `await` on `dataSource.initialize()` → DB not ready, first requests fail.
- **[MEDIUM]** `onModuleInit` async work not awaited properly → app starts before dependencies are ready.
- **[MEDIUM]** `@Param('id')` returns string but TypeORM/Prisma expects number → silent query miss (finds nothing, returns null).
- **[MEDIUM]** Lifecycle hook (`OnModuleDestroy`) missing for graceful shutdown → open DB connections on process exit.
- **[LOW]** `@Optional()` missing on truly optional injected dependencies → crashes at startup if not provided.
