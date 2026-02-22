# Supabase — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `@supabase/supabase-js`, `from '@supabase/supabase-js'`, `createClient(`, `supabase.from(`, `supabase.auth`, `SUPABASE_URL`, `SUPABASE_KEY`

---

## Security
- **[CRITICAL]** `SUPABASE_SERVICE_ROLE_KEY` exposed in client-side code → service role bypasses all RLS policies; attacker gains full unrestricted DB access. Move all service role usage to server-side API routes or Edge Functions only.
- **[CRITICAL]** RLS not enabled on tables with user-owned data → any authenticated user can read, update, or delete all rows. Enable RLS on every table and define at least one policy per operation type.
- **[HIGH]** RLS policies not tested for bypass → policies may have logic errors allowing cross-user data access. Write SQL tests for each policy using `SET LOCAL role` to simulate different authenticated users.
- **[HIGH]** `anon` key used in server-side code for operations requiring elevated trust → anon key is publicly known. Use the service role key on the server and the anon key only in the browser.
- **[HIGH]** Storage bucket set to public for files containing private user data → any person with the URL can access the file without authentication. Set buckets to private and generate signed URLs server-side.
- **[MEDIUM]** Edge Functions not validating the JWT before processing requests → unauthenticated callers can invoke business logic. Call `supabase.auth.getUser()` at the start of every Edge Function and return 401 if it errors.
- **[MEDIUM]** Supabase project URL and anon key committed to repository → exposes project ref enabling targeted enumeration. Store all keys in environment variables.

---

## Performance
- **[HIGH]** N+1 queries via multiple sequential `.from('table').select()` calls in a loop → one HTTP round-trip per item. Use embedded resource syntax: `.select('*, related_table(*)')` to join in a single request.
- **[HIGH]** `.select('*')` without specifying a column list → over-fetches all columns, wastes bandwidth. Always pass an explicit column list.
- **[HIGH]** No pagination on list queries on growing tables → full table returned to client. Add `.range(from, to)` or `.limit(n)` to all list endpoints.
- **[MEDIUM]** Realtime subscriptions not filtered by channel filter → client receives events for all rows. Add a `filter` option to `.on()` calls to scope subscriptions to the authenticated user.
- **[MEDIUM]** Supabase Storage not using image transformation parameters → full-resolution images served to clients that need thumbnails. Use `getPublicUrl(path, { transform: { width, height } })`.
- **[MEDIUM]** Multiple Supabase client instances created per request → each holds a new HTTP client and auth session state. Create one Supabase client at module level and reuse it.
- **[LOW]** PostgREST response caching headers not leveraged → identical list queries hit the database on every request. Add `Cache-Control` headers for read-heavy public endpoints.

---

## Architecture
- **[HIGH]** Direct Supabase client calls from UI components without server layer → business validation bypassed; client has direct DB access. Route sensitive mutations through Edge Functions or a server API layer.
- **[HIGH]** Business logic embedded in RLS policies → policies become unmaintainable SQL. Keep RLS policies simple (e.g., `auth.uid() = user_id`); move complex validation to Edge Functions.
- **[MEDIUM]** Not using Supabase Edge Functions for sensitive operations (payment, third-party API calls with secrets) → secrets must be exposed client-side. Implement sensitive operations as Edge Functions with secrets in Supabase Vault.
- **[MEDIUM]** Auth state managed manually instead of using `onAuthStateChange` → auth state drifts; stale tokens used after expiry. Use `supabase.auth.onAuthStateChange()` as the single source of truth.
- **[MEDIUM]** Supabase CLI not used for local development → developers test against a shared cloud project, polluting production data. Use `supabase start` to run a local Supabase stack.
- **[LOW]** Database functions written via Dashboard SQL editor without version control → schema drift; no rollback path. Write all DB functions as migration files under `supabase/migrations/`.

---

## Code Quality
- **[HIGH]** Error not checked after every Supabase call (`error` ignored in destructured result) → silent failures; stale `data` used as if valid. Check `if (error) throw error` immediately after every Supabase call.
- **[HIGH]** `supabase.auth.getSession()` used server-side → returns session from token without re-validating against the server; a tampered JWT can pass. Use `supabase.auth.getUser()` server-side.
- **[MEDIUM]** TypeScript types not generated from the Supabase schema → all `supabase.from()` calls return `any`. Run `supabase gen types typescript --local` and import the generated `Database` type.
- **[MEDIUM]** Table names used as magic strings (`supabase.from('users')`) → table rename requires grep-and-replace. Extract table names to a typed constants object.
- **[MEDIUM]** Not using `.single()` when exactly one row is expected → `.select()` returns an array; `data[0]` silently returns `undefined` if no rows match. Use `.single()` to get a plain object and receive an error on mismatch.
- **[LOW]** Supabase client created with service role key in a file bundled for both server and client → service role key may leak into the client bundle. Use separate client files for browser and server.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** RLS enabled on a table but no policy created → all SELECT, INSERT, UPDATE, DELETE return 0 rows with no error; data appears to vanish. After enabling RLS, immediately create at least one permissive policy for the intended roles.
- **[HIGH]** `supabase.auth.getSession()` used server-side instead of `getUser()` → session JWT taken at face value; forged or expired token accepted. Replace all server-side `getSession()` calls with `getUser()`.
- **[HIGH]** Realtime channel not unsubscribed on component unmount → WebSocket connection and event listener leak on each mount. Call `supabase.removeChannel(channel)` in the cleanup function.
- **[MEDIUM]** `upsert()` called with an `onConflict` column lacking a unique constraint → Supabase throws a runtime error instead of upserting. Ensure a `UNIQUE` constraint exists on the `onConflict` column.
- **[MEDIUM]** Storage file paths not namespaced by user ID (e.g., `avatar.png` instead of `{userId}/avatar.png`) → a user can overwrite another user's file by guessing the path. Always prefix file paths with the authenticated user's ID.
- **[MEDIUM]** `.insert([...])` not chaining `.select()` after insert → generated columns (id, created_at) not returned; application references undefined. Chain `.select()` after `.insert()` to return the created row.
- **[LOW]** Supabase free-tier project paused after inactivity → API calls return 503 in staging. Upgrade to a paid tier for persistent staging or implement a keep-alive ping.
