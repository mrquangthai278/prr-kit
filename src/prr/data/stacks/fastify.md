# Fastify — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: from 'fastify', Fastify(), fastify.register(), fastify.route(), schema: with JSON Schema, @fastify/

---

## Security
- **[HIGH]** Missing `@fastify/helmet` plugin → security headers (CSP, HSTS, X-Frame-Options) absent. Register it as a global plugin before routes.
- **[HIGH]** No rate limiting via `@fastify/rate-limit` → brute-force and DoS succeed on public endpoints. Apply globally with per-route overrides.
- **[CRITICAL]** JSON schema validation disabled or bypassed (`schema` omitted, AJV strict mode off) → prototype pollution and arbitrary data accepted. Always define request schemas.
- **[HIGH]** Unvalidated file paths in `@fastify/multipart` → path traversal or overwrite attacks. Sanitize filenames and whitelist destination directories.
- **[HIGH]** CORS wildcard origin with `credentials: true` in `@fastify/cors` → cookies accepted from any domain. Set explicit origins or disable credentials when using wildcard.
- **[MEDIUM]** Response schema leaking internal fields (e.g., `password`, `internalId`) → sensitive data returned to clients. Define `schema.response` on every route.
- **[HIGH]** String fields not sanitized beyond JSON schema type checks → stored XSS or injection when data rendered. Add `format` or `pattern` constraints and sanitize.
- **[MEDIUM]** `fastify.register()` load order placing routes before auth plugin initialized → auth hooks absent. Register security plugins before route plugins.

---

## Performance
- **[HIGH]** No `schema.response` defined → Fastify falls back to slow `JSON.stringify` instead of fast-json-stringify, reducing throughput 2-5x. Define response schemas on every route.
- **[CRITICAL]** Missing `return` before `reply.send()` in async handlers → execution continues post-response, causing "Reply already sent" crashes. Always write `return reply.send(...)`.
- **[HIGH]** Async handler not returning a value or promise → request left unresolved, client hangs. Return the promise or call `reply.send()` in every code path.
- **[HIGH]** Synchronous CPU-heavy operations (crypto, regex, large JSON) inside handlers → event loop blocked, degrading concurrent requests. Offload to worker threads or async chunks.
- **[MEDIUM]** Shared services not wrapped with `fastify-plugin` → each plugin scope re-instantiates the service, wasting memory and DB connections. Use `fp()` to share decorators.
- **[MEDIUM]** Same plugin registered multiple times in nested scopes → duplicate middleware overhead per request. Use `fastify-plugin` where cross-scope sharing is intended.
- **[MEDIUM]** Pino at `trace` or `debug` level in production → excessive log I/O overhead. Set `logger: { level: 'info' }` and use async pino transport.
- **[LOW]** No content-type when sending pre-serialized JSON strings → Fastify may re-serialize. Use `reply.type('application/json').send(str)`.

---

## Architecture
- **[HIGH]** Business logic in route handler functions → untestable monoliths mixing HTTP and domain concerns. Extract into service modules and inject via `fastify.decorate()`.
- **[HIGH]** Shared services not registered via `fastify.decorate()` → services re-instantiated per module. Decorate the Fastify instance once at startup.
- **[MEDIUM]** Plugins lacking proper encapsulation → decorators and hooks leak across boundaries, causing ordering bugs. Use `fastify-plugin` only for deliberate cross-scope sharing.
- **[HIGH]** No `onRequest` or `preHandler` auth hooks on protected routes → routes accessible without a valid token. Scope an auth hook to protected route groups.
- **[MEDIUM]** All routes defined in one file → codebase grows unmanageable as app scales. Organize into domain-scoped plugins with `fastify.register()` and logical prefixes.
- **[MEDIUM]** No `fastify.addContentTypeParser()` for non-JSON request bodies → binary or form data silently rejected. Register parsers for all expected content types.
- **[LOW]** Routes not versioned (`/v1/`, `/v2/`) → breaking changes force simultaneous client updates. Establish prefix-based versioning from the outset.

---

## Code Quality
- **[MEDIUM]** No TypeScript type provider (`@fastify/type-provider-typebox` or `@fastify/type-provider-zod`) → handler params typed as `any`. Integrate a type provider and colocate schemas with routes.
- **[MEDIUM]** Route schemas duplicated inline across routes → schema drift and maintenance burden. Register shared schemas with `fastify.addSchema()` and reference via ``.
- **[HIGH]** No `fastify.setErrorHandler()` → inconsistent error shapes from per-handler try/catch. Define a global error handler normalizing errors to a standard envelope.
- **[MEDIUM]** No custom `fastify.setNotFoundHandler()` → default 404 format breaks client error parsing. Register a not-found handler returning the standard error shape.
- **[LOW]** Full request objects logged including auth headers → tokens appear in log aggregators. Configure pino `redact` paths to strip sensitive fields.
- **[MEDIUM]** Not using `fastify.inject()` in tests → tests need a live port, causing EADDRINUSE conflicts. Use `fastify.inject()` for in-process HTTP testing.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** `reply.send()` without `return` in async callbacks → "Reply already sent" errors or double-send crashes. Always `return reply.send()`.
- **[HIGH]** Plugin not awaited at top level → plugin uninitialized when requests arrive, missing decorator errors. Always await `fastify.register()` or use a ready hook.
- **[HIGH]** Schema `` used before `fastify.addSchema()` → validation fails silently or throws at startup. Register all shared schemas before routes that reference them.
- **[MEDIUM]** `fastify.close()` not called in tests → port stays bound, EADDRINUSE on next run. Call `fastify.close()` in `afterAll` or `afterEach`.
- **[HIGH]** `fastify.listen()` without `host: '0.0.0.0'` in containers → server binds loopback only, unreachable externally. Set host based on deployment environment.
- **[MEDIUM]** No `onError` hook or uncaught exception handler → errors in lifecycle hooks crash the process without diagnostics. Attach an `onError` hook and process-level handler.
- **[MEDIUM]** Mixing async handlers with callback-style `reply.send()` → control-flow bugs where promise resolves before reply is sent. Pick one pattern and apply consistently.
