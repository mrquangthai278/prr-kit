# Vue 3 — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.vue` files, `from 'vue'`, `<script setup>`, `defineComponent`, `vite.config.*` with vue plugin, `pinia` or `vuex` in deps, `defineProps`, `defineEmits`

---

## Security

- **[CRITICAL]** `v-html` with user-controlled data → stored/reflected XSS. Use `{{ }}` text interpolation. If HTML required, sanitize with DOMPurify first.
- **[CRITICAL]** Dynamic `:is` binding with user-controlled string → arbitrary component injection. Only allow from known safe component map.
- **[CRITICAL]** Server-side template injection in SSR (Nuxt) via user-controlled template strings.
- **[HIGH]** `href` bound to user input without URL validation → `javascript:` protocol injection. Validate protocol allowlist.
- **[HIGH]** Missing `@submit.prevent` on forms calling APIs → unintended page reloads bypassing client validation.
- **[HIGH]** `eval()` / `new Function()` in component logic with user input → code injection.
- **[HIGH]** Pinia store persisted to localStorage via `pinia-plugin-persistedstate` with sensitive data → plaintext exposure.
- **[MEDIUM]** Sensitive store state (tokens, passwords) exposed in template → visible in Vue DevTools. Keep server-side.
- **[MEDIUM]** Missing CSRF protection with cookie-based auth on mutations.
- **[MEDIUM]** `useRoute().query` used without sanitization in templates.
- **[LOW]** Vue DevTools enabled in production build → state and component tree exposed.

---

## Performance

- **[HIGH]** `watchEffect` / `watch` starting async without `onCleanup` → memory leak and race condition on unmount mid-flight.
- **[HIGH]** `v-for` on large lists without virtual scrolling (vue-virtual-scroller) → DOM overload at 500+ items.
- **[HIGH]** `computed` depending on entire store object (`todoStore`) instead of specific fields → re-runs on any store change.
- **[HIGH]** `watch` with `deep: true` on large nested objects → expensive deep traversal every change; use targeted watchers.
- **[HIGH]** Component not using `v-once` for truly static content → re-evaluates on every render.
- **[HIGH]** `reactive()` used for large arrays with frequent push → Vue 3 tracks every index.
- **[MEDIUM]** `v-for` using array index as `:key` → broken reconciliation on reorder/delete; use stable unique IDs.
- **[MEDIUM]** Missing `:key` on `v-for` entirely → Vue warns, falls back to index behavior.
- **[MEDIUM]** Heavy computation directly in template expressions → runs on every render; move to `computed`.
- **[MEDIUM]** `shallowRef` not used for large read-only data blobs → Vue tracks deep reactivity unnecessarily.
- **[MEDIUM]** `onMounted` doing expensive synchronous work → UI freeze on first render; use async with loading state.
- **[MEDIUM]** `defineAsyncComponent` not used for heavy components → included in initial bundle.
- **[MEDIUM]** `v-show` vs `v-if` misuse: `v-if` on frequently toggled elements → DOM destroy/recreate overhead.
- **[LOW]** `provide`/`inject` at root for frequently changing values → all descendants potentially affected.
- **[LOW]** Unnecessarily large `watch` source (full array) when only length matters.

---

## Architecture

- **[HIGH]** Direct store state mutation outside action: `store.items.push(...)` → bypasses Pinia devtools and action tracking.
- **[HIGH]** `useStore()` called outside `setup()` (module scope, plain function) → loses reactivity context.
- **[HIGH]** Props mutation inside child component (`props.value = x`) → violates one-way data flow, Vue warning.
- **[HIGH]** `defineExpose()` leaking internal reactive refs to parent without intent → tight coupling.
- **[HIGH]** Business logic (API calls, transformation) in template or event handlers → move to store actions or composables.
- **[HIGH]** Pinia store importing another store's internals directly → cross-store coupling; use store actions.
- **[HIGH]** Composable modifying global state without clearly documented side effects.
- **[MEDIUM]** Monolithic component >400 lines → decompose into container + presentational.
- **[MEDIUM]** `provide/inject` without TypeScript injection keys → no type safety, silent undefined at runtime.
- **[MEDIUM]** Async component loading without `<Suspense>` boundary → unhandled loading/error states.
- **[MEDIUM]** Composable not returning reactive refs → consumers lose reactivity after destructuring.
- **[MEDIUM]** Router navigation guard doing data fetching → use `onBeforeRouteUpdate` inside component or store action.
- **[LOW]** Missing `defineOptions({ name: 'ComponentName' })` → harder debugging in Vue DevTools.
- **[LOW]** Global event bus (`mitt`) used for parent-child communication → use props/emits; bus for truly global events only.

---

## Code Quality

- **[HIGH]** `defineProps` without TypeScript types or runtime validators → silent prop misuse.
- **[HIGH]** Missing `defineEmits` declaration → uncaught typo event names, no IDE support.
- **[HIGH]** `defineProps` with required prop not having default and not checked → undefined access crash.
- **[MEDIUM]** Mixing Options API with Composition API in same component → confusing, lint may miss issues.
- **[MEDIUM]** `ref()` vs `reactive()` inconsistency across codebase → pick one convention and document.
- **[MEDIUM]** `<script setup>` importing unused components → increases bundle size.
- **[MEDIUM]** `v-model` without explicit `:modelValue` / `@update:modelValue` contract on custom component.
- **[MEDIUM]** Template ref (`ref="el"`) typed as `any` in TypeScript → defeats type safety.
- **[MEDIUM]** Async composable not handling error state → calling component has no error boundary.
- **[LOW]** Single-word component name (`<Header>`) → conflicts with native HTML elements.
- **[LOW]** Missing default value for optional props → runtime undefined access.
- **[LOW]** `defineProps` `withDefaults` not used when defaults needed → verbose manual checking.

---

## Common Bugs & Pitfalls

- **[HIGH]** `async setup()` rendering before data resolves without `<Suspense>` → UI flash with undefined data.
- **[HIGH]** `reactive()` object destructured into local variables → reactivity lost silently (`const { name } = reactive(obj)`).
- **[HIGH]** `toRef` / `toRefs` not used when extracting from `reactive` → stale values after store changes.
- **[HIGH]** `watch` source is a reactive object property accessed directly → watch not triggered (`watch(obj.prop, ...)` vs `watch(() => obj.prop, ...)`).
- **[HIGH]** Pinia action not awaited → dependent UI renders before state updated.
- **[HIGH]** `onUnmounted` cleanup not added for `setInterval`/`setTimeout` → leak on route change.
- **[HIGH]** `watchEffect` running before DOM is ready → access to template refs returns null.
- **[MEDIUM]** `watch` missing `immediate: true` when logic should run on mount.
- **[MEDIUM]** `computed` with setter missing → silently fails on two-way binding.
- **[MEDIUM]** `nextTick` not awaited before DOM-dependent logic after state change → stale DOM.
- **[MEDIUM]** `v-for` over Pinia store array → `v-for` on reactive proxy — mutations outside actions break reactivity.
- **[MEDIUM]** `<Teleport>` target not existing in DOM when component mounts → silent fail.
- **[LOW]** `onActivated`/`onDeactivated` hooks not used with `<KeepAlive>` → side effects not managed on cache toggle.
- **[LOW]** `$attrs` fallthrough not disabled when manually forwarding → double attribute application.
