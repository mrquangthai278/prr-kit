# Nuxt.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `nuxt.config.*`, `useNuxtApp`, `defineNuxtComponent`, `useAsyncData`, `useFetch`, `.nuxt/`, `defineNuxtPlugin`

---

## Security

- **[CRITICAL]** Server-side secrets accessed in `useAsyncData` / `useFetch` that runs on client → exposed in JS bundle. Use `$fetch` only in server middleware or `server/` directory.
- **[CRITICAL]** `v-html` with user content → XSS (same as Vue 3 rule, amplified in SSR context where attacker can poison SSR cache).
- **[HIGH]** Server route (`server/api/`) missing authentication → unprotected endpoint.
- **[HIGH]** `runtimeConfig.public.*` containing secrets → exposed to client. Use `runtimeConfig.*` (non-public) for secrets.
- **[HIGH]** Missing CSRF protection on server mutations.
- **[MEDIUM]** `useState` key collision across modules → shared state pollution. Use unique, namespaced keys.

---

## Performance

- **[HIGH]** `useAsyncData` with `lazy: false` (default) blocking navigation for slow API calls → use `lazy: true` + loading state.
- **[HIGH]** Data fetched in both `useFetch` (SSR) and also re-fetched in `onMounted` → double fetch. `useFetch` hydrates automatically.
- **[HIGH]** Large plugins (`defineNuxtPlugin`) not lazy-loaded → increases initial bundle.
- **[MEDIUM]** Missing `server: false` on components that should only render client-side (charts, maps) → SSR hydration errors.
- **[MEDIUM]** `useAsyncData` key not unique → multiple components with same key share/overwrite state.
- **[MEDIUM]** Not using Nuxt's built-in `useLazyAsyncData` or `useLazyFetch` for below-fold content.
- **[LOW]** `nuxt/image` not used for images → no automatic optimization.

---

## Architecture

- **[HIGH]** Business logic in pages/components instead of composables → hard to reuse and test.
- **[MEDIUM]** `useNuxtApp()` called outside plugin or composable context → may be undefined.
- **[MEDIUM]** Pinia store not using Nuxt's `defineStore` from `#imports` → SSR hydration mismatch.
- **[MEDIUM]** `asyncData` return value not matching expected page data structure → TypeScript errors at runtime.
- **[LOW]** Missing `definePageMeta` for route middleware / layout on pages that need it.
- **[LOW]** Server middleware in wrong directory (`middleware/` vs `server/middleware/`) → runs client-side instead of server-side.

---

## Common Bugs & Pitfalls

- **[HIGH]** `useFetch` URL constructed with reactive variable not wrapped in getter (`() => url.value`) → URL not reactive, doesn't re-fetch on change.
- **[HIGH]** SSR + client-only library accessed during SSR → `window is not defined` error. Guard with `process.client`.
- **[MEDIUM]** `useState` with function initializer not being a factory → shared initial state across SSR requests.
- **[MEDIUM]** `navigateTo()` called in middleware without `return` → navigation continues unexpectedly.
- **[LOW]** `useRoute()` / `useRouter()` used in non-composable context → may reference wrong route.
