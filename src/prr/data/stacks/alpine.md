# Alpine.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `alpinejs`, `x-data`, `x-bind`, `x-on`, `x-model`, `from 'alpinejs'`, `Alpine.data()`

---

## Security
- **[CRITICAL]** `x-html` directive used with user-controlled content → XSS allowing arbitrary script execution. Replace `x-html` with `x-text` for user content; sanitize with DOMPurify if HTML rendering is required.
- **[CRITICAL]** `$el.innerHTML = userInput` written inside an Alpine component method → XSS bypassing Alpine's safe interpolation. Use `$el.textContent` for text or create elements via `document.createElement`.
- **[CRITICAL]** `Alpine.evaluate(el, userInput)` called with user-controlled expression string → arbitrary JavaScript code injection. Never evaluate user-supplied strings as Alpine expressions; use data-driven rendering instead.
- **[HIGH]** `fetch` calls inside Alpine components missing CSRF token → state-changing requests forgeable. Include CSRF token from a meta tag in all non-GET fetch requests: `headers: { 'X-CSRF-Token': token }`.
- **[MEDIUM]** Sensitive data (auth tokens, PII) stored in `x-data` object → visible in DOM via browser DevTools and queryable by any script. Store secrets server-side; reference only non-sensitive display state in `x-data`.

---

## Performance
- **[HIGH]** Large `x-data` object on the root `<body>` or `<main>` element → Alpine tracks reactivity for the entire page subtree on every change. Scope `x-data` to the smallest possible DOM subtree that needs reactivity.
- **[HIGH]** `x-for` without `:key` binding on dynamically changing lists → full DOM re-creation on every list mutation. Always add `:key="item.id"` to the `x-for` template element for efficient keyed diffing.
- **[MEDIUM]** Heavy computation or synchronous API calls inside `x-init` → blocks initial render, causing visible delay. Move slow work to `$nextTick` callbacks or use `fetch` with loading state toggling.
- **[MEDIUM]** `$watch` on a deeply nested object reference → Alpine observes the entire object tree, causing wide re-evaluation. Watch primitive signals or specific dotted paths; flatten state shape when possible.
- **[LOW]** Missing `x-cloak` with corresponding CSS `[x-cloak] { display: none }` → flash of un-initialized template markup before Alpine loads. Add `x-cloak` to elements that should be hidden until Alpine initializes.

---

## Architecture
- **[HIGH]** Complex business logic written as inline `x-on:click="..."` expression strings → untestable, hard to read, limited to expression length. Extract logic into `x-data` methods or `Alpine.data()` component definitions.
- **[HIGH]** Identical `x-data` object literals duplicated across multiple elements instead of `Alpine.data()` → no single source of truth, maintenance burden. Register reusable components with `Alpine.data('componentName', () => ({ ... }))`.
- **[HIGH]** Alpine components mixed with direct jQuery or vanilla DOM manipulation on the same elements → state conflicts between Alpine's reactive model and imperative DOM changes. Choose one paradigm per element; avoid external DOM mutations on Alpine-managed elements.
- **[MEDIUM]** Complex shared state not using `Alpine.store()` → prop threading or duplicated state across sibling components. Define global stores with `Alpine.store('storeName', { ... })` and access via `$store.storeName`.

---

## Code Quality
- **[CRITICAL]** `x-data="{}"` as an object literal on a template element cloned by `x-for` → all cloned instances share the same object reference, mutations affect all items. Use `x-data="() => ({ ... })"` (function form) to get a fresh object per instance.
- **[MEDIUM]** `$store`, `$dispatch`, `$refs` magic properties used without understanding their reactivity scope → unexpected behavior when accessing across component boundaries. Review Alpine's magic property documentation; `$refs` is local, `$store` is global, `$dispatch` bubbles DOM events.
- **[MEDIUM]** `x-data` expressions longer than a few tokens written inline → readability collapses, no syntax highlighting. Move all but the simplest initializations to `Alpine.data()` or a `<script>` block.
- **[LOW]** Alpine version loaded from CDN without a pinned version tag (`@latest`) → breaking changes auto-applied on next CDN cache miss. Pin to a specific semver: `alpinejs@3.13.5`.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** `x-data="{}"` (plain object) on repeated elements → object is shared, all instances mutate the same state. Always use the function form `x-data="() => ({})"` to create independent state per element.
- **[HIGH]** `x-model` applied to a non-input element (div, span) without defining a custom getter/setter → model binding silently does nothing. Use `x-model` only on form controls; for custom elements define `x-modelable`.
- **[MEDIUM]** `x-show` used where `x-if` is needed (and vice versa) → `x-show` toggles `display` (element stays in DOM), `x-if` fully adds/removes. Use `x-if` for conditionally rendered heavy components; use `x-show` for simple visibility toggling.
- **[MEDIUM]** DOM reads immediately after state mutation without `$nextTick` → reading stale DOM before Alpine has flushed reactive updates. Wrap post-mutation DOM reads in `this.$nextTick(() => { ... })`.
- **[LOW]** `x-transition` classes conflicting with Tailwind's transition utilities applied to the same element → competing transition durations causing visual glitches. Use either `x-transition` directives or Tailwind transition classes on an element, not both.
