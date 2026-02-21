# Vue 3 — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.vue` files, `from 'vue'`, `<script setup>`, `defineComponent`, `vite.config.*` with vue plugin, `pinia` or `vuex` in deps

---

## Security

- **[CRITICAL]** `v-html` with user-controlled data → stored/reflected XSS. Always use `{{ }}` text interpolation. If HTML rendering is required, sanitize with DOMPurify first.
- **[CRITICAL]** Dynamic `:is` binding with user-controlled string → arbitrary component injection. Only allow `:is` from a known safe component map.
- **[HIGH]** `href` bound to user input without URL validation → `javascript:` protocol injection. Validate with `allowedProtocols: ['http','https']`.
- **[HIGH]** Missing `@submit.prevent` on forms that call APIs → unintended page reloads may bypass client validation.
- **[MEDIUM]** Sensitive store state (tokens, passwords) directly exposed in template → visible in Vue devtools. Keep sensitive data server-side.
- **[MEDIUM]** Missing CSRF protection when using cookie-based auth with mutations.

---

## Performance

- **[HIGH]** `watchEffect` / `watch` starting async operations without `onCleanup` → memory leak and race conditions when component unmounts mid-flight.
- **[HIGH]** `v-for` on large lists without virtual scrolling (e.g. vue-virtual-scroller) → DOM overload at 500+ items.
- **[MEDIUM]** `v-for` using array index as `:key` → broken reconciliation on reorder/delete; use stable unique IDs.
- **[MEDIUM]** Missing `:key` on `v-for` entirely → Vue warns and falls back to index behavior.
- **[MEDIUM]** Heavy computation directly in template expressions (string formatting, filtering) → runs on every render. Move to `computed`.
- **[MEDIUM]** `computed` depending on entire store object (`todoStore`) instead of specific fields → re-runs on any store change.
- **[MEDIUM]** `watch` with `deep: true` on large nested objects → expensive deep traversal every change. Use targeted watchers instead.
- **[LOW]** `shallowRef` not used for large read-only data blobs (API responses) → Vue tracks deep reactivity unnecessarily.
- **[LOW]** `onMounted` doing synchronous expensive work without loading state → UI freeze on first render.

---

## Architecture

- **[HIGH]** Direct store state mutation outside action: `store.items.push(...)` → bypasses Pinia devtools history and action tracking. All mutations must go through actions.
- **[HIGH]** `useStore()` called outside `setup()` (e.g. in a plain function, module scope) → loses reactivity context, may use wrong Pinia instance.
- **[HIGH]** Props mutation inside child component (`props.value = x`) instead of emitting → violates one-way data flow, Vue warning.
- **[HIGH]** `defineExpose()` leaking internal reactive refs to parent without intent → tight coupling.
- **[MEDIUM]** Business logic (API calls, data transformation) in template or inside event handlers → hard to test. Move to store actions or composables.
- **[MEDIUM]** Monolithic component >400 lines → decompose into container + presentational.
- **[MEDIUM]** `provide/inject` without TypeScript injection keys → no type safety, silent undefined at runtime.
- **[MEDIUM]** Async component loading without `<Suspense>` boundary → unhandled loading/error states.
- **[LOW]** Missing `defineOptions({ name: 'ComponentName' })` → harder debugging in Vue devtools.

---

## Code Quality

- **[HIGH]** `defineProps` without TypeScript types or runtime validators → silent prop misuse.
- **[HIGH]** Missing `defineEmits` declaration → uncaught typo event names, no IDE support.
- **[MEDIUM]** Mixing Options API with Composition API in same component → confusing, lint may not catch all issues.
- **[MEDIUM]** Using `ref()` for objects/arrays when `reactive()` is more idiomatic (or vice versa — pick one convention and be consistent).
- **[MEDIUM]** `<script setup>` imports unused components → increases bundle size.
- **[LOW]** Single-word component name (e.g. `<Header>`) → conflicts with native HTML elements, ESLint `vue/multi-word-component-names` will fail.
- **[LOW]** Missing default value for optional props → runtime undefined access.

---

## Common Bugs & Pitfalls

- **[HIGH]** `async setup()` rendering component before async data resolves without `<Suspense>` → UI flash with undefined data.
- **[HIGH]** `reactive()` object destructured into local variables → reactivity lost silently (`const { name } = reactive(obj)` makes `name` non-reactive).
- **[HIGH]** `toRef` / `toRefs` not used when extracting from `reactive` → stale values after store changes.
- **[MEDIUM]** `watch` missing `immediate: true` when logic should run on initial value — watchers only trigger on change by default.
- **[MEDIUM]** `computed` with setter missing — silently fails when parent attempts two-way binding.
- **[MEDIUM]** `nextTick` not awaited before DOM-dependent logic after state change → reads stale DOM.
- **[LOW]** `onUnmounted` cleanup not added for global event listeners (`window.addEventListener`) → event listeners pile up on route change.
