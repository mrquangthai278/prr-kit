# Fiber — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: "github.com/gofiber/fiber", fiber.New(), app.Get(, c.JSON(, c.BodyParser(, fiber.Config{

---

## Security
- **[HIGH]** Missing `helmet` middleware (`github.com/gofiber/helmet`) → no security headers sent, leaving app vulnerable to clickjacking, MIME sniffing, and XSS. Register helmet middleware globally before route handlers.
- **[HIGH]** CSRF middleware not configured on state-mutating routes → cross-site form submissions processed without token validation. Enable CSRF protection for all POST/PUT/PATCH/DELETE routes.
- **[HIGH]** `c.BodyParser` used without a body size limit → large payloads exhaust memory. Configure `fiber.Config{ BodyLimit: 4 * 1024 * 1024 }` to enforce a maximum request body size.
- **[HIGH]** Wildcard CORS configured in production (origin: "*") → cross-origin requests accepted from any domain. Set explicit allowed origins in `cors.Config{ AllowOrigins: "https://yourdomain.com" }`.
- **[CRITICAL]** Path traversal via `c.Params()` values used in file operations → attacker crafts a path to read or overwrite arbitrary files. Sanitize and validate all path parameters before using them in file system calls.
- **[MEDIUM]** Missing authentication middleware on protected route groups → unauthenticated requests reach protected handlers. Use `app.Use()` on route groups to enforce auth before handler execution.
- **[MEDIUM]** Not validating struct fields after `c.BodyParser` → business logic receives zero-value or malformed data. Integrate a validation library (e.g., `go-playground/validator`) after parsing.
- **[MEDIUM]** Sensitive error details returned in HTTP responses → internal paths or DB errors exposed to clients. Return generic error messages and log detailed errors server-side only.

---

## Performance
- **[CRITICAL]** Fiber reuses `*fiber.Ctx` across requests → capturing ctx in a goroutine causes data races and use-after-free bugs. Never pass ctx to goroutines; extract all needed values before launching.
- **[MEDIUM]** Missing compress middleware for large responses → uncompressed JSON or HTML payloads increase bandwidth and client load time. Add `github.com/gofiber/fiber/middleware/compress`.
- **[MEDIUM]** `c.JSON()` marshaling large structs without streaming → entire response buffered in memory. For large datasets, use streaming responses or pagination.
- **[LOW]** `Prefork: true` not used on multi-core servers handling CPU-bound workloads → single process cannot fully utilize available CPU cores. Enable prefork in production environments and test for compatibility.
- **[HIGH]** Synchronous blocking calls (file I/O, external HTTP) inside handlers → Fiber's event loop stalls, degrading all concurrent requests. Use goroutines with proper synchronization for blocking operations.
- **[MEDIUM]** Not using `app.Static()` for serving static files → static assets served through application handlers with unnecessary overhead. Configure the built-in static file middleware for asset serving.

---

## Architecture
- **[MEDIUM]** Not using `app.Group()` for route organization → all routes defined at the top level, making the router file unmanageable as the app grows. Group related routes with common prefixes and middleware.
- **[HIGH]** Business logic implemented directly in handler functions → handlers become untestable and hard to maintain. Extract domain logic into service types with clear interfaces.
- **[MEDIUM]** Custom error handler not set via `app.Use(errorHandler)` → default Fiber error format inconsistent with the application API contract. Define a custom error handler returning the standard error shape.
- **[MEDIUM]** Database connections not managed via dependency injection → global DB instances make testing difficult and hide coupling. Pass DB and service dependencies through closure or a custom handler struct.
- **[LOW]** No middleware for request ID generation → distributed tracing and log correlation are difficult without request IDs. Add a request-ID middleware and propagate it through context and response headers.

---

## Code Quality
- **[HIGH]** Missing input validation after `c.BodyParser` → raw parsed data used without field-level validation, allowing missing or malformed data into business logic. Integrate `go-playground/validator` or equivalent after parsing.
- **[MEDIUM]** `c.Locals()` used as a typed store without type assertions → values retrieved as `interface{}` cause silent nil panics when the type is wrong. Define typed accessor helpers for context locals.
- **[HIGH]** Not handling `c.BodyParser` errors explicitly → parse failures pass a zero-value struct to the handler, corrupting business logic. Always check and return the error from BodyParser.
- **[MEDIUM]** No logging middleware configured → requests and errors go untracked, making production debugging difficult. Add the built-in logger middleware or a structured logging middleware.
- **[LOW]** Not using fiber's built-in timeout middleware → slow handlers hold connections indefinitely. Configure `middleware/timeout` to enforce handler deadlines.
- **[MEDIUM]** Using `fiber.Map` for all responses instead of typed structs → response shape is untyped and prone to field name typos. Define response structs to enforce a stable contract.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** `*fiber.Ctx` captured in a goroutine without copying → ctx is recycled after handler returns, causing reads of garbage data or panics. Use `c.Context().Copy()` or extract needed values before the goroutine.
- **[MEDIUM]** `c.JSON()` called after `c.Next()` in middleware → response already committed by an inner handler, causing "response already sent" errors. Check if response is committed before writing in middleware.
- **[MEDIUM]** Path parameters overlapping between route definitions → ambiguous routes cause the wrong handler to be called. Order routes from most specific to most general and use explicit path segments.
- **[HIGH]** Not handling panics in goroutines spawned from handlers → goroutine panics crash the process and take down all active requests. Recover from panics in goroutines and log or report the error.
- **[MEDIUM]** `app.Listen()` without graceful shutdown → in-flight requests dropped when process exits. Implement signal handling and `app.Shutdown()` for graceful termination.
- **[HIGH]** Not setting `ReadTimeout` and `WriteTimeout` in `fiber.Config` → slow or malicious clients hold connections open indefinitely, exhausting connection slots. Set appropriate timeouts in the Fiber config.
