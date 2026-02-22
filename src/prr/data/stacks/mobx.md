# MobX — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from 'mobx'`, `from 'mobx-react-lite'`, `observable`, `action`, `computed`, `makeAutoObservable`, `observer()`

---

## Security
- **[HIGH]** Observable state accessed and passed directly to external APIs without filtering → internal model structure exposed. Map to DTOs before serializing or transmitting store data.
- **[HIGH]** Actions modifying state from async callbacks without wrapping in `runInAction` → MobX strict mode throws, or silent inconsistency in non-strict mode. Always wrap post-await mutations in `runInAction(() => { ... })`.
- **[MEDIUM]** Sensitive observable data (tokens, PII) serialized via `toJS()` and logged or sent to analytics → data exfiltration. Exclude sensitive fields before serializing.
- **[MEDIUM]** `autorun` or `reaction` not disposed when the owning component or service is torn down → background observation continues indefinitely, capturing stale closure references. Store the disposer and call it in cleanup.
- **[LOW]** Store instances attached to `window` for debugging in production → full application state accessible from the browser console. Remove or gate behind dev-mode checks.

---

## Performance
- **[HIGH]** React component not wrapped in `observer()` → component never re-renders when observables change, always shows stale data. Wrap every component that reads observables in `observer()`.
- **[HIGH]** `computed` values with expensive calculations not accessed consistently → MobX suspends and recomputes on each access when there are no active observers. Keep a persistent observer or use `keepAlive` carefully.
- **[HIGH]** `reaction` with expensive side effects (network calls, heavy computation) firing on every granular observable change without debouncing → performance degradation. Debounce or use `reaction` options `delay`.
- **[MEDIUM]** `toJS()` called in the render path to convert observables to plain objects → deep clone on every render. Access observable properties directly; MobX tracks granular field access.
- **[MEDIUM]** Accessing observable arrays with index notation `store.items[i]` inside non-observer context → no tracking. Use `store.items.slice()` or access inside an `observer` component.
- **[LOW]** `makeAutoObservable` on objects with many properties where only a few need reactivity → unnecessary observation overhead. Use `makeObservable` with explicit annotations for fine-grained control.

---

## Architecture
- **[HIGH]** State mutation outside an `action` in MobX strict mode → MobX throws "not allowed to change state when not in action". Enable strict mode (`configure({ enforceActions: 'always' })`) and wrap all mutations.
- **[HIGH]** Domain and business logic placed in React components instead of MobX store classes → logic not reusable or testable in isolation. Move to store methods decorated with `action`.
- **[MEDIUM]** `autorun` creating circular dependency (autorun reads A, action inside writes A) → infinite reaction loop and stack overflow. Refactor to break the cycle; use `reaction` with explicit tracked/effect split.
- **[MEDIUM]** Store-to-store direct imports creating circular module dependencies → bundler warnings or runtime failures. Pass dependent stores via constructor injection or a root store pattern.
- **[MEDIUM]** Not using `flow` for async actions → manual `runInAction` calls required after every `await`, easy to forget. Use `flow(function* () { ... })` for generator-based async actions with automatic action wrapping.
- **[LOW]** Single root store holding all application state without domain separation → hard to test and reason about. Compose domain stores (AuthStore, CartStore) under a RootStore.

---

## Code Quality
- **[HIGH]** `makeAutoObservable` used on a class that uses inheritance → MobX does not support `makeAutoObservable` on subclasses. Use `makeObservable` with explicit annotations in inheritance hierarchies.
- **[HIGH]** Class properties not annotated explicitly when not using `makeAutoObservable` → properties treated as plain values, reactivity silently missing. Annotate every observable, action, and computed explicitly with `makeObservable`.
- **[MEDIUM]** `reaction` or `autorun` disposer not stored and called in `useEffect` return → event handler leaks after component unmount. Return `() => disposer()` from `useEffect`.
- **[MEDIUM]** `computed` used for values that have side effects (logging, network calls) → `computed` must be pure; side effects in computed cause undefined behavior. Move side effects to `reaction` or `autorun`.
- **[LOW]** Overusing `computed` for trivial derivations that are just property accesses → unnecessary overhead. Reserve `computed` for values with meaningful caching benefit.
- **[LOW]** Store methods named inconsistently with MobX conventions → actions not recognizable at a glance. Prefix mutating methods with a verb (`setUser`, `addItem`, `resetCart`).

---

## Common Bugs & Pitfalls
- **[CRITICAL]** Observable value read inside `useEffect` without `reaction` or `autorun` → `useEffect` does not re-run when the observable changes, data permanently stale. Use `reaction(() => store.value, handler)` inside `useEffect` with proper cleanup.
- **[HIGH]** Method that modifies observable not decorated with `@action` or registered via `makeObservable` → strict mode throws, non-strict mode shows warnings and potential tearing. Annotate all mutating methods as actions.
- **[HIGH]** `computed` property with side effects (API call, `console.log`) → computed may be called multiple times and in unexpected order. Computed values must be pure derivations; side effects belong in reactions.
- **[MEDIUM]** `when(predicate, effect)` condition already true at registration time → effect runs synchronously and immediately, which can cause unexpected behavior during initialization. Guard with lifecycle awareness or use `reaction` instead.
- **[MEDIUM]** Observable `Map` or `Array` methods returning non-observable plain values when destructured → reactivity lost. Use `.entries()`, `.values()` on observable maps and avoid destructuring observable arrays outside observers.
- **[MEDIUM]** Passing observable objects as props without `observer` on child component → child never re-renders when observable changes. Either make child an `observer` or pass computed primitive values as props.
- **[LOW]** `configure({ enforceActions: 'always' })` not set → silent state mutations outside actions accumulate technical debt. Enable strict mode early in the project lifecycle.
