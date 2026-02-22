# Actix-Web — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: actix-web, HttpServer::new, web::get(), web::post(), App::new(), HttpResponse, #[get(, #[post(

---

## Security
- **[CRITICAL]** Missing authentication middleware on protected routes → unauthenticated requests reach sensitive handlers. Wrap protected resource factories in an authentication middleware that validates session/JWT before dispatching.
- **[CRITICAL]** Shared state in `web::Data<Mutex<T>>` used incorrectly (e.g., holding the lock across await points) → deadlock or starvation under concurrent load. Use `RwLock` for read-heavy state and release locks before any await.
- **[CRITICAL]** SQL injection in raw query strings built with string formatting → attacker-controlled input alters query structure. Always use parameterized queries via sqlx, diesel, or SeaORM.
- **[HIGH]** CORS not configured via `actix-cors` → default behavior may reject legitimate cross-origin requests or accept all origins depending on config. Explicitly configure allowed origins and methods.
- **[HIGH]** No rate limiting → brute-force and DoS attacks succeed without throttling. Integrate a rate-limiting middleware at the `App::wrap()` level.
- **[HIGH]** User input in file paths without sanitization → path traversal allows reading or overwriting arbitrary files on the server. Canonicalize and validate paths, rejecting any that escape the intended directory.
- **[MEDIUM]** Sensitive data returned in error responses → internal paths, DB errors, or stack traces exposed to clients. Return generic error messages externally and log details internally.
- **[MEDIUM]** JWT not validated for expiry, signature, and audience claims → expired or forged tokens accepted. Use a well-tested JWT crate and validate all claims on every request.

---

## Performance
- **[CRITICAL]** Blocking operations (synchronous I/O, CPU-heavy computation) in async handlers → Actix-web worker threads stall, degrading all concurrent requests. Use `web::block()` to run blocking work on a dedicated thread pool.
- **[HIGH]** `Mutex` contention on `web::Data<Mutex<T>>` under load → high-concurrency requests queue waiting for the lock, serializing throughput. Use `RwLock` for read-heavy data or a lock-free structure.
- **[HIGH]** Large request bodies not streamed with `Payload` → entire body loaded into memory before processing, causing high memory pressure. Process large uploads as a stream using the `Payload` extractor.
- **[HIGH]** Not using connection pooling (e.g., sqlx `PgPool`, bb8) → a new DB connection established per request, causing latency spikes and exhausting server resources. Configure and share a connection pool via `web::Data`.
- **[MEDIUM]** Serializing large response structs without streaming → full response buffered in memory before sending. Implement chunked or streaming responses for large datasets.
- **[MEDIUM]** Not configuring worker thread count and async executor appropriately → default settings may not match workload characteristics. Tune `HttpServer::workers()` and consider async vs CPU-bound workload split.

---

## Architecture
- **[HIGH]** Business logic implemented in handler functions → handlers become large, untestable, and tightly coupled to HTTP concerns. Extract logic into service structs and inject them via `web::Data`.
- **[MEDIUM]** Not using `ServiceConfig` for modular route registration → all routes defined in one place, making the app configuration unmanageable. Use `cfg.service()` in per-domain configure functions.
- **[HIGH]** Error types not implementing `ResponseError` → all errors become opaque 500 responses with manual error handling in every handler. Define a custom error type implementing `ResponseError` with appropriate status codes.
- **[MEDIUM]** Using deprecated `App::data()` instead of `App::app_data()` → data registered with the old API may not be accessible in newer middleware. Migrate all state registration to `App::app_data()`.
- **[MEDIUM]** Middleware not reusing allocations across requests → per-request allocations in middleware increase GC pressure under load. Use `Arc` and pre-allocated buffers in middleware implementations.

---

## Code Quality
- **[CRITICAL]** `unwrap()` in handler functions → a panic crashes the Actix worker thread, returning a 500 to all requests on that thread. Replace with proper error propagation using `?` and the `ResponseError` trait.
- **[MEDIUM]** Not using `actix_web::test` utilities for handler testing → tests spin up a real HTTP server, making them slow and fragile. Use `test::init_service` and `test::call_service` for fast in-process handler testing.
- **[MEDIUM]** Missing request logging middleware → requests and errors go untracked in production, making debugging difficult. Add `actix-web::middleware::Logger` or a structured logging middleware.
- **[MEDIUM]** Not validating Content-Type before parsing request body → unexpected content types return a confusing 400 without a clear message. Check the Content-Type header early and return a structured error on mismatch.
- **[LOW]** Not setting keep-alive or connection timeout in server config → idle connections held open indefinitely waste file descriptors. Configure `HttpServer::keep_alive()` appropriately for the workload.
- **[MEDIUM]** Using panic-based error handling (`expect("msg")`) for expected failure modes → panics crash worker threads for recoverable errors. Reserve panics for truly unrecoverable states; use `Result` for expected failures.

---

## Common Bugs & Pitfalls
- **[HIGH]** `web::Data<T>` not registered before handler requires it → every request returns a 500 with "App data is not configured". Register all `web::Data` in the `App::app_data()` call before defining routes.
- **[MEDIUM]** `HttpResponse::Ok()` not finalized with `.finish()` or `.json()` → an empty or incomplete response is sent to the client. Always terminate the response builder with a body method.
- **[HIGH]** Multipart form parsing not handling the field stream correctly with `while let Some(field) = payload.next()` → fields skipped or processing stops at first error. Handle each field in the async loop and propagate errors.
- **[MEDIUM]** `actix::System` blocking calls used inside an async actix-web context → deadlock or panic from nested runtime invocations. Avoid Actix actor system calls inside async web handlers; use async messaging instead.
- **[HIGH]** Not implementing graceful shutdown → in-flight requests dropped when the process receives SIGTERM. Register a signal handler and call `server.stop()` to drain active connections before exiting.
- **[MEDIUM]** Cloning `web::Data<T>` repeatedly in hot paths → unnecessary `Arc` clone overhead accumulates. Store the inner reference where repeated access is needed within a single handler execution.
