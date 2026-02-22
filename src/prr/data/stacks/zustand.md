# Zustand — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from 'zustand'`, `create()`, `useStore`, `persist` middleware, `immer` middleware, `zustand/middleware`

---

## Security
- **[CRITICAL]** Persisting sensitive data (tokens, passwords) to localStorage via `persist` middleware without encryption → credentials readable by any script on the page. Encrypt before persisting or store in httpOnly cookies.
- **[HIGH]** Store reference exported and accessed globally outside React context → no access control, any module can read or mutate state. Expose only hooks, not the raw store object.
- **[HIGH]** Derived actions not validating input before mutating state → malformed data enters store and propagates to all subscribers. Add input validation at action boundaries.
- **[MEDIUM]** `devtools` middleware enabled in production builds → full state history exposed via Redux DevTools browser extension. Gate behind `process.env.NODE_ENV !== 'production'`.
- **[MEDIUM]** Shared store state across SSR requests in server environments → one user's data leaks into another's response. Use request-scoped store instances on the server.
- **[LOW]** Store actions accepting raw event objects → unintentional data captured if `event.target.value` extraction is skipped. Extract primitives before passing to actions.

---

## Performance
- **[HIGH]** Subscribing to entire store with `const state = useStore()` instead of a selector → component re-renders on every store change regardless of relevance. Use `useStore(s => s.specificField)`.
- **[HIGH]** Inline selector functions `useStore(s => s.items.filter(...))` returning new reference every render → triggers re-render loop. Memoize with `useMemo` or use `useShallow` for shallow comparison.
- **[HIGH]** `useShallow` not used when selector returns an object or array → structural equality not checked, re-renders on every state change even when values are identical.
- **[MEDIUM]** Large arrays stored in Zustand without normalization (keyed map) → O(n) scans on every selector call. Normalize to `{ ids: [], entities: {} }` shape.
- **[MEDIUM]** Not using `subscribeWithSelector` middleware for external (non-React) subscriptions → manual subscription does not support granular field tracking.
- **[MEDIUM]** Single massive store with no slice separation → any action update triggers all selectors to re-evaluate. Split into domain slices combined at root.
- **[LOW]** Storing derived/computed values in state instead of computing in selectors → stale derived data when dependencies change. Keep store minimal, derive in selectors.

---

## Architecture
- **[HIGH]** Async logic (`fetch`, `axios`) inside actions without error handling or loading state → promise rejection silently ignored, UI stuck in loading. Handle `try/catch` and set error state explicitly.
- **[HIGH]** Mixing UI state (modal open, tab index) and server/async state in the same store → cache invalidation and loading logic collide. Use TanStack Query or SWR for server state.
- **[MEDIUM]** Monolithic store file with all state and actions in one object → hard to test and maintain. Apply the slices pattern: `create<StoreType>()((...a) => ({ ...authSlice(...a), ...cartSlice(...a) }))`.
- **[MEDIUM]** Store action directly importing and calling another store's `getState()` → tight coupling between stores. Compose at the component or service layer instead.
- **[MEDIUM]** Not using `immer` middleware for nested state updates → verbose and error-prone manual spread chains. Add `immer` middleware and mutate draft directly in actions.
- **[LOW]** Store file exporting multiple unrelated stores → implicit coupling and unclear ownership. One store per domain concern, one file per store.

---

## Code Quality
- **[HIGH]** Store typed as `any` or without an explicit interface → no TypeScript safety on state shape or action signatures. Define and apply a store interface: `create<StoreState & StoreActions>()`.
- **[HIGH]** Actions mutating state by directly modifying the object outside `set()` → bypasses Zustand's update mechanism, subscribers not notified. All mutations must go through `set()` or `immer` draft.
- **[MEDIUM]** Async actions reading store state via closure rather than `getState()` → stale closure captures old state snapshot. Use `get()` (second argument to store creator) inside async actions.
- **[MEDIUM]** Selectors not co-located with the store → business logic for data shape scattered across components. Export named selector functions from the store file.
- **[LOW]** `persist` configuration missing `name` field → defaults to generic key, collides across apps on the same domain. Always set an explicit, namespaced storage key.
- **[LOW]** Store file exporting the raw `useStore` hook without aliased named hooks → consumers must know internal structure. Export named hooks like `useCount`, `useUser`.

---

## Common Bugs & Pitfalls
- **[HIGH]** Selector returning a new object or array literal on every call `useStore(s => ({ a: s.a, b: s.b }))` → infinite re-render loop. Use `useShallow` or restructure to return primitives.
- **[HIGH]** `persist` with `partialize` not excluding non-serializable values (functions, class instances, Sets, Maps) → JSON serialization fails silently or corrupts stored state. Explicitly filter non-serializable fields in `partialize`.
- **[HIGH]** Async action not setting error state on failure → store stuck in `loading: true` with no way to recover. Always set `loading: false` and an `error` field in the catch block.
- **[MEDIUM]** `immer` producer both mutating the draft and returning a new value → undefined behavior, Zustand ignores one. Either mutate draft in place or return a new state object, never both.
- **[MEDIUM]** `devtools` middleware placement in middleware chain → `devtools` must be the outermost wrapper; placing it inside `persist` or `immer` breaks time-travel debugging.
- **[MEDIUM]** Hydration mismatch in SSR when `persist` rehydrates from localStorage after server render → causes React hydration errors. Use `onRehydrateStorage` callback and delay rendering until rehydrated.
- **[LOW]** Missing version field in `persist` config → schema changes cause corrupt old data to be loaded. Add `version` and a `migrate` function to handle upgrades.
