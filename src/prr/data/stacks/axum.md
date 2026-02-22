# Axum — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: axum, Router::new(), axum::extract, tower, tokio, async fn handler, State<

---

## Security
- **[CRITICAL]** Missing authentication layer or middleware on protected routes → unauthenticated requests reach sensitive handlers. Wrap protected routes in an authentication middleware using Tower layers.
- **[HIGH]** `Path` and `Query` extractors trusted without validation → raw user input flows into business logic unchecked. Validate extractor values with a validation crate (e.g., `validator`) in the handler.
- **[HIGH]** SSRF via user-controlled URLs in server-side HTTP requests → attacker triggers requests to internal services or cloud metadata endpoints. Validate and whitelist allowed URL schemes and hosts before fetching.
- **[HIGH]** Missing CORS configuration via `tower-http::cors` → default behavior rejects all cross-origin requests or is too permissive depending on config. Explicitly configure allowed origins, methods, and headers.
- **[CRITICAL]** SQL injection via string formatting in sqlx queries → user input alters query structure. Always use parameterized queries with `query!` or `query_as!` macros in sqlx.
- **[MEDIUM]** Secret management via environment variables not validated at startup → missing secrets cause runtime panics deep in request handling. Validate all required environment variables at startup and panic early with a clear message.
- **[HIGH]** JWT or session tokens not validated for expiry and signature → expired or forged tokens accepted. Use a well-tested JWT library and validate claims (exp, iss, aud) on every request.
- **[MEDIUM]** User-supplied filenames used in file system operations without sanitization → path traversal allows reading or overwriting arbitrary files. Canonicalize paths and reject any that escape the intended directory.

---

## Performance
- **[CRITICAL]** Blocking operations (`std::fs`, `std::thread::sleep`, synchronous network calls) inside async handlers → Tokio runtime thread stalls, starving all other tasks. Use `tokio::fs`, `tokio::time::sleep`, and async I/O throughout.
- **[HIGH]** Missing `tower::limit::ConcurrencyLimit` or similar for expensive handlers → unbounded concurrent requests overwhelm downstream services or exhaust resources. Apply concurrency limits on resource-intensive endpoints.
- **[HIGH]** Large payloads not streamed, loaded fully into memory → high memory pressure under concurrent load. Use `axum::body::Body` streaming or chunked transfer for large uploads and downloads.
- **[MEDIUM]** No HTTP response caching layer for idempotent endpoints → repeated identical requests hit the database or compute layer unnecessarily. Add `tower-http::set-header` or a caching proxy layer.
- **[MEDIUM]** Database connection pool not configured (min/max connections, timeouts) → pool exhaustion under load causes request queuing and timeouts. Configure `sqlx::PgPoolOptions` with realistic bounds.
- **[HIGH]** CPU-bound computation (hashing, encoding, compression) run on the async runtime → blocks the Tokio thread pool. Offload to `tokio::task::spawn_blocking` for CPU-heavy work.

---

## Architecture
- **[HIGH]** Shared state not wrapped in `Arc<T>` when used across handlers → clone overhead or borrow errors at compile time, or incorrect shared mutable state. Use `Arc<T>` for shared read-only state and `Arc<RwLock<T>>` for mutable state.
- **[MEDIUM]** Handler functions growing too large with mixed concerns → handlers become hard to read, test, and reuse. Extract business logic into service types and call them from thin handler functions.
- **[HIGH]** Error types not implementing `IntoResponse` → all handler errors returned as opaque 500 responses with no detail. Define a custom error type implementing `IntoResponse` with appropriate status codes and messages.
- **[MEDIUM]** Not using Tower middleware layers for cross-cutting concerns (logging, tracing, auth) → each handler re-implements the same boilerplate. Apply concerns as Tower layers via `Router::layer()`.
- **[MEDIUM]** Route organization not modular → all routes defined in one file, making navigation difficult in large codebases. Split routes into domain modules and merge them in the main router.
- **[LOW]** Not using `axum::extract::State` in favor of `Extension` → `Extension` panics at runtime if not added; State catches missing state at compile time. Prefer typed `State<T>` extractors.

---

## Code Quality
- **[LOW]** Missing `#[derive(Debug)]` on custom error and state types → debugging and logging produce unhelpful output. Derive Debug on all domain types.
- **[CRITICAL]** `unwrap()` or `expect()` in handler code → panics in async context crash the handler task and return a 500 with no diagnostic. Replace with proper error propagation using `?` and `IntoResponse`.
- **[MEDIUM]** `anyhow::Error` returned directly from handlers instead of typed errors → response leaks internal error detail and response codes are always 500. Map errors to typed responses at the handler boundary.
- **[MEDIUM]** Extractor ordering in handler signatures not matching Axum requirements → compilation fails or extractors consume the body before others can read it. Consult Axum extractor ordering docs; `Json` must be last.
- **[MEDIUM]** Not using `#[axum::debug_handler]` during development → type errors in handler signatures produce cryptic compiler messages. Add the attribute during development for better diagnostics.
- **[LOW]** Not enabling Tower tracing middleware (`tower-http::trace`) → request/response logging absent in production. Add `TraceLayer::new_for_http()` to the router.

---

## Common Bugs & Pitfalls
- **[HIGH]** `Extension` extractor used without adding extension to the router → every request to that route returns a 500 with a confusing error message. Switch to typed `State<T>` extractors which are checked at router construction.
- **[MEDIUM]** `Json` extractor returning 422 with no body for content-type mismatch → clients receive an opaque error. Add a custom rejection handler via `.layer(HandleErrorLayer...)` to return structured error bodies.
- **[MEDIUM]** `State` not derived from `Clone` → compiler error or accidental deep clone overhead on every request. Implement `Clone` on state types or wrap in `Arc`.
- **[HIGH]** Timeout middleware not configured → slow upstream calls hold connections open indefinitely, exhausting worker capacity. Add `tower::timeout::TimeoutLayer` with a reasonable timeout per route group.
- **[HIGH]** Not propagating request cancellation via context → abandoned requests continue consuming resources after the client disconnects. Use `tokio::select!` or check cancellation tokens in long-running operations.
- **[MEDIUM]** Missing graceful shutdown handling → in-flight requests dropped on SIGTERM. Implement a shutdown signal handler and use `axum::Server::with_graceful_shutdown` to drain active connections.
