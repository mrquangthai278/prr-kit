# SvelteKit — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.svelte`, `svelte.config.*`, `+page.svelte`, `+layout.svelte`, `+server.ts`, `from 'svelte'`, `$lib/`

---

## Security
- **[CRITICAL]** `{@html}` used with user-controlled input → XSS allowing arbitrary script execution. Sanitize with DOMPurify or avoid `{@html}` entirely.
- **[CRITICAL]** Missing auth check in `+server.ts` endpoints → unauthenticated API access. Validate session/token at the top of every handler before processing.
- **[HIGH]** CSRF protection absent on form actions → state-changing requests forgeable. Use SvelteKit's built-in CSRF protection or add `csrf` check in hooks.
- **[HIGH]** `load()` function returning sensitive fields (passwords, tokens, internal IDs) → data leaked to client serialization. Strip sensitive fields before returning from server `load()`.
- **[HIGH]** Insecure direct object reference via route params (`/items/[id]`) without ownership check → users access other users' data. Verify `params.id` belongs to the authenticated user.
- **[MEDIUM]** Secrets placed in `$env/static/public` instead of `$env/static/private` → exposed in client bundle. Move all secrets to `$env/static/private` and access only in server files.

---

## Performance
- **[HIGH]** Data fetching in `+page.svelte` `onMount` instead of `+page.server.ts` `load()` → client-side waterfall after hydration. Move all initial data fetching to server-side `load()` functions.
- **[HIGH]** Repeated DB queries across nested layout `load()` functions without caching → redundant round trips. Use `event.locals` or a request-scoped cache to share data between layouts.
- **[HIGH]** Heavy libraries (e.g. chart.js, moment) imported client-side without dynamic import → large initial bundle. Use `import()` lazily or move processing to server-side `load()`.
- **[MEDIUM]** Large images not using `<enhanced:img>` → unoptimized images shipped without resize/format conversion. Replace `<img>` with `<enhanced:img>` for automatic WebP conversion and srcset.
- **[MEDIUM]** Slow non-critical data not using `defer` in `load()` → page blocked until all data resolves. Use `return { streamed: { data: fetchSlow() } }` with `{#await}` blocks.
- **[LOW]** Missing `<link rel="preload">` hints for critical fonts/scripts → render-blocking discovery delay. Add preload hints in `<svelte:head>` for known critical resources.

---

## Architecture
- **[CRITICAL]** Module-level Svelte stores used for request-scoped state → state leaks between SSR requests across users. Use `setContext`/`getContext` or per-request locals instead of module singletons.
- **[HIGH]** Business logic (DB calls, validation) inside `+page.svelte` `<script>` → untestable, mixed concerns. Move to server `load()` functions or dedicated service modules in `$lib/server/`.
- **[HIGH]** Client/server env variables not segregated (`$env/static/public` vs `$env/static/private`) → accidental secret exposure. Enforce that `$env/static/private` is only imported from `.server.ts` files.
- **[HIGH]** Direct `fetch` mutations from component instead of form actions → loses progressive enhancement and CSRF protection. Use `+page.server.ts` form `actions` for all state mutations.
- **[MEDIUM]** Deep prop drilling through layout hierarchy instead of Svelte stores or `setContext` → brittle coupling. Use `setContext`/`getContext` for layout-to-component data or a scoped store.
- **[MEDIUM]** Route-specific logic placed in `+layout.server.ts` affecting unrelated child routes → unintended coupling. Scope data loading to the lowest applicable `+page.server.ts` or `+layout.server.ts`.

---

## Code Quality
- **[HIGH]** Not importing `PageData`/`ActionData` types from `./$types` → loss of end-to-end type safety on `load()` return values. Use `export let data: PageData` and `export let form: ActionData` with generated types.
- **[MEDIUM]** Form data parsed manually without schema validation (e.g. Zod, superforms) → runtime type errors and missing validation errors. Use `sveltekit-superforms` with Zod for typed, validated form handling.
- **[MEDIUM]** Hardcoded absolute URLs instead of `base` from `$app/paths` → breaks when deployed to a sub-path. Use `import { base } from '$app/paths'` and prefix all internal links.
- **[MEDIUM]** Missing `+error.svelte` at route or layout level → SvelteKit's default error page shown to users. Add `+error.svelte` with user-friendly messaging at each route group boundary.
- **[MEDIUM]** `event.fetch` not used inside `load()` for internal API calls → misses cookie forwarding and SSR deduplication. Replace `fetch` with `event.fetch` inside all `load()` and server handlers.
- **[LOW]** No TypeScript strict mode in `tsconfig.json` → type errors silently ignored. Enable `"strict": true` in tsconfig and resolve all resulting errors.

---

## Common Bugs & Pitfalls
- **[HIGH]** `onMount` code accessing browser APIs runs during SSR → hydration mismatch and server errors. Guard with `if (browser)` from `$app/environment` or move to `onMount` which already skips SSR.
- **[HIGH]** Reactive statement `$: result = compute(value)` with side effects (fetch, DOM mutation) → infinite reactive loops. Move side-effectful reactive code into `$: { }` blocks or Svelte lifecycle hooks.
- **[HIGH]** Svelte store subscription via `$store` syntax in a component never unsubscribed when created manually → memory leak. Use the `$` auto-subscribe syntax or manually call `unsubscribe()` in `onDestroy`.
- **[HIGH]** `load()` returning class instances, `Date` objects, or functions → serialization failure when passing from server to client. Return only plain JSON-serializable objects; convert `Date` to ISO strings.
- **[MEDIUM]** `goto()` called inside server-side code (`+server.ts`, `load()`) → no-op or runtime error. Use `redirect(303, url)` from `@sveltejs/kit` for server-side redirects.
- **[MEDIUM]** `invalidate()` or `invalidateAll()` called without understanding which `load()` functions re-run → over-fetching or stale data. Understand dependency tracking via `event.depends()` before using invalidation.
