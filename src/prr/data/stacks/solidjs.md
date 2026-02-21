# SolidJS — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from 'solid-js'` · `createSignal` · `createEffect` · `createStore` · `<Show>` · `<For>` · `<Switch>` · `vite-plugin-solid` · `solid-start`

---

## Security

- **[HIGH]** `innerHTML={userContent}` or direct DOM `.innerHTML =` with user-controlled data → XSS. Use text interpolation `{userContent}` which escapes output, or sanitize with DOMPurify before setting innerHTML.

---

## Performance

- **[CRITICAL]** Destructuring props: `const { count, label } = props` in a component → breaks reactivity. Props in Solid are reactive getters; destructuring extracts the current value at call time. Always access as `props.count`.
- **[HIGH]** Calling a signal getter outside a tracking scope (effect, memo, JSX) → dependency not tracked, UI won't update when signal changes.
- **[HIGH]** Expensive computation inside JSX without `createMemo` → recomputes on every reactive update in the enclosing scope, not just when its inputs change. Wrap in `createMemo`.
- **[MEDIUM]** `createEffect` with side effects that depend on signals read outside the effect body → those signals aren't tracked. Read all reactive dependencies inside the effect.
- **[LOW]** `<Index>` used for a list that frequently adds/removes items (vs. `<For>`) → `<Index>` is optimized for stable items; `<For>` reconciles by identity. Pick the right list primitive.

---

## Architecture

- **[HIGH]** Applying React mental model to Solid → Solid signals ≠ React hooks. Solid components run once; there is no re-render cycle. Logic that worked with React's render-on-state-change will behave differently.
- **[MEDIUM]** Overusing `createStore` for flat, simple state where `createSignal` suffices → `createStore` is for nested reactive objects. Signals are simpler and more explicit for primitive values.
- **[LOW]** Top-level reactive state in a module (singleton store) without cleanup → fine for app-level state but leaks between tests if module isn't reset.

---

## Code Quality

- **[HIGH]** Missing `onCleanup` inside `createEffect` for subscriptions, event listeners, or timers → resources leak when the reactive scope is disposed (component unmounted).
- **[MEDIUM]** `createMemo` wrapping a non-expensive expression → memo adds tracking overhead. Only use for computationally expensive or derived values.
- **[LOW]** Using `untrack()` broadly to suppress reactivity instead of restructuring code → hides the real issue of over-broad reactive dependencies.

---

## Common Bugs & Pitfalls

- **[CRITICAL]** Signal read in JSX without calling the getter: `<div>{count}</div>` instead of `<div>{count()}</div>` → renders the function reference as a string, no reactivity. In Solid, signals are functions — always call them.
- **[HIGH]** Async `createEffect` → Solid's tracking context does not extend across `async/await`. Signals read after the first `await` are not tracked. Use `createResource` for async data.
- **[MEDIUM]** `batch()` not used when dispatching multiple signal updates that should trigger a single downstream effect → each `set*` call triggers separate reactive updates; batch them for atomic updates.
- **[LOW]** Conditional signal reads that change between renders → in Solid, reactive graph is static per component execution. Dynamic conditional reads can cause unstable dependency graphs.
