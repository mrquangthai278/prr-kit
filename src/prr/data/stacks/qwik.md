# Qwik — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.qwik.tsx`, `from '@builder.io/qwik'`, `component$()`, `useSignal()`, `$()` suffix, `qwik.config.ts`

---

## Security
- **[CRITICAL]** `innerHTML` binding with user-controlled content (Qwik's equivalent of `dangerouslySetInnerHTML`) → XSS. Use text interpolation `{userContent}` or sanitize with DOMPurify before binding.
- **[CRITICAL]** Missing authentication check in `routeLoader$` → unauthenticated access to server data. Validate session at the start of every `routeLoader$` before fetching data.
- **[HIGH]** `routeAction$` / `formAction$` without input validation → malformed or malicious payloads processed. Validate all action inputs with Zod; return `fail()` on schema errors.
- **[HIGH]** Sensitive data (tokens, PII) returned from `routeLoader$` that is serialized into the HTML payload → client exposure. Return only the minimal fields needed; strip secrets before returning.
- **[HIGH]** Missing CSRF protection on `formAction$` → state-changing requests forgeable. Verify `Origin` header or use a CSRF token pattern in all form actions.
- **[MEDIUM]** Secrets accessed inside client-reachable code paths (not guarded by `server$`) → secret exposure in bundle. Move secret access exclusively into `server$`, `routeLoader$`, or `routeAction$`.

---

## Performance
- **[HIGH]** Eagerly importing heavy modules at the top level instead of lazy `$()` wrapping → defeats Qwik's resumability and ships unnecessary JS upfront. Wrap heavy imports in `$()` or use dynamic `import()` inside event handlers.
- **[HIGH]** `useStore()` used for large, deeply nested objects → over-serialization into HTML and large resumability payload. Prefer `useSignal()` for primitive values; flatten store shape to minimize serialized state.
- **[HIGH]** Inline event handlers not extracted to `$()` → Qwik cannot lazy-load the handler, breaking the core resumability model. Extract all event handlers to named `$()` QRL functions.
- **[MEDIUM]** `useVisibleTask$` used for work that can be done server-side → unnecessary client JS execution. Move server-compatible work to `routeLoader$` and reserve `useVisibleTask$` for browser-only tasks.
- **[MEDIUM]** `useTask$` running on both server and client without `isServer`/`isBrowser` guard → duplicate side effects. Use `import { isServer } from '@builder.io/qwik/build'` to guard environment-specific logic.

---

## Architecture
- **[HIGH]** Business logic (DB calls, external API) inside `component$` JSX → untestable, mixes rendering with data concerns. Move data fetching to `routeLoader$` and mutations to `routeAction$`.
- **[HIGH]** Mutable state shared across components via module-level variables → state leaks between SSR requests. Use `useContext` with `createContextId` for scoped shared state.
- **[MEDIUM]** Overusing `useVisibleTask$` for work that could be handled server-side → increases client-side JS and defeats Qwik's zero-JS goal. Audit each `useVisibleTask$` and migrate server-compatible logic to loaders.
- **[MEDIUM]** Not following Qwik City file-based routing conventions (`index.tsx`, `layout.tsx`) → routing inconsistencies and missed framework optimizations. Adhere to Qwik City directory/file conventions for all routes and layouts.
- **[MEDIUM]** Missing `useContext` for cross-component state, using prop drilling instead → verbose and brittle component trees. Define context with `createContextId` and provide/consume via `useProvide`/`useContext`.

---

## Code Quality
- **[HIGH]** `$()` used on closures that capture non-serializable values (class instances, DOM refs, functions) → runtime serialization error on resumption. Ensure all values captured inside `$()` are serializable (plain objects, primitives, signals).
- **[HIGH]** React-style hooks (no `$` suffix) used expecting equivalent behavior → hooks don't integrate with Qwik's reactivity system. Replace with Qwik equivalents: `useSignal`, `useStore`, `useTask$`, `useVisibleTask$`.
- **[HIGH]** Components defined as plain functions instead of `component$()` → no lazy loading boundary, component is always eagerly included. Wrap every component definition with `component$()`.
- **[MEDIUM]** `useSignal()` without TypeScript generic `useSignal<T>()` → signal typed as `Signal<unknown>`, losing type safety. Always provide an explicit generic: `useSignal<string>('')`.
- **[LOW]** Magic string route paths hardcoded in `routeAction$` redirects → breaks on path refactoring. Use typed route path constants or Qwik City's link helpers.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** Closure inside `$()` captures non-serializable value (e.g. a class instance, `Map`, `Set`, DOM element) → runtime error during resumption: "Value cannot be serialized". Only capture signals, stores, and plain-object state inside `$()`.
- **[HIGH]** `useTask$` with `track()` on a signal that is also mutated inside the task → infinite reactive loop. Ensure the tracked signal is only written from outside the task, or add a value-change guard.
- **[HIGH]** `useVisibleTask$` with `{ strategy: 'document-ready' }` not providing a server-rendered fallback → blank content before hydration. Always render meaningful server-side HTML as a fallback for visibly-deferred tasks.
- **[HIGH]** Event handler capturing stale component state due to incorrect `$()` boundary placement → handler operates on outdated values. Capture state via signals/stores rather than closures to get always-current values.
- **[MEDIUM]** `routeLoader$` return value mutated on the client → breaks resumability assumptions and causes unpredictable UI. Treat loader data as immutable; derive client state into separate signals.
