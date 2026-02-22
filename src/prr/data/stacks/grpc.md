# gRPC — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: grpc, .proto files, protoc, grpc-js, grpcio, google.golang.org/grpc, @grpc/grpc-js, protobuf

---

## Security
- **[CRITICAL]** gRPC server not configured with TLS → all traffic transmitted in plaintext over the network. Configure mutual TLS or server-side TLS for all production gRPC servers.
- **[CRITICAL]** No authentication interceptor → unauthenticated calls accepted by all service methods. Add a server interceptor that validates JWT, mTLS certificate, or API key on every incoming RPC.
- **[HIGH]** Metadata headers not validated for auth tokens → auth data present in metadata but not verified, allowing forged tokens. Extract and validate tokens from incoming metadata in the auth interceptor.
- **[HIGH]** Server reflection enabled in production → attackers can enumerate all service definitions and methods, aiding targeted attacks. Disable server reflection in production; enable only in development.
- **[HIGH]** Unvalidated proto message fields → missing required field validation allows invalid data into business logic, causing panics or incorrect behavior. Use protoc-gen-validate or protovalidate to enforce field constraints.
- **[HIGH]** SSRF via server-side gRPC calls to user-provided service addresses → attacker routes internal requests to arbitrary targets. Validate and whitelist allowed gRPC endpoints before dialing.
- **[MEDIUM]** Error messages in gRPC status details exposing internal implementation → stack traces or DB errors sent to clients aid attackers. Return sanitized error messages; log detailed errors server-side only.
- **[MEDIUM]** Insufficient input size limits on streaming RPCs → oversized messages exhaust server memory. Configure max message size limits on the server and validate message sizes in streaming handlers.

---

## Performance
- **[HIGH]** Unary RPC used for streaming use cases (large result sets, real-time events) → high latency and excessive overhead from repeated round-trips. Use server-streaming or bidirectional-streaming RPCs for continuous data flows.
- **[HIGH]** Large proto messages not using field streaming or chunking → entire payload buffered in memory, causing high latency and memory pressure. Break large payloads into streaming chunks or paginate with server-streaming.
- **[HIGH]** Client connection not reused across calls → TLS handshake and TCP connection established per call, adding significant latency. Create a single gRPC client connection or connection pool and reuse it.
- **[HIGH]** Missing deadline or timeout on every RPC call → slow or unresponsive servers hold goroutines/threads indefinitely, exhausting client resources. Always set a deadline via context: ctx, cancel := context.WithTimeout(ctx, 5*time.Second).
- **[MEDIUM]** No client-side load balancing configured → all calls routed to a single server instance, negating horizontal scaling. Configure gRPC client-side load balancing (round-robin, pick-first) or use a service mesh.
- **[MEDIUM]** Not retrying idempotent RPCs on transient failures → network blips cause unnecessary failures for safe-to-retry operations. Configure retry policy or implement exponential backoff for UNAVAILABLE and DEADLINE_EXCEEDED errors.
- **[LOW]** Not enabling gzip compression for large message payloads → large proto messages consume excess bandwidth. Enable compression codec on both client and server for message-heavy services.

---

## Architecture
- **[MEDIUM]** Proto definitions not in a separate shared proto repository or directory → service teams duplicate definitions, leading to drift and incompatibility. Centralize proto files in a shared repo with versioned packages.
- **[HIGH]** Breaking proto changes (renaming fields, changing field numbers, removing fields) without versioning → existing clients break when server updates. Create new package versions (v2, v3) for breaking changes; never alter field numbers.
- **[HIGH]** Business logic in gRPC server handler methods instead of a service layer → handlers become untestable monoliths. Extract domain logic into service types and call them from thin handler methods.
- **[MEDIUM]** Not using interceptors for logging, tracing, and metrics → observability data absent, making production debugging difficult. Add unary and streaming interceptors for structured logging, OpenTelemetry tracing, and Prometheus metrics.
- **[MEDIUM]** Proto-generated code committed to the repository instead of generated in CI → generated code drifts from proto definitions when developers forget to regenerate. Run protoc as a CI step and check for uncommitted changes.

---

## Code Quality
- **[MEDIUM]** Generated proto code committed to repo instead of generated in CI → generated files drift from proto source when developers forget to regenerate. Add proto compilation to CI and fail the build on uncommitted generated changes.
- **[HIGH]** Missing protoc-gen-validate or protovalidate for field-level validation → business logic receives invalid field values (empty required strings, out-of-range numbers). Add validation annotations to proto files and enforce them at the RPC boundary.
- **[MEDIUM]** gRPC status codes not semantically correct (e.g., INTERNAL returned for NOT_FOUND) → clients cannot distinguish error categories to implement correct retry or fallback logic. Map domain errors to appropriate gRPC status codes (NOT_FOUND, INVALID_ARGUMENT, etc.).
- **[LOW]** Not documenting proto service and message fields with comments → API consumers cannot understand expected values or semantics without reading source code. Add proto comment annotations; use buf.build or similar for generated API docs.
- **[MEDIUM]** Not using well-known types (google.protobuf.Timestamp, google.protobuf.Duration) for time fields → custom time representations lead to parsing bugs across language implementations. Use official well-known proto types for temporal data.
- **[MEDIUM]** Service definitions not following proto naming conventions → inconsistent naming confuses consumers and makes tooling harder. Follow Google API design guide naming conventions for RPCs, fields, and enums.

---

## Common Bugs & Pitfalls
- **[HIGH]** Deadline not propagated from the incoming parent context to downstream RPC calls → child calls run past the parent deadline, consuming resources after the client has given up. Always derive child contexts from the incoming request context.
- **[HIGH]** ClientConn not closed after use → goroutines and TCP connections leak indefinitely. Always defer conn.Close() after creating a gRPC client connection.
- **[MEDIUM]** Streaming server not sending an error status before closing the stream → client receives an EOF with no error context, making debugging difficult. Send a non-OK status via stream.SendMsg or return an error from the handler before returning.
- **[MEDIUM]** Proto oneof fields not handled exhaustively in switch statements → new oneof variants introduced in future proto versions silently fall through to a default case. Add a default branch that logs an unknown variant warning.
- **[HIGH]** Not handling stream context cancellation in server-streaming handlers → handlers continue sending after the client disconnects, wasting server resources. Check stream.Context().Done() in the streaming loop and exit cleanly.
- **[MEDIUM]** Reusing proto message structs across goroutines without copying → concurrent mutation of proto messages causes data races. Clone proto messages before passing to goroutines using proto.Clone().
