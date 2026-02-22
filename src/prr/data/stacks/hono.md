# Hono — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: from 'hono', new Hono(), app.get(, app.use(, c.json(, c.req, Cloudflare Workers / Deno / Bun deployment

---

## Security
- **[CRITICAL]** Missing authentication middleware before protected routes → unauthenticated users access private resources. Apply an auth middleware via `app.use()` scoped to protected route groups before handler registration.
- **[HIGH]** No rate limiting on public endpoints → brute-force and DoS attacks succeed without throttling. Integrate a rate-limiting middleware or use platform-native throttling (e.g., Cloudflare rate limiting rules).
- **[HIGH]** `c.req.raw` body parsed without a size limit → large payloads exhaust memory on edge runtimes with limited heap. Apply a body-size check before parsing or configure platform limits.
- **[HIGH]** CORS wildcard `*` used for credentialed requests → cookies and auth headers accepted from any origin. Set specific allowed origins when `credentials: true` is needed.
- **[HIGH]** Environment secrets from `c.env` returned in error responses or logs → sensitive keys exposed to clients. Never include `c.env` values in response bodies; use structured error messages.
- **[MEDIUM]** Missing CSRF protection on state-mutating routes (POST/PUT/DELETE) → cross-site form submissions accepted from attacker-controlled pages. Implement CSRF token validation or use `SameSite=Strict` cookies.
- **[HIGH]** Path params and query strings used without validation → injection or unexpected behavior in downstream services. Validate all inputs with `@hono/zod-validator` or `zod-openapi`.
- **[MEDIUM]** Error handler exposing internal stack traces to clients → implementation details aid attackers. Register `app.onError()` to return sanitized error responses.

---

## Performance
- **[MEDIUM]** Not using `hono/cache` for cacheable GET responses → repeated requests hit origin unnecessarily, increasing latency and cost on edge deployments. Apply cache middleware with appropriate TTLs.
- **[HIGH]** Streaming not used for large response bodies → entire response buffered in memory before sending, causing high memory pressure. Use `c.stream()` or `streamText()` for large payloads.
- **[MEDIUM]** Middleware registered globally running on all routes including static asset paths → unnecessary processing overhead on every request. Scope middleware to specific route groups.
- **[LOW]** Not using `hono/compress` for response compression → larger payloads increase bandwidth costs and client load times. Add compression middleware for JSON and HTML responses.
- **[HIGH]** Synchronous or blocking operations inside route handlers on edge runtimes → stalls the single-threaded runtime and blocks other requests. Ensure all I/O uses async/await and avoid CPU-heavy work.
- **[MEDIUM]** Not leveraging edge-native caching (e.g., Cloudflare Cache API) for repeated external fetches → latency and cost increase with each cache miss. Cache external API responses at the edge.

---

## Architecture
- **[MEDIUM]** Not using Hono RPC mode (`hc()` client) for end-to-end type safety → API contract drift between server and client goes undetected at compile time. Define typed routes and consume via the Hono RPC client.
- **[HIGH]** Business logic implemented directly in route handlers → handlers become hard to test and reuse. Extract domain logic into service functions injected into handlers as dependencies.
- **[MEDIUM]** Related routes not grouped with sub-app instances → routing structure becomes flat and hard to navigate in large codebases. Use `new Hono()` sub-apps mounted with `app.route(prefix, subApp)`.
- **[HIGH]** `c.env` bindings not typed with the `Env` generic parameter → environment variables accessed as `any`, hiding missing binding errors until runtime. Always type the app as `new Hono<{ Bindings: Env }>()`.
- **[MEDIUM]** Middleware side effects not cleaned up after request → resource leaks accumulate across requests on long-lived edge workers. Ensure middleware releases resources before returning.

---

## Code Quality
- **[HIGH]** Missing `@hono/zod-validator` or `zod-openapi` for input validation → route handlers receive unvalidated user input, leading to runtime errors or security issues. Wrap all route inputs with Zod validation middleware.
- **[MEDIUM]** Error handling not centralized via `app.onError()` → inconsistent error formats returned from different routes confuse API consumers. Register a single global error handler with a consistent error envelope.
- **[MEDIUM]** Response types not annotated with `c.json<T>()` → response shape is untyped, allowing contract drift to go undetected. Use the generic overload of `c.json<T>()` to enforce response types.
- **[LOW]** Not using `hono/logger` middleware for request logging → requests and errors are not tracked, making production debugging difficult. Add the built-in logger or a custom structured logging middleware.
- **[MEDIUM]** Route definitions not co-located with their validation schemas → contract information scattered across files. Keep schema, types, and handler together in domain-scoped route modules.

---

## Common Bugs & Pitfalls
- **[HIGH]** `await c.req.json()` called more than once in a handler or middleware chain → the request body stream is consumed on the first read, returning empty or throwing on subsequent calls. Parse the body once and pass the result forward.
- **[MEDIUM]** `c.env` is undefined when running outside of edge environments (e.g., in unit tests or Node.js) → environment bindings missing causes runtime crashes. Mock `c.env` in tests and guard access with environment checks.
- **[CRITICAL]** Middleware `next()` not awaited → response is sent before downstream middleware and handlers execute, producing incorrect or empty responses. Always `await next()` inside Hono middleware.
- **[MEDIUM]** Path parameter names mismatched between route definition and `c.req.param()` calls → parameter returns undefined silently. Ensure param names in the route pattern exactly match the keys used in handlers.
- **[HIGH]** Not handling `app.notFound()` → unmatched routes return Hono default plain-text 404, inconsistent with the API error format. Register a custom not-found handler to return a structured error.
- **[MEDIUM]** Using `c.header()` after `c.json()` or `c.text()` → headers set after response finalization are silently ignored. Set all headers before calling the response method.
