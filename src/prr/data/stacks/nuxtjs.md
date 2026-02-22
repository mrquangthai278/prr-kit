# Nuxt.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: nuxt.config.ts, nuxt.config.js, .nuxt/, pages/, composables/, server/api/, useAsyncData, useFetch, defineNuxtPlugin, defineNuxtRouteMiddleware, useState, useRuntimeConfig

---

## Security

- **[CRITICAL]** `v-html` used with user-supplied content → XSS amplified by SSR cache poisoning: the rendered HTML is cached and served to all subsequent users. Remove `v-html` entirely; use a sanitisation library (DOMPurify) only as a last resort and never in SSR context.
- **[CRITICAL]** Server-side secrets accessed inside `useAsyncData` / `useFetch` handlers that run on both server and client → private keys, API secrets, or DB credentials are serialised into the JS bundle and exposed publicly. Move secret usage to `server/` directory routes or composables guarded with `import.meta.server`.
- **[CRITICAL]** Missing authentication / authorisation checks in `server/api/` route handlers → all endpoints are publicly reachable with no protection. Use `defineEventHandler` with an auth middleware (e.g. `server/middleware/auth.ts`) that validates session tokens before any business logic executes.
- **[HIGH]** Secrets placed in `runtimeConfig.public` → those values are inlined into the client bundle and visible to anyone who inspects the page source. Move confidential values to the non-public `runtimeConfig` block; access them only in `server/` code.
- **[HIGH]** No CSRF protection on state-changing `server/api/` routes (POST / PUT / DELETE / PATCH) → cross-site request forgery attacks succeed silently. Validate the `Origin` / `Referer` header or use a CSRF token library (e.g. `nuxt-csrf`) on all mutating endpoints.
- **[HIGH]** `useRequestHeaders()` forwarding the full incoming header map to an upstream service → Host-header injection; Authorization tokens intended for the Nuxt server are forwarded to a third-party backend. Explicitly allow-list only the headers the upstream legitimately needs.
- **[HIGH]** Nuxt DevTools left enabled in production builds → exposes the full component tree, Pinia state, all registered routes, and payload data to anyone who opens the browser panel. Set `devtools: { enabled: false }` in `nuxt.config.ts` and gate it behind a NODE_ENV check.
- **[HIGH]** `` or `useFetch` calls to internal `server/api/` routes from SSR context pass cookies automatically only when the base URL matches; a misconfigured `NUXT_PUBLIC_API_BASE` sends unauthenticated requests in production. Always set `baseURL` explicitly and verify cookie-forwarding behaviour per environment.
- **[MEDIUM]** `useState` keys not namespaced (e.g. `useState("data")`) → key collisions across modules or third-party packages cause one module's state to silently overwrite another's. Use unique, module-scoped keys: `useState("moduleName:data")`.
- **[MEDIUM]** `server/api/` auth endpoints (login, password reset) missing rate limiting → brute-force and credential-stuffing attacks succeed unchallenged. Add a rate-limiter middleware backed by `unstorage` or a Nitro plugin.
- **[MEDIUM]** Nitro preset mismatch between `nuxt.config.ts` and the actual deployment target (e.g. `node-server` preset deployed to Cloudflare Workers) → the app fails silently or uses the wrong runtime APIs. Set `nitro.preset` explicitly and validate against the hosting platform requirements.
- **[MEDIUM]** Open redirect in `navigateTo()` using an unvalidated user-supplied URL → phishing via a trusted domain. Validate that the target URL is relative or belongs to an allow-listed domain before calling `navigateTo()`.
- **[LOW]** Sensitive filenames placed in the `public/` directory (e.g. `public/backup.sql`) → served as static assets with no authentication. Audit `public/` regularly; never store non-public files there.
- **[LOW]** `console.log` statements in `server/` routes that log request bodies or auth tokens → credentials appear in server logs. Strip or redact all sensitive values before logging; use a structured logger with field filtering.

---

## Performance

- **[CRITICAL]** `useAsyncData` / `useFetch` called with `lazy: false` (the default) for slow upstream APIs → navigation is completely blocked until the API responds, causing multi-second white screens. Use `lazy: true` (or `useLazyFetch`) paired with a loading skeleton to unblock navigation immediately.
- **[HIGH]** Double-fetching: data fetched during SSR via `useFetch` then re-fetched again in `onMounted` → the payload already hydrated the Ref; the second fetch is wasteful and can cause flickering. Remove the `onMounted` fetch and trust Nuxt's payload hydration.
- **[HIGH]** Large `defineNuxtPlugin` bodies not marked `parallel: true` or not lazy-loaded → all non-parallel plugins execute serially before the app boots, bloating startup time. Mark independent plugins `{ parallel: true }`; defer heavy initialisation with dynamic `import()`.
- **[HIGH]** `payloadExtraction: false` not set for static sites with frequently changing data → CDN serves a stale pre-rendered payload, ignoring fresh API data until the next deployment. Set `payloadExtraction: false` or use ISR / SWR `routeRules` to control freshness per route.
- **[HIGH]** `useAsyncData` called without a `watch` option when the fetched URL depends on reactive route params → stale data is displayed when the user navigates between dynamic routes. Add `watch: [() => route.params.id]` to re-trigger the fetch on every param change.
- **[HIGH]** `useLazyAsyncData` / `useLazyFetch` not used for below-the-fold content → all async data blocks first paint even for content the user cannot yet see. Apply lazy variants with `pending` guards for all below-fold sections.
- **[MEDIUM]** Non-unique `useAsyncData` key reused across multiple components → Nuxt de-duplicates requests by key; one component silently overwrites another's cached result. Make every key unique, e.g. using a template literal that includes a dynamic ID.
- **[MEDIUM]** Client-only components (charts, maps, canvas, WebGL) rendered on the server without `<ClientOnly>` or `ssr: false` → SSR throws or produces hydration mismatches and flickering on mount. Wrap with `<ClientOnly>` or add `definePageMeta({ ssr: false })` on the containing page.
- **[MEDIUM]** `@nuxt/image` module not used for `<img>` tags → no automatic WebP conversion, resizing, lazy loading, or blur placeholders. Replace raw `<img>` with `<NuxtImg>` or `<NuxtPicture>`.
- **[MEDIUM]** Nuxt's automatic route-level code splitting bypassed by importing page components manually → the entire page graph ends up in the main bundle. Let Nuxt handle page imports via the `pages/` convention; avoid manual dynamic imports of page components.
- **[MEDIUM]** `` called directly in `setup()` at the top level instead of `useFetch` → no SSR execution, no payload deduplication, no caching; an extra network round-trip occurs on the client after hydration. Use `useFetch` / `useAsyncData` for all universal data fetching.
- **[MEDIUM]** No `routeRules` configured per route → every page uses the same rendering strategy regardless of caching needs. Use `routeRules` to apply ISR/SWR to mostly-static pages and SSR only where truly dynamic data is required.
- **[LOW]** Critical navigation links missing `<NuxtLink prefetch>` → the next route's JS chunk is not prefetched on hover or viewport visibility, causing a noticeable navigation delay. Add the `prefetch` prop to high-traffic internal links.
- **[LOW]** Page titles set as raw full strings per page instead of using a `titleTemplate` in `useHead` → inconsistent titles and duplicated boilerplate. Define a global `titleTemplate` in `app.vue` and set only the short title per page.

---

## Architecture

- **[HIGH]** Business logic (API calls, data transformation, validation) placed directly in `pages/` or component `<script setup>` blocks → code is not reusable or testable in isolation. Extract to `use*` composables in `composables/`; pages should be thin orchestration layers only.
- **[HIGH]** Cross-component state managed with ad hoc `useState` calls scattered across the codebase instead of Pinia stores → state synchronisation bugs, race conditions, and no DevTools support. Introduce Pinia via `@pinia/nuxt` and centralise shared state in typed stores.
- **[HIGH]** Direct database or ORM calls inside `pages/` or universal composables → no security boundary; DB logic executes on the client in SPA mode. All DB access must live in `server/api/` or `server/utils/`, which are never bundled for the client.
- **[HIGH]** `defineNuxtRouteMiddleware` not handling errors with `abortNavigation` or `navigateTo` → an unhandled throw inside middleware causes a blank white screen with no user feedback. Wrap logic in try/catch and call `navigateTo("/error")` on failure.
- **[MEDIUM]** `useNuxtApp()` called outside a Nuxt plugin, composable, or component `setup` context → returns `undefined` at runtime with a cryptic error. Pass the app instance via plugin provide / inject instead of calling `useNuxtApp()` in arbitrary scopes.
- **[MEDIUM]** Pinia store not using `#imports` auto-import → the store is instantiated before the Nuxt context is ready during SSR, causing hydration mismatches. Rely on Nuxt's auto-import for `defineStore`, `ref`, and `computed`.
- **[MEDIUM]** `definePageMeta` missing `layout` or `middleware` declarations on pages that require them → pages render with the wrong layout or skip required auth guards. Always declare `layout` and `middleware` explicitly via `definePageMeta`.
- **[MEDIUM]** `server/middleware/` execution order not considered → a business-logic middleware can run before the auth middleware that sets `event.context.user`. Name files with numeric prefixes (`01.auth.ts`, `02.tenant.ts`) to enforce deterministic order.
- **[MEDIUM]** Heavy features (auth, i18n, analytics) configured manually without official Nuxt modules → SSR edge cases (cookie forwarding, locale detection, hydration) are handled incorrectly. Use `nuxt-auth`, `@nuxtjs/i18n`, etc., which are built for Nuxt's SSR lifecycle.
- **[MEDIUM]** Server routes placed in `api/` at the project root instead of `server/api/` → Nuxt 3 only scans `server/api/`; routes are silently ignored and return 404. Move all server routes under `server/api/`.
- **[LOW]** `routeRules` not used to declare per-route rendering strategy → ISR and SWR candidates default to full SSR on every request, wasting server resources. Map static and near-static routes to `{ isr: 60 }` or `{ swr: true }`.
- **[LOW]** `app.vue` contains substantive business logic instead of only `<NuxtLayout>` / `<NuxtPage>` → makes the root component a maintenance burden. Delegate all logic to layouts, pages, and composables.

---

## Code Quality

- **[HIGH]** `useAsyncData` handler function does not explicitly `return` the fetched value → the `data` Ref is always `undefined` with no error thrown, making this bug silent and hard to diagnose. The handler must return the value: `useAsyncData("key", () => ("/api/items"))`.
- **[HIGH]** `navigateTo()` called inside `setup()` without `return` → navigation fires but the component continues executing setup logic, potentially causing errors or double rendering. Always `return navigateTo()` from `setup()` or from middleware.
- **[HIGH]** `useAsyncData` / `useFetch` not typed with a generic (`useAsyncData<MyType>`) → `data` is typed as `Ref<unknown>`, defeating TypeScript's value. Add explicit generic types and define response interfaces in a shared `types/` directory.
- **[HIGH]** `useAsyncData` key is a dynamic expression evaluated once at call time that never changes on re-render → the cached result is never invalidated when inputs change. Use a computed key string or add a `watch` option for reactive dependencies.
- **[MEDIUM]** Options API and Composition API mixed within the same component → confusing code structure, incompatible lifecycle hooks, and subtle reactivity bugs. Standardise on Composition API with `<script setup>` across the entire codebase.
- **[MEDIUM]** Manual `watch` placed on `useFetch` result data to trigger a second fetch → causes extra network requests and timing races. Use the built-in `watch` option of `useFetch` / `useAsyncData` instead.
- **[MEDIUM]** Options API components not using `defineNuxtComponent` → the component loses Nuxt's SSR async data support (`asyncData` / `fetch` hooks). Replace `defineComponent` with `defineNuxtComponent` for all Options API components.
- **[MEDIUM]** `useFetch` used for client-only event-driven requests and `` used for universal data → inconsistent patterns confuse team members. Convention: `useFetch` / `useAsyncData` for universal/SSR data; `` for event-driven client-only calls.
- **[MEDIUM]** Error states from `useFetch` / `useAsyncData` not rendered in the template → users see a blank section with no feedback when an API call fails. Always destructure `{ data, pending, error }` and display a corresponding error UI.
- **[LOW]** Legacy plugin inject pattern (`context. = ...`) used instead of Nuxt 3 provide / inject → not typed, not tree-shakeable, and deprecated. Replace with `nuxtApp.provide("myService", ...)` in the plugin and `useNuxtApp().` in composables.
- **[LOW]** `definePageMeta` called with non-literal values (variables, computed expressions) → Nuxt's static analyser cannot extract metadata at build time and silently ignores it. `definePageMeta` arguments must be plain object literals.

---

## Common Bugs & Pitfalls

- **[HIGH]** `useFetch` URL built from a reactive variable passed as a plain string instead of a getter → `useFetch("/api/items/" + route.params.id)` evaluates once at setup; the URL does not update when the param changes. Use a getter function: `useFetch(() => "/api/items/" + route.params.id)`.
- **[HIGH]** `window`, `document`, or `localStorage` accessed at the top level of a composable or `setup()` → `ReferenceError` during SSR because those globals do not exist on the server. Guard with `if (import.meta.client) { ... }` or move access inside `onMounted`.
- **[HIGH]** `navigateTo()` called in route middleware without `return` → the middleware continues executing after the redirect fires, leading to unexpected side effects or double navigation. Always `return navigateTo(...)`.
- **[HIGH]** `useState` initial value provided as an inline object or array literal rather than a factory function → the same object reference is shared across concurrent SSR requests, causing state leakage between users. Always use a factory function: `useState("key", () => ({}))`.
- **[HIGH]** `useFetch` / `useAsyncData` result used immediately without checking `pending` → `data` is `null` on the first render while the fetch is in-flight; accessing nested properties on it throws. Always check `pending.value` or use optional chaining until data resolves.
- **[MEDIUM]** `useRoute()` / `useRouter()` called inside `server/api/` or `server/middleware/` handlers → these composables are client/Nuxt-app-scoped and return the wrong or empty route in server context. Use `event.context.params`, `getQuery(event)`, and `getRouterParam(event, "id")` from H3 instead.
- **[MEDIUM]** `` error in a `server/api/` handler not caught → unhandled promise rejection crashes the Nitro worker and returns a generic 500 to the client. Wrap in try/catch and use `createError({ statusCode, message })` to return structured error responses.
- **[MEDIUM]** Conditional rendering based on `process.server` that differs between SSR and client hydration → Vue's hydration algorithm detects the mismatch and throws; in severe cases the entire DOM is re-rendered. Replace with `<ClientOnly>` or ensure both server and client render the same initial HTML.
- **[MEDIUM]** Plugin accessing `useRouter()` before the router is ready during app boot → router is `undefined` at that point causing a runtime error. Use `app.router` from the plugin `nuxtApp` argument or call router-dependent code inside `nuxtApp.hook("app:mounted", ...)`.
- **[LOW]** Changes to `nuxt.config.ts` (modules, plugins, build options) not reflected in the running dev server → Nuxt does not always hot-reload config changes. Restart the dev server after any `nuxt.config.ts` modification.
- **[LOW]** `useHead` called multiple times in the same component with overlapping keys → the last call wins and earlier declarations are silently overridden. Consolidate into a single `useHead` call per component.
