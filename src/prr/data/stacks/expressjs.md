# Express.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `express()`, `app.use(`, `router.get/post/put/delete`, `from 'express'`, `require('express')`, `middleware`, `req.body`, `res.json`

---

## Security

- **[CRITICAL]** Missing authentication middleware on protected routes → unauthenticated access.
- **[CRITICAL]** SQL / NoSQL query built with `req.body`/`req.params` string interpolation → injection.
- **[CRITICAL]** `res.send(req.body.input)` without sanitization → reflected XSS.
- **[CRITICAL]** `eval(req.body.code)` or dynamic `require(req.body.module)` → arbitrary code execution.
- **[HIGH]** Missing `helmet` middleware → no security headers (CSP, X-Frame-Options, HSTS).
- **[HIGH]** `req.body` used without validation (express-validator, zod, joi) → arbitrary data reaches logic.
- **[HIGH]** Error handler exposing stack trace: `res.json({ error: err.stack })` → info disclosure.
- **[HIGH]** Missing rate limiting on auth/sensitive endpoints (`express-rate-limit`) → brute force.
- **[HIGH]** File upload without MIME type/size validation → arbitrary file stored/executed.
- **[HIGH]** `res.redirect(req.query.next)` without URL validation → open redirect.
- **[HIGH]** Prototype pollution via `req.body` merged into objects without `Object.freeze(Object.prototype)`.
- **[MEDIUM]** Session secret hardcoded or weak → session hijacking.
- **[MEDIUM]** CORS `origin: '*'` with credentials in production → credential leakage.
- **[MEDIUM]** JWT stored in localStorage instead of httpOnly cookie → XSS token theft.
- **[LOW]** `express.static` serving files from root directory → source code exposure.

---

## Performance

- **[HIGH]** Synchronous `fs.readFileSync` / `crypto.pbkdf2Sync` in route handler → blocks event loop.
- **[HIGH]** `async` route handler without try/catch or `express-async-errors` → unhandled rejection crashes process.
- **[HIGH]** N+1 DB queries per request — loading related data in loop inside route.
- **[HIGH]** Missing response compression (`compression` middleware) for large JSON responses.
- **[HIGH]** No connection pooling for DB → new connection per request → latency + exhaustion.
- **[MEDIUM]** No response caching for idempotent, rarely-changing endpoints.
- **[MEDIUM]** Missing `req.setTimeout()` → hanging requests hold server resources indefinitely.
- **[MEDIUM]** `morgan` verbose logging in production → I/O overhead.
- **[MEDIUM]** Middleware running on all routes including static assets → unnecessary overhead.
- **[LOW]** `res.json` on large objects without streaming → buffering entire payload in memory.

---

## Architecture

- **[HIGH]** Business logic inside route handler → extract to service/controller layer.
- **[HIGH]** No centralized error handling middleware (`app.use((err, req, res, next) => {...})`) → inconsistent errors.
- **[HIGH]** Middleware order wrong — auth middleware placed after route it should protect → never runs.
- **[HIGH]** `next()` called after `res.send()` / `res.json()` → "Cannot set headers after they are sent" error.
- **[HIGH]** Not using `express.Router` per domain → all routes in single file → unmaintainable.
- **[MEDIUM]** Missing `app.set('trust proxy', 1)` behind load balancer → wrong `req.ip`, rate limiting broken.
- **[MEDIUM]** `app.use(express.json())` with no size limit → large payload DoS. Set `{ limit: '1mb' }`.
- **[MEDIUM]** Global state (module-level variables) used for request-scoped data → not isolated per request.
- **[MEDIUM]** Not using `AsyncLocalStorage` for request context propagation → prop drilling `req` everywhere.
- **[LOW]** Missing `404` catch-all handler at end of middleware chain.

---

## Code Quality

- **[HIGH]** `next(err)` not called in catch block → error swallowed, request hangs.
- **[HIGH]** Route params used directly as DB keys without type validation → `req.params.id` is always a string.
- **[MEDIUM]** `res.status(200).json(...)` on errors → client can't distinguish success from failure.
- **[MEDIUM]** Inconsistent response shape across routes → no standard `{ data, error }` envelope.
- **[MEDIUM]** Missing `await` on async middleware → middleware completes without waiting for async work.
- **[MEDIUM]** Not using TypeScript with `@types/express` → `req.body` is `any`.
- **[LOW]** `res.send()` for JSON responses instead of `res.json()` → must manually set Content-Type.
- **[LOW]** Not using environment-specific config (`dotenv` without validation).

---

## Common Bugs & Pitfalls

- **[HIGH]** Async middleware not calling `next()` on error → request hangs indefinitely.
- **[HIGH]** Route defined after `app.use(errorHandler)` → error handler intercepts all subsequent routes.
- **[HIGH]** Error-handling middleware with only 3 params `(req, res, next)` → Express doesn't recognize as error handler (needs 4: `err, req, res, next`).
- **[HIGH]** `app.use(express.json())` placed after route definition → `req.body` undefined.
- **[MEDIUM]** Wildcard route `app.get('*', ...)` placed before specific routes → all specific routes shadowed.
- **[MEDIUM]** `router.param()` not used for common param validation → repeated `parseInt(req.params.id)`.
- **[MEDIUM]** Cookie options (`httpOnly`, `secure`, `sameSite`) not set → vulnerable session cookies.
- **[MEDIUM]** `res.end()` vs `res.send()` vs `res.json()` confusion → wrong Content-Type header.
- **[LOW]** `app.listen()` not storing returned server for graceful shutdown.
- **[LOW]** `express-validator` errors not checked with `validationResult(req)` → validation runs but not enforced.
