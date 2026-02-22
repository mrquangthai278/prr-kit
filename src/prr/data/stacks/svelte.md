# Svelte / SvelteKit — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.svelte` files, `svelte.config.*`, `from 'svelte'`, `$store`, `+page.svelte`, `+layout.svelte`, `+server.ts`, `$app/`, `svelte:` tags

---

## Security

- **[CRITICAL]** `{@html userContent}` with user-controlled data → XSS. Svelte escapes `{}` by default; `{@html}` bypasses this. Sanitize with DOMPurify first.
- **[CRITICAL]** SvelteKit `load()` function returning sensitive data without auth check → serialized into HTML, sent to client.
- **[HIGH]** `+server.ts` route missing authentication check → unprotected API endpoint.
- **[HIGH]** `PUBLIC_` env prefix on secrets → exposed to browser. Non-public secrets use `$env/static/private` / `$env/dynamic/private`.
- **[HIGH]** Form action mutation missing CSRF protection (SvelteKit handles this but `csrf.checkOrigin: false` config disables it).
- **[HIGH]** `eval()` in Svelte component or action with user input → code injection.
- **[HIGH]** User-controlled `<svelte:component this={...}>` → arbitrary component injection.
- **[MEDIUM]** `event.locals` set in `hooks.server.ts` without proper auth validation → auth state not verified.
- **[MEDIUM]** Sensitive data in `$page.data` (SvelteKit store) accessible in client-side devtools.
- **[LOW]** XSS via `href={userUrl}` without protocol validation → `javascript:` injection.

---

## Performance

- **[HIGH]** Svelte store subscriptions with manual `subscribe()` not unsubscribed in `onDestroy` → memory leak. Use `$store` auto-subscription.
- **[HIGH]** `{#each}` on large arrays without `key` expression → O(n) DOM diffing. Use `{#each items as item (item.id)}`.
- **[HIGH]** SvelteKit not using `+page.server.ts` for data fetching → client-side fetch waterfall.
- **[HIGH]** Reactive declaration `$:` depending on entire object/array → recalculates on any nested change.
- **[HIGH]** Heavy computation in `$:` reactive statement → runs synchronously on every dependency change.
- **[MEDIUM]** Not using `svelte:fragment` → adding unnecessary wrapper DOM elements.
- **[MEDIUM]** `{#if}` / `{/if}` on frequently toggling content → DOM destroy/recreate. Use CSS `visibility` for keep-alive.
- **[MEDIUM]** Importing large libraries in `.svelte` file that could stay in `+page.server.ts`.
- **[MEDIUM]** Svelte transitions/animations running on server → use `browser` guard from `$app/environment`.
- **[LOW]** Missing `data-sveltekit-preload-data` on navigation links → no prefetching on hover.
- **[LOW]** Unused CSS selectors not removed → Svelte warns, but increases style bundle.

---

## Architecture

- **[HIGH]** Business logic in `.svelte` file → extract to `+page.ts` load function or service module.
- **[HIGH]** Writable store mutated from multiple components without centralized actions → unpredictable state.
- **[HIGH]** Calling `goto()` from non-browser context (SSR) → throws. Guard with `if (browser)`.
- **[MEDIUM]** `setContext`/`getContext` across distant components instead of store → harder to track data flow.
- **[MEDIUM]** Not using SvelteKit form actions for mutations → manual `fetch` + reloading.
- **[MEDIUM]** `event.depends('key')` not used in load functions that need manual invalidation.
- **[MEDIUM]** Stores defined at module level shared between SSR requests → user data leakage between requests.
- **[LOW]** `on:click` instead of `<button>` for interactive elements → accessibility issue.
- **[LOW]** Component dispatching events with non-prefixed names → conflicts with native DOM events.

---

## Code Quality

- **[HIGH]** `{#await promise}` without `:catch` block → rejected promise silently swallowed.
- **[HIGH]** `bind:this={el}` without null-check before use → undefined on SSR.
- **[MEDIUM]** `$:` reactive block with side effects (API calls) → runs on every dependency change, not just when needed.
- **[MEDIUM]** Two-way `bind:value` on derived/computed value → binding non-reactive source.
- **[MEDIUM]** Not using Svelte's `<svelte:head>` for page-specific meta tags → SEO issues.
- **[MEDIUM]** Missing TypeScript types on component props via `export let prop: Type` → any type assumed.
- **[MEDIUM]** `on:` event handlers not using TypeScript event types (`CustomEvent<T>`).
- **[LOW]** Using `writable` when `readable` or `derived` is semantically correct.
- **[LOW]** Not using `$effect` (Svelte 5 runes) when migrating from Svelte 4 → mixing APIs.

---

## Common Bugs & Pitfalls

- **[HIGH]** Reactive `$:` not triggering because object reference unchanged (mutating array in place) → use spread/immutable update `items = [...items, newItem]`.
- **[HIGH]** `onMount` / `onDestroy` called in SSR context → must guard with `browser` check.
- **[HIGH]** SvelteKit load function returning non-serializable objects (class instances, functions) → hydration error.
- **[HIGH]** `invalidate()` not called after form action mutation → stale `$page.data`.
- **[MEDIUM]** Svelte store `$value` used in `<script>` (not template) → must use `get(store)` or manual subscribe.
- **[MEDIUM]** Transition running on initial render when not desired → use `in:fade|local`.
- **[MEDIUM]** `svelte:component this={null}` → renders nothing but may error in strict mode.
- **[MEDIUM]** Props passed to child with `$$props` / `$$restProps` leaking internal props to DOM elements.
- **[LOW]** `class:active={true}` always → static class, just use `class="active"`.
