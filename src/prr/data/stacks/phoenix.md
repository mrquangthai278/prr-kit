# Phoenix — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: Phoenix, use Phoenix.Router, use Phoenix.Controller, use Phoenix.LiveView, mix phx, *.ex with Plug

---

## Security
- **[CRITICAL]** Missing authentication plug before protected pipelines → unauthenticated requests reach protected controllers and LiveViews. Add an auth plug to the `:browser` or `:api` pipeline before route scopes that require authentication.
- **[CRITICAL]** CSRF token verification disabled or bypassed on form submissions → cross-site requests processed without token validation. Never disable `Plug.CSRFProtection`; ensure forms include the CSRF meta tag.
- **[CRITICAL]** SQL injection via raw Ecto queries with string interpolation → attacker-controlled input alters query structure. Always use parameterized Ecto queries; never interpolate user input directly into query strings.
- **[HIGH]** `send_file` with a user-controlled path → attacker crafts a path to read arbitrary server files. Validate and sanitize file paths; serve files from a whitelist of allowed directories.
- **[MEDIUM]** Missing Content Security Policy headers → XSS attacks can execute arbitrary scripts in the browser. Configure CSP headers in the Plug pipeline or via the `Phoenix.Controller.put_secure_browser_headers/2` helper.
- **[HIGH]** LiveView event handlers not verifying user identity → any authenticated user can trigger events belonging to other users. Validate that `socket.assigns.current_user` has permission for every handle_event action.
- **[HIGH]** Not scoping Ecto queries to the current user → users can access or modify other users data by guessing IDs (IDOR). Always filter queries with the current user context (e.g., `from(p in Post, where: p.user_id == ^user_id)`).
- **[MEDIUM]** Storing sensitive data in LiveView socket assigns → assigns visible in client-side inspection of LiveView state. Store minimal data in assigns; keep sensitive state server-side and use opaque references.

---

## Performance
- **[HIGH]** N+1 queries from Ecto associations not preloaded with `Repo.preload` → one query per record executed in a loop, causing exponential DB load. Use `Repo.preload/2` or eager-load associations in the initial query.
- **[MEDIUM]** LiveView sending full page state on every change instead of targeted `push_event` → excessive data transferred over the WebSocket on minor updates. Use granular diff-based updates and `push_event` for targeted client updates.
- **[HIGH]** No PubSub topic cleanup on LiveView termination → subscriptions accumulate in memory after a client disconnects, causing a slow memory leak. Unsubscribe from PubSub topics in the `terminate/2` callback.
- **[HIGH]** Missing database indexes for columns used in frequent WHERE and JOIN clauses → full table scans on every query degrade performance as data grows. Add indexes via Ecto migrations for all frequently filtered columns.
- **[MEDIUM]** Presence tracking on high-traffic channels without cleanup → stale presence entries accumulate when clients disconnect unexpectedly. Configure Phoenix Presence with appropriate TTLs and handle disconnects.
- **[HIGH]** Not paginating large Ecto query results → loading thousands of records into memory on a single request causes latency spikes and OOM risk. Apply `limit/offset` or cursor-based pagination on all list queries.

---

## Architecture
- **[HIGH]** Business logic in controllers instead of Phoenix context modules → controllers become fat and domain logic is scattered, making testing difficult. Move data access and business rules into context modules (e.g., `Accounts`, `Posts`).
- **[HIGH]** Ecto changesets not used for all data validation → data inserted or updated without field-level validation, allowing invalid data into the DB. Use changesets for every data modification path, including internal ones.
- **[MEDIUM]** Channels not scoped to per-user or per-resource topics → broadcasts reach unintended subscribers, leaking data across user sessions. Namespace topics with user or resource identifiers (e.g., `"room:"+room_id`).
- **[MEDIUM]** LiveView handle_event growing too large with many clauses → event handler becomes hard to navigate and test. Extract complex event handling into delegate functions or separate LiveComponent modules.
- **[MEDIUM]** Not using Phoenix.Token for signed, time-limited tokens in URLs → unsigned tokens can be forged or reused. Use `Phoenix.Token.sign/3` and `Phoenix.Token.verify/4` for URL-embedded tokens.

---

## Code Quality
- **[HIGH]** Missing changeset validations, relying only on database constraints → invalid data generates DB exceptions instead of user-friendly validation errors. Define all validation rules in changesets before DB insertion.
- **[MEDIUM]** Not using the with macro for multi-step operations that can fail → nested case statements for sequential operations become deeply indented and error-prone. Use with to chain operations and handle errors at one exit point.
- **[MEDIUM]** Not using Phoenix.Token for signed data passed to clients (e.g., invite links, email verification) → unsigned tokens can be tampered with. Use Phoenix.Token.sign and verify with appropriate max_age.
- **[MEDIUM]** LiveView assigns not correctly populated via assign/3 or assign_new/3 → accessing undefined assigns in templates raises a KeyError. Always initialize all assigns in mount and update them via assign/3.
- **[LOW]** Not using LiveView streams for large lists → full list sent to client on every update, increasing bandwidth. Use LiveView stream/3 for efficient, incremental list updates.
- **[MEDIUM]** Returning large binaries from controllers without streaming → entire response buffered in memory. Use send_chunked/2 or serve large files directly with send_file/3.

---

## Common Bugs & Pitfalls
- **[HIGH]** Repo.get! raising Ecto.NoResultsError in a controller → unhandled exception returns a 500 instead of a 404. Use Repo.get/3 and handle the nil case explicitly, returning a 404 response.
- **[CRITICAL]** LiveView socket not authenticated in mount/3 → the LiveView is accessible to unauthenticated users. Always check socket.assigns.current_user in mount and redirect if not authenticated.
- **[HIGH]** Phoenix.PubSub broadcast without topic namespacing → messages reach unintended subscribers across different users or tenants. Always include a user or resource identifier in the topic string.
- **[HIGH]** Ecto cast/3 vs change/2 confusion → using change bypasses field whitelisting, allowing arbitrary field updates. Use cast/3 with an explicit list of permitted fields for all user-supplied data.
- **[MEDIUM]** PubSub subscriptions not re-established after LiveView reconnect → subscriptions lost after a client reconnect, causing missed messages. Re-subscribe in the handle_params or mount callback on reconnect.
- **[MEDIUM]** Unhandled {:error, changeset} in context functions → callers receive a match error instead of a structured error response. Always pattern-match on {:ok, result} and {:error, changeset} in controllers.
