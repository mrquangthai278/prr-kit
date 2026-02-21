# Express.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `express()`, `app.use(`, `router.get/post/put/delete`, `from 'express'`, `require('express')`

---

## Security

- **[CRITICAL]** Missing authentication middleware on protected routes → unauthenticated access.
- **[CRITICAL]** SQL / NoSQL query built with string interpolation of `req.body` / `req.params` → injection.
- **[CRITICAL]** User input rendered with `res.send(req.body.input)` without sanitization → reflected XSS.
- **[HIGH]** Missing `helmet` middleware → HTTP headers not hardened (X-Frame-Options, CSP, etc.).
- **[HIGH]** `req.body` used without input validation middleware (e.g. express-validator, zod) → arbitrary data reaches business logic.
- **[HIGH]** Error handler exposing stack trace: `res.json({ error: err.stack })` → info disclosure.
- **[HIGH]** Missing rate limiting on auth or sensitive endpoints → brute force.
- **[MEDIUM]** Session secret hardcoded or weak → session hijacking.
- **[MEDIUM]** `res.redirect(req.query.next)` without URL validation → open redirect.
- **[MEDIUM]** CORS `origin: '*'` in production with credentials → credential leakage.

---

## Performance

- **[HIGH]** Synchronous file system operations (`fs.readFileSync`) in route handler → blocks event loop.
- **[HIGH]** No async error handling — `async` route handler without try/catch or `express-async-errors` → unhandled promise rejection crashes process.
- **[MEDIUM]** Missing compression middleware (`compression`) for large JSON responses.
- **[MEDIUM]** No response caching for static/rarely-changing endpoints → unnecessary load.
- **[MEDIUM]** N+1 DB queries per request — loading related data in loop inside route.
- **[LOW]** `morgan` logging middleware active in production with verbose format → I/O overhead.

---

## Architecture

- **[HIGH]** Business logic inside route handler function → extract to service/controller layer.
- **[HIGH]** No centralized error handling middleware (`app.use((err, req, res, next) => {...})`) → inconsistent error responses.
- **[MEDIUM]** All routes in single file (`app.js`) → use `express.Router` to split by domain.
- **[MEDIUM]** Middleware order matters — auth middleware placed after route that should be protected → never runs.
- **[MEDIUM]** `next()` called after `res.send()` / `res.json()` → "Cannot set headers after they are sent" error.
- **[LOW]** Missing `app.set('trust proxy', 1)` behind load balancer → `req.ip` shows wrong IP, rate limiting broken.

---

## Code Quality

- **[HIGH]** `next(err)` not called in catch block → error swallowed, request hangs forever.
- **[MEDIUM]** Route parameters not validated (`req.params.id` used directly as DB key without type check).
- **[MEDIUM]** `res.status(200).json(...)` on errors → client cannot distinguish success from failure.
- **[LOW]** Missing `Content-Type: application/json` header set by `res.json()` — don't use `res.send()` for JSON.

---

## Common Bugs & Pitfalls

- **[HIGH]** Async middleware not calling `next()` on error → request hangs.
- **[HIGH]** Route defined after `app.use(errorHandler)` → never reached.
- **[MEDIUM]** Wildcard route `app.get('*', ...)` placed before specific routes → all specific routes shadowed.
- **[MEDIUM]** `req.body` undefined because `express.json()` middleware not added.
