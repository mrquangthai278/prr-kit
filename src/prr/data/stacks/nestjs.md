# NestJS — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `@Module(`, `@Injectable(`, `@Controller(`, `NestFactory`, `nest-cli.json`, `@nestjs/` in deps, `@nestjs/microservices`, `@nestjs/event-emitter`

---

## Security

- **[CRITICAL]** Route handler missing `@UseGuards(AuthGuard)` on protected endpoints → unauthenticated access.
- **[CRITICAL]** Missing `ValidationPipe` globally → raw unvalidated user input reaches business logic. Use `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`.
- **[CRITICAL]** Raw SQL query with string interpolation of user input → SQL injection. Always use parameterized queries or ORM.
- **[CRITICAL]** Mass assignment via `@Body()` mapped directly to entity without DTO → over-posting vulnerability.
- **[HIGH]** Returning TypeORM/Prisma entity directly from controller → exposes all fields including passwords. Map to response DTO.
- **[HIGH]** Missing `@Roles()` decorator with `RolesGuard` on admin endpoints → privilege escalation.
- **[HIGH]** No rate limiting on auth endpoints (login, register, password reset) → brute force. Use `@nestjs/throttler`.
- **[HIGH]** Secrets/config hardcoded in source instead of `ConfigService` → exposed in version control.
- **[HIGH]** JWT secret too short or using default value → token forging.
- **[HIGH]** `@Param('id')` used in ownership check without verifying the resource belongs to authenticated user → IDOR.
- **[HIGH]** File upload without MIME type validation and storage path sanitization → arbitrary file upload.
- **[MEDIUM]** Missing CORS configuration or `origin: '*'` in production.
- **[MEDIUM]** Error messages leaking stack traces → use exception filters to sanitize.
- **[MEDIUM]** `@nestjs/jwt` refresh token not invalidated on logout → stolen token reuse.
- **[LOW]** Swagger UI accessible in production without auth protection → API schema exposed.

---

## Performance

- **[HIGH]** N+1 query in repository — loading relations in loop instead of TypeORM `relations` / Prisma `include`.
- **[HIGH]** Synchronous/blocking operations in async handler → blocks event loop. Use worker threads or queue.
- **[HIGH]** Missing database indexes on `WHERE`, `ORDER BY`, `JOIN` columns.
- **[HIGH]** Missing pagination on list endpoints → unbounded response and memory.
- **[HIGH]** Global interceptors running expensive operations on every request without caching.
- **[HIGH]** `@nestjs/bull` / `@nestjs/bullmq` jobs not using concurrency limits → worker saturation.
- **[MEDIUM]** Missing `CacheModule` / `@Cacheable()` for expensive repeated reads.
- **[MEDIUM]** Loading full dataset into memory when only count/aggregate needed → use `count()` query.
- **[MEDIUM]** TypeORM lazy relations causing hidden N+1 via property access.
- **[MEDIUM]** Missing connection pool configuration → default too small under load.
- **[MEDIUM]** `findOne` vs `findOneOrFail` → choose based on whether absence is expected or error.
- **[LOW]** Unused interceptors/guards running on every request.
- **[LOW]** `@EventEmitter2` with synchronous listeners blocking request pipeline.

---

## Architecture

- **[HIGH]** Business logic in controller class → controllers handle HTTP only; move to service.
- **[HIGH]** Circular dependency between modules without `forwardRef` → instantiation error.
- **[HIGH]** Missing module declaration for provider → `Cannot determine dependencies` error at runtime.
- **[HIGH]** Service calling another service via HTTP (internal) instead of direct injection → unnecessary network hop.
- **[HIGH]** Domain logic in repository layer → repositories handle data access only, not business rules.
- **[HIGH]** Not using CQRS (`@nestjs/cqrs`) for complex domains → command/query mixed causing tangled services.
- **[HIGH]** Microservice event handlers not idempotent → duplicate processing on retry.
- **[MEDIUM]** God service >500 lines → split by domain responsibility (SRP).
- **[MEDIUM]** Repository logic (query building) in service class → separate concerns.
- **[MEDIUM]** Missing exception filter → unhandled exceptions expose stack traces in production.
- **[MEDIUM]** `any` type on DTO fields → defeats TypeScript and class-validator.
- **[MEDIUM]** Not using NestJS lifecycle hooks (`OnApplicationBootstrap`, `OnModuleDestroy`) for startup/shutdown.
- **[MEDIUM]** Event-driven patterns using `@nestjs/event-emitter` for critical flows that need transaction guarantee → use database-backed queues.
- **[LOW]** Module not feature-scoped (everything in AppModule).
- **[LOW]** Not using `@nestjs/config` with `ConfigModule.forRoot({ validate })` → no startup validation of env vars.

---

## Code Quality

- **[HIGH]** Missing `async`/`await` on repository/service calls → unhandled promise, silent data loss.
- **[HIGH]** Missing class-validator decorators on DTO → no input validation even with ValidationPipe.
- **[HIGH]** DTO class not using `class-transformer` decorators (`@Type`, `@Transform`) with `transform: true` → nested objects not transformed.
- **[HIGH]** Not using `plainToInstance` + `validate` for manual DTO transformation outside request pipeline.
- **[MEDIUM]** Property injection (`@Inject()` on property) instead of constructor injection → harder to test.
- **[MEDIUM]** Missing `@ApiProperty()` / `@ApiResponse()` Swagger decorators → undocumented API.
- **[MEDIUM]** Inconsistent error response format across controllers.
- **[MEDIUM]** `@Param()` without `ParseIntPipe` or `ParseUUIDPipe` → string passed to numeric query.
- **[MEDIUM]** Not using `@nestjs/mapped-types` (`PartialType`, `PickType`) → DTO duplication.
- **[LOW]** Missing `readonly` on injected dependencies in constructor → accidental reassignment.
- **[LOW]** `@Get()` / `@Post()` without `@HttpCode()` defaulting to wrong status codes.

---

## Common Bugs & Pitfalls

- **[HIGH]** `@Body()` without DTO class → ValidationPipe has nothing to validate, all input passes.
- **[HIGH]** `await dataSource.initialize()` not awaited → DB not ready, first requests fail.
- **[HIGH]** `@Param('id')` returns `string` but query expects `number` → silent miss, returns null.
- **[HIGH]** Exception thrown inside `@EventEmitter2` listener not caught → unhandled rejection crashes process.
- **[HIGH]** Microservice pattern not handling connection errors → service silently stops consuming.
- **[MEDIUM]** `onModuleInit` async work not properly awaited → app starts before dependencies ready.
- **[MEDIUM]** Lifecycle hook (`OnModuleDestroy`) missing → open DB connections on process exit.
- **[MEDIUM]** `@nestjs/schedule` cron jobs not handling errors → silent failure, job stops running.
- **[MEDIUM]** Transaction not rolled back on partial failure in multi-step operations.
- **[MEDIUM]** `ValidationPipe` with `transform: true` but `@Type(() => Number)` missing → string not converted.
- **[LOW]** `@Optional()` missing on truly optional injected dependencies → crashes at startup.
- **[LOW]** Health check endpoint not implemented → load balancer can't detect unhealthy instances.
