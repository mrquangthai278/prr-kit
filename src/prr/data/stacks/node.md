# Node.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: node, package.json without framework, require(, process.env, http.createServer, fs., path., __dirname

---

## Security
- **[CRITICAL]** eval() or new Function(userInput) with user-controlled input → arbitrary code execution on the server. Never eval user input; use a sandboxed evaluator or restructure the logic to avoid dynamic code.
- **[CRITICAL]** child_process.exec(userInput) without sanitization → attacker injects shell metacharacters to run arbitrary commands. Use child_process.execFile() with an argument array, or use spawn() with shell: false.
- **[HIGH]** path.join() with user input used in file operations without normalization → path traversal allows reading or writing files outside the intended directory. Resolve the path and verify it starts with the expected base directory.
- **[HIGH]** Prototype pollution via Object.assign({}, req.body) or similar patterns → attacker adds __proto__ properties to poison the object prototype, affecting all downstream code. Use Object.create(null) or a validated schema for body parsing.
- **[CRITICAL]** require(userInput) or dynamic require with user-controlled values → arbitrary module loading gives attacker code execution. Whitelist allowed module names or use a static import map.
- **[HIGH]** fs.readFile(userPath) without path sanitization or whitelisting → attacker reads arbitrary files including sensitive config or credentials. Resolve the full path and verify it falls within the allowed directory.
- **[HIGH]** Missing HTTPS in production → credentials and session tokens transmitted in plaintext. Terminate TLS at the server or a load balancer and redirect all HTTP traffic to HTTPS.
- **[MEDIUM]** Session secrets hardcoded in source code → secrets exposed via version control. Load secrets from environment variables or a secrets manager; never commit them to the repository.

---

## Performance
- **[CRITICAL]** Synchronous fs calls (readFileSync, writeFileSync, statSync) in request handlers → event loop blocked for the duration of the I/O, degrading all concurrent requests. Replace all synchronous fs calls with async equivalents (fs.promises.readFile, etc.).
- **[HIGH]** Unhandled promise rejections causing silent failures → failed async operations go unnoticed, leaving the application in an inconsistent state. Always add .catch() to promise chains or use try/catch with async/await.
- **[HIGH]** setInterval() without clearInterval() in request or module scope → timers accumulate over time, causing a gradual memory leak. Always store timer references and clear them when the associated resource is destroyed.
- **[MEDIUM]** Large Buffer allocations not released after use → GC pressure increases under load as large buffers are held longer than necessary. Release buffers explicitly or use streams for large data transfers.
- **[HIGH]** EventEmitter listeners added on every request without removeListener → listener count grows indefinitely, triggering MaxListenersExceededWarning and causing memory leaks. Add listeners once and clean them up appropriately.
- **[MEDIUM]** Not using streams for reading or writing large files → entire file loaded into memory, causing OOM on large uploads or downloads. Use fs.createReadStream/createWriteStream and pipe() for file I/O.
- **[HIGH]** Missing error handling in middleware pipeline → uncaught errors bypass the error middleware, returning raw stack traces to clients. Ensure all async middleware wraps operations in try/catch and calls next(err).

---

## Architecture
- **[HIGH]** HTTP server logic, business logic, and database calls in one file → code becomes unmaintainable and untestable. Separate into layers: router, controller, service, repository.
- **[HIGH]** Mixing callbacks with async/await inconsistently → callback-style error handling bypassed when async/await used without try/catch, causing silent failures. Adopt async/await throughout and promisify callback APIs with util.promisify.
- **[HIGH]** Global state mutated across modules (e.g., module-level variables modified per request) → race conditions under concurrent requests corrupt shared state. Use request-scoped state (req object or cls-hooked context) rather than globals.
- **[MEDIUM]** Missing graceful shutdown handler for SIGTERM and SIGINT → in-flight requests dropped and database connections not released on process exit. Implement signal handlers that close servers and DB pools before exiting.
- **[MEDIUM]** Not organizing code into modules with clear boundaries → dependencies between unrelated parts of the codebase make refactoring risky. Define module boundaries and expose only what is needed via explicit exports.

---

## Code Quality
- **[MEDIUM]** var used instead of const/let → function-scoped var causes accidental hoisting bugs and leaks variables into wider scopes. Use const by default and let when reassignment is needed.
- **[HIGH]** Missing process.on(uncaughtException) and process.on(unhandledRejection) handlers → unhandled errors crash the process without logging or cleanup. Register global handlers that log the error and gracefully exit.
- **[MEDIUM]** Using callback-based APIs without util.promisify when async/await is used elsewhere → inconsistent error handling style leads to swallowed errors. Wrap callback-based APIs with util.promisify or native promise wrappers.
- **[MEDIUM]** console.log for production logging instead of a structured logger (pino, winston) → logs are unstructured and cannot be queried by log aggregation tools. Replace console.log with a structured logger configured for the environment.
- **[LOW]** Not linting with ESLint or a strict TypeScript config → common bugs and style inconsistencies go uncaught before code review. Configure ESLint with recommended rules and enforce it in CI.
- **[MEDIUM]** Hardcoded port numbers and hostnames instead of environment variables → deploying to different environments requires code changes. Read server configuration from process.env with documented defaults.

---

## Common Bugs & Pitfalls
- **[HIGH]** process.exit() called without waiting for async cleanup → open DB connections, in-flight HTTP requests, and pending writes are abandoned. Use a graceful shutdown sequence that drains connections before calling process.exit().
- **[MEDIUM]** EventEmitter max listeners warning appearing in logs → more listeners than the default limit are attached, indicating a likely memory leak. Investigate listener accumulation; use emitter.setMaxListeners() only after diagnosing the root cause.
- **[HIGH]** Circular require() dependencies causing undefined imports → module exports evaluated before dependencies are resolved, resulting in undefined values at import time. Refactor circular dependencies by extracting shared code into a third module.
- **[MEDIUM]** Timezone issues from new Date() without UTC consideration → date calculations differ across server timezones, causing inconsistent behavior. Always work in UTC internally and convert to local time only at the presentation layer.
- **[HIGH]** Not validating req.body fields after body-parser → missing or malformed fields cause downstream errors or incorrect behavior. Validate all incoming request data with a schema library (zod, joi, ajv) after parsing.
- **[MEDIUM]** DNS lookup not cached for repeated external HTTP requests → DNS resolution adds latency to every external call. Use a keep-alive HTTP agent and ensure the underlying runtime caches DNS lookups appropriately.
