# Gin — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: "github.com/gin-gonic/gin", gin.Default(), gin.New(), c.JSON(, c.ShouldBindJSON, r.GET(, r.POST(

---

## Security
- **[CRITICAL]** `c.ShouldBind` used without validation struct tags → unvalidated user input reaches business logic. Always define and enforce validation tags (`binding:"required"`, `validate:"email"`, etc.) on all bound structs.
- **[CRITICAL]** SQL injection via `fmt.Sprintf` in database queries → attacker-controlled input alters query structure. Always use parameterized queries or an ORM with prepared statements.
- **[HIGH]** Missing CORS configuration or wildcard CORS (`"*"`) in production → cross-origin requests accepted from any domain. Configure explicit allowed origins via gin-cors middleware.
- **[HIGH]** No rate limiting middleware → DoS attacks succeed without throttling. Integrate a rate limiter such as `golang.org/x/time/rate` or a middleware library.
- **[HIGH]** Server binding to `0.0.0.0` in production without TLS → traffic transmitted in plaintext over network. Terminate TLS at the load balancer or configure `tls.ListenAndServeTLS`.
- **[HIGH]** SSRF via user-controlled URL in proxy or fetch handlers → attacker triggers requests to internal services. Validate and whitelist allowed URL schemes and hosts before making server-side requests.
- **[MEDIUM]** Sensitive data (tokens, passwords) logged in debug mode → secrets appear in log files accessible to operators. Use structured logging with field redaction and disable debug logs in production.
- **[MEDIUM]** Missing input length limits on string fields → oversized payloads cause excessive memory allocation or ReDoS in regex validators. Enforce maximum lengths in validation tags or middleware.

---

## Performance
- **[HIGH]** Debug mode (`gin.Default()`) used in production → verbose logging and color output add unnecessary overhead. Use `gin.New()` with explicit middleware and set `GIN_MODE=release`.
- **[MEDIUM]** No response caching for static or slow-changing data → repeated expensive queries for identical data on every request. Add cache-control headers or an in-memory cache layer.
- **[MEDIUM]** Synchronous database calls in handlers without goroutines for independent queries → sequential round-trips increase total response latency. Use goroutines with `errgroup` for parallel independent DB calls.
- **[MEDIUM]** Large JSON marshaling of full structs without streaming → entire response built in memory before sending. For very large datasets, use streaming encoders or pagination.
- **[LOW]** Missing gzip middleware for large responses → uncompressed payloads increase bandwidth and client latency. Add `github.com/gin-contrib/gzip` to the middleware stack.
- **[MEDIUM]** Allocating large slices with fixed capacity inside handlers → GC pressure accumulates under load. Pre-allocate with realistic capacity estimates or use sync.Pool for reusable buffers.
- **[MEDIUM]** Not using Gin route groups for common middleware (e.g., auth, logging) → middleware applied redundantly or inconsistently across routes. Use `r.Group()` with shared middleware.

---

## Architecture
- **[HIGH]** Business logic implemented in handler functions instead of a service layer → handlers become large, untestable, and tightly coupled to HTTP. Extract logic into service structs with well-defined interfaces.
- **[HIGH]** Not using dependency injection → hardcoded global DB connections and singletons make testing impossible and hide coupling. Pass dependencies (DB, logger, services) through handler structs or closures.
- **[MEDIUM]** Route groups not organized by domain or API version → route file becomes a flat, unnavigable list as the app grows. Group related routes with `r.Group("/api/v1/")` and domain prefixes.
- **[MEDIUM]** Middleware not scoped appropriately to route groups → auth or logging middleware applied globally when only needed for specific paths. Attach middleware at the group level, not globally.
- **[MEDIUM]** No graceful shutdown handling → in-flight requests dropped when the process receives SIGTERM. Implement `srv.Shutdown(ctx)` on SIGTERM/SIGINT signals.
- **[LOW]** Single router file containing all route definitions → file grows unwieldy in large applications. Split route registration into per-domain files and register them in the main router setup.

---

## Code Quality
- **[HIGH]** Missing `binding:"required"` tags on struct fields → optional fields treated as present when absent, leading to zero-value data passing validation silently. Tag all required fields explicitly.
- **[MEDIUM]** Not using `c.Error()` for error accumulation during request processing → multiple errors not collected, only the last one surfaced. Use `c.Error(err)` and a centralized error handler middleware.
- **[MEDIUM]** Handler returning `nil` error for all code paths → callers cannot differentiate success from business-logic errors. Return meaningful typed errors and let the error handler map them to HTTP status codes.
- **[HIGH]** `c.Abort()` not called after `c.JSON()` in error path → handler chain continues executing after error response is sent. Always call `c.Abort()` when sending an early response in middleware.
- **[MEDIUM]** Missing API versioning strategy → breaking changes break existing clients without warning. Use route groups with version prefixes (`/api/v1`) and document deprecation timelines.
- **[LOW]** Not using Gin's custom validator tags via `validator.RegisterValidation` → complex validation rules duplicated across handlers. Register custom validators once and reference them via struct tags.

---

## Common Bugs & Pitfalls
- **[MEDIUM]** Confusing `c.ShouldBindJSON` with `c.BindJSON` → `c.BindJSON` writes a 400 response automatically on error, preventing custom error handling. Prefer `c.ShouldBindJSON` and handle errors explicitly.
- **[CRITICAL]** Handler goroutine using `c *gin.Context` after the request ends → Gin reuses context objects, causing data races and panics. Copy needed values before launching goroutines; never pass `c` directly.
- **[MEDIUM]** `gin.Recovery()` swallowing panics silently in production without custom handler → panics logged at error level but client gets a generic 500 with no alerting. Replace with a custom recovery middleware that triggers alerting.
- **[LOW]** Route params and paths being case-sensitive with trailing slash issues → clients get unexpected 404s due to URL casing or missing slash. Configure `RedirectTrailingSlash` and document case sensitivity.
- **[HIGH]** Not validating `Content-Type` header before binding → unexpected content type causes a 400 error that is hard to debug. Check content-type early and return a clear error message.
- **[MEDIUM]** Ignoring errors from `c.JSON()` or `c.String()` → write failures go undetected. Log write errors or use a response wrapper that captures write errors.
