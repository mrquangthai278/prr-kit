# Socket.IO — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from 'socket.io'`, `from 'socket.io-client'`, `io.on(`, `socket.emit(`, `socket.join(`, `io.to(`

---

## Security
- **[CRITICAL]** No authentication middleware on `io.use()` → anonymous WebSocket connections accepted, bypassing all auth. Implement JWT or session validation in a `io.use((socket, next) => { ... })` middleware and call `next(new Error('unauthorized'))` on failure.
- **[CRITICAL]** No authorization check before `socket.join(room)` → any connected user can join any room including private or admin rooms. Validate room membership against user roles/permissions before calling `join`.
- **[HIGH]** User-supplied event payloads broadcast directly without sanitization → XSS when received data is rendered in the browser. Sanitize or validate all incoming event data with a schema library (Zod, Joi) before processing or broadcasting.
- **[HIGH]** No rate limiting on socket event handlers → malicious client floods the server with events causing DoS. Implement per-socket rate limiting with `socket.io-rate-limiter` or a token bucket in middleware.
- **[HIGH]** `socket.id` used as a persistent user identifier for authorization decisions → `socket.id` changes on reconnect and is not authenticated. Map authenticated user ID (from JWT/session) to socket ID server-side; never trust `socket.id` as identity.
- **[MEDIUM]** Authentication tokens passed in WebSocket handshake query string `?token=...` → tokens logged in plaintext by proxies, load balancers, and server access logs. Pass tokens in the `auth` handshake object: `io({ auth: { token } })` and read from `socket.handshake.auth`.

---

## Performance
- **[HIGH]** `io.emit(event, data)` used for updates relevant to only one user → payload broadcast to all connected clients. Use `io.to(socket.id).emit()` or `socket.emit()` for single-user targeted events.
- **[HIGH]** Large data payloads sent on high-frequency events (position updates, typing indicators) → network saturation. Batch updates and send at a fixed interval, or use the `volatile` flag for non-critical data that can be dropped.
- **[MEDIUM]** Rooms and namespaces not used to segment message routing → all events evaluated by all handlers regardless of relevance. Group related sockets into rooms and use namespaces to separate distinct features (chat, notifications).
- **[MEDIUM]** `volatile` flag not used for real-time data that is acceptable to drop (game position, cursor position) → guaranteed delivery overhead on high-frequency low-importance events. Use `socket.volatile.emit()` for best-effort real-time data.
- **[MEDIUM]** `perMessageDeflate` compression not configured → large repeated JSON payloads sent uncompressed. Enable `perMessageDeflate: { threshold: 1024 }` on the server for large message payloads.
- **[LOW]** Binary data (images, audio) serialized to Base64 JSON strings → 33% size overhead. Send binary as `Buffer` or `ArrayBuffer`; Socket.IO handles binary frames natively.

---

## Architecture
- **[HIGH]** Business logic (database queries, email sending, payment processing) written directly inside socket event handlers → untestable, non-reusable, and violates separation of concerns. Extract to service layer functions called from handlers.
- **[HIGH]** Per-socket state stored only in JavaScript closure variables → state lost on server restart or when socket reconnects to a different server node. Store user/session state in Redis or a shared database; use `socket.io-redis` adapter for multi-node deployments.
- **[HIGH]** Client-side reconnection logic absent → after disconnect, client does not re-subscribe to rooms or re-sync state. Handle the `connect` event on the client to re-authenticate and re-join relevant rooms after reconnection.
- **[MEDIUM]** All event handlers registered in a single monolithic connection handler → hundreds of `socket.on()` calls in one file. Organize handlers into feature modules and register them via a router pattern.
- **[MEDIUM]** Socket.IO server not separated from the Express HTTP server into its own module → tight coupling makes testing and scaling difficult. Attach `io` to the HTTP server but encapsulate socket logic in a separate module.
- **[LOW]** No versioning strategy for socket events → breaking changes to event schemas break all connected clients simultaneously. Namespace events by version or use a versioned handshake field.

---

## Code Quality
- **[HIGH]** Socket event names and payload shapes not typed → `socket.on('event', (data: any) => ...)` with no contract. Define a typed event map interface and use Socket.IO's generic type parameters: `Socket<ClientToServerEvents, ServerToClientEvents>`.
- **[MEDIUM]** Event listeners added inside `io.on('connection')` not removed on `disconnect` → handlers accumulate per reconnection causing memory leaks and duplicate processing. Use `socket.once` for one-time handlers or explicitly call `socket.off()` in the disconnect handler.
- **[MEDIUM]** `socket.emit` used for critical operations (payment, account change) without an acknowledgment callback → no confirmation that the client received the message. Use acknowledgments `socket.emit('event', data, (ack) => { ... })` for operations requiring delivery confirmation.
- **[MEDIUM]** Error events not emitted back to client on handler failure → client has no way to detect server-side errors and cannot show meaningful feedback. Emit structured error events `socket.emit('error', { code, message })` on failure.
- **[LOW]** `console.log` statements in production socket event handlers → high-traffic servers generate log flood making logs unusable. Replace with a structured logger (`pino`, `winston`) with appropriate log levels.

---

## Common Bugs & Pitfalls
- **[HIGH]** Event listener registered inside `io.on('connection')` not scoped to the socket → using `io.on(event)` instead of `socket.on(event)` broadcasts to all sockets, not just the connected one.
- **[HIGH]** Missing `'error'` event handler on the socket → unhandled error events crash the Node.js process in older versions or cause silent failures. Always attach `socket.on('error', handler)`.
- **[HIGH]** Room membership not persisted → after server restart or when using multiple server nodes without a Redis adapter, users lose room membership. Use `socket.io-redis` adapter and re-join rooms on reconnect.
- **[MEDIUM]** `socket.broadcast.emit()` vs `io.emit()` confusion → `broadcast` excludes the sender while `io.emit` includes all clients including the sender. Choose based on whether the emitting client should receive its own message.
- **[MEDIUM]** Binary data sent via `JSON.stringify` as a JSON string instead of passing a `Buffer` directly → Socket.IO serializes Buffer as binary frame automatically; wrapping in JSON defeats this and adds encoding overhead.
- **[MEDIUM]** `socket.rooms` set iterated immediately after `socket.join()` before join completes in async context → room not yet in set. `socket.join()` is synchronous in Socket.IO v4 but was async in v2/v3; verify version behavior.
- **[LOW]** Client `socket.io` version not matching server version → protocol mismatches cause silent connection failures or degraded behavior. Pin client and server versions together and update in lockstep.
