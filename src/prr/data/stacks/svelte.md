# Svelte / SvelteKit — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.svelte` files, `svelte.config.*`, `from 'svelte'`, `$store`, SvelteKit `+page.svelte`, `+layout.svelte`, `+server.ts`

---

## Security

- **[CRITICAL]** `{@html userContent}` with user-controlled data → XSS. Svelte escapes `{}` by default; `{@html}` bypasses this. Use only with sanitized/trusted content.
- **[HIGH]** Server route (`+server.ts`) missing authentication check → unprotected endpoint.
- **[HIGH]** `PUBLIC_` env prefix on secrets in SvelteKit → exposed to browser. Only prefix genuinely public values.
- **[HIGH]** Sensitive data in `load()` function return passed to client layout → serialized into HTML, visible to user.
- **[MEDIUM]** Missing CSRF check on form actions in SvelteKit.

---

## Performance

- **[HIGH]** Svelte store subscriptions in component not cleaned up (manual `subscribe`) → memory leak. Use `$store` auto-subscription syntax instead.
- **[HIGH]** `{#each}` on large arrays without `key` expression → O(n) DOM diffing. Always use `{#each items as item (item.id)}`.
- **[MEDIUM]** Reactive declaration (`$:`) depending on entire object → re-runs on any nested change. Be specific.
- **[MEDIUM]** Heavy computation in reactive statement without memoization → recalculates on every reactive update.
- **[LOW]** Missing SvelteKit `preload` / `prefetch` links → navigation not pre-fetched, slower perceived performance.

---

## Architecture

- **[HIGH]** Business logic directly in `.svelte` file → extract to `+page.ts` load function or a separate `.ts` module.
- **[MEDIUM]** Writable store mutated from multiple components without central action → unpredictable state.
- **[MEDIUM]** Context API (`setContext`/`getContext`) used across distant components instead of a store → harder to track.
- **[LOW]** Component dispatching custom events with non-namespaced names → conflicts with native DOM events.

---

## Common Bugs & Pitfalls

- **[HIGH]** Reactive variable `$:` not triggering because object reference doesn't change (mutating array in place) → use spread/immutable update.
- **[HIGH]** `onDestroy` not called because component is server-rendered → guard lifecycle calls with `browser` check from `$app/environment`.
- **[MEDIUM]** Two-way binding `bind:value` on non-primitive → binding to object property reference issues.
- **[MEDIUM]** `{#await}` block without `:catch` → unhandled promise rejection silently swallowed.
- **[LOW]** Transition/animation applied to component that conditionally renders — transition runs on mount even when not desired.
