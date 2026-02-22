# Bun — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: bun, Bun.serve(, Bun.file(, bunfig.toml, bun.lockb, from 'bun'

---

## Security
- **[HIGH]** Bun.serve used without TLS in production → HTTP traffic transmitted in plaintext. Configure TLS with tls: { cert, key } in Bun.serve options or terminate TLS at a reverse proxy.
- **[CRITICAL]** Bun.spawn with user-controlled arguments → attacker injects shell metacharacters or additional arguments to run arbitrary commands. Use a fixed command array and never interpolate user input into spawn arguments.
- **[HIGH]** Bun.file(userPath) without path validation → path traversal allows reading arbitrary files on the server. Resolve the full path and verify it falls within the intended base directory before serving.
- **[CRITICAL]** eval() or new Function() with user-provided input → arbitrary code execution on the server. Never evaluate user input; restructure logic to avoid dynamic code evaluation.
- **[HIGH]** Missing CORS configuration on the Bun HTTP server → cross-origin requests accepted or rejected without policy. Add explicit CORS response headers based on allowed origins in the fetch handler.
- **[HIGH]** Passwords stored or compared without hashing → plaintext passwords exposed on DB breach. Use Bun.password.hash() and Bun.password.verify() for all password storage and comparison.
- **[MEDIUM]** Secrets read from process.env without validation at startup → missing secrets cause runtime errors deep in request handling. Validate all required environment variables at server startup and fail fast with a clear message.
- **[MEDIUM]** WebSocket handlers not validating the origin header → cross-origin WebSocket connections accepted from attacker-controlled pages. Validate the Origin header in the upgrade handler.

---

## Performance
- **[MEDIUM]** Not using Bun.file() streaming for file responses → entire file loaded into memory before sending. Use Bun.file(path) directly as a Response body to enable zero-copy streaming.
- **[HIGH]** Blocking or CPU-heavy synchronous operations in fetch handlers → Bun runs on a single thread per worker; blocking stalls all concurrent requests. Offload CPU-bound work to Bun Worker threads.
- **[MEDIUM]** Not using Bun.build for production bundling → development-mode imports resolved at runtime, increasing startup latency and file read overhead. Run Bun.build as part of the production build step.
- **[MEDIUM]** bun:sqlite not using prepared statements → SQL queries re-parsed on every execution, adding overhead. Create prepared statements with db.prepare() and reuse them across requests.
- **[LOW]** Not using Bun.CryptoHasher for batch hashing instead of Web Crypto API → Web Crypto adds async overhead for simple hashing tasks. Use Bun.CryptoHasher for synchronous, high-throughput hashing.
- **[MEDIUM]** WebSocket message handlers performing synchronous I/O → Bun WS handler blocks the event loop during I/O. Use async handlers and await all I/O operations within WebSocket message handlers.

---

## Architecture
- **[MEDIUM]** Mixing Bun-specific APIs with Node.js compatibility APIs inconsistently → codebase is harder to reason about and may fail when running on Node.js in tests. Choose a target runtime and use its native APIs consistently; isolate compat shims.
- **[LOW]** Not using Bun built-in test runner (bun:test) and relying on Jest or Vitest instead → additional dependencies add to install time and binary size. Migrate to bun:test for native, fast test execution without extra packages.
- **[LOW]** Using process.env instead of Bun.env for environment variable access → Bun.env is typed and faster; process.env is the compat shim. Prefer Bun.env.VARIABLE_NAME in Bun-native code.
- **[MEDIUM]** Not using Bun.serve route patterns instead of manual URL parsing → manual routing is error-prone and slower. Use static: {} for static file serving and routes for API endpoints in Bun.serve config.
- **[MEDIUM]** Not exporting a Bun.serve object from the main file for hot reload compatibility → hot reload does not work with programmatic listen patterns. Export the server config object directly for Bun hot reload to work correctly.

---

## Code Quality
- **[LOW]** Not taking advantage of Bun native TypeScript support and using an extra transpilation step → unnecessary build complexity and slower iteration. Remove tsc/esbuild from the pipeline; Bun runs TypeScript natively.
- **[HIGH]** Bun.password.hash not used for password hashing, using a custom or weaker approach instead → passwords stored with weak or no hashing are exposed on DB breach. Always use Bun.password.hash() which uses bcrypt or argon2 under the hood.
- **[HIGH]** bun.lockb not committed to version control → reproducible installs are broken across environments, leading to dependency version drift. Commit bun.lockb and install with bun install --frozen-lockfile in CI.
- **[MEDIUM]** Not using Bun.sleep instead of setTimeout/Promise-based delays in Bun-native code → minor overhead from wrapping. Use await Bun.sleep(ms) for cleaner async delays in Bun environments.
- **[LOW]** TypeScript strict mode not enabled → implicit any and unsafe type operations go uncaught. Enable strict: true in tsconfig.json to catch type errors at compile time.
- **[MEDIUM]** Not setting Content-Type on manual Response objects → clients may misinterpret the response body. Always set the Content-Type header explicitly on responses that are not created via the Bun Response helpers.

---

## Common Bugs & Pitfalls
- **[HIGH]** Node.js __dirname and __filename undefined in Bun ESM modules → code using these globals fails at runtime. Replace with import.meta.dir and import.meta.file in Bun ESM context.
- **[HIGH]** bun:sqlite transactions not using db.transaction() for multi-step writes → partial writes not rolled back on failure, corrupting data. Wrap all multi-statement writes in db.transaction() for atomicity.
- **[MEDIUM]** Hot reload not working with certain module patterns (e.g., top-level side effects, non-exported servers) → code changes require a full restart. Structure the entry point with an exported default and avoid top-level side effects.
- **[HIGH]** Not handling Bun.serve fetch handler errors → unhandled exceptions in the fetch handler crash the request with a generic error. Wrap the handler body in try/catch and return an appropriate error Response.
- **[MEDIUM]** WebSocket publish called before client subscriptions are established → messages lost because the client is not yet subscribed to the topic. Subscribe the client in the open handler before publishing any messages.
- **[MEDIUM]** Not configuring Bun.serve maxRequestBodySize → default body size limit may be too large or too small for the use case. Set maxRequestBodySize explicitly based on expected payload sizes.
