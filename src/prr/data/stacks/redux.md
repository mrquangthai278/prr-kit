# Redux Stack Rules

## Detection Signals
`redux` or `@reduxjs/toolkit` in deps · `createSlice` · `configureStore` · `useSelector` · `useDispatch` · `createAsyncThunk` · `createSelector` · RTK Query

---

## Security

**[HIGH]** Sensitive data (auth tokens, PII, payment info) stored in Redux store → Redux DevTools extension serializes and exposes entire store to anyone with browser devtools. Store tokens in HttpOnly cookies or memory-only variables outside Redux.

**[HIGH]** Redux Persist writing sensitive store slices to localStorage → plaintext in browser storage, readable by any XSS payload on the same origin. Exclude sensitive slices from persistence using a blacklist, or encrypt with redux-persist-transform-encrypt.

**[MEDIUM]** Redux DevTools enabled in production build → exposes full action history and state snapshots to any user with browser devtools installed. Disable DevTools in production via the devTools flag in configureStore.

**[MEDIUM]** Action payloads logged to console or external logger without sanitization → tokens or PII visible to log aggregators and third-party logging services. Sanitize sensitive fields before logging actions.

**[LOW]** Third-party Redux middleware with unknown provenance included in store → middleware has full access to all actions and state, including sensitive data. Audit middleware source code and pin dependency versions.
---

## Performance

**[CRITICAL]** Selector not memoized with `createSelector` (Reselect) → selector recomputes on every render whenever any part of store state changes, even unrelated slices. Memoize all derived or filtered data with createSelector.

**[HIGH]** `useSelector` selecting entire slice: `useSelector(state => state.users)` → component re-renders on any change to any field in the slice, even fields it does not use. Select the minimal required value or field.

**[HIGH]** `dispatch` called inside `useEffect` without correct dependency array → infinite dispatch loop or missing updates when dependencies are stale. Audit effect dependency arrays and add exhaustive-deps lint rule.

**[HIGH]** Multiple sequential dispatches for related state changes → each dispatch triggers a full render cycle, so N dispatches cause N renders. Batch related updates with a single combined action or the RTK batch() helper.

**[HIGH]** Not using RTK Query for server-side data fetching → manually reimplementing caching, deduplication, invalidation, and loading states in every feature. Adopt RTK Query for all API interactions.

**[MEDIUM]** Storing derived or computed data in Redux (filtered lists, formatted values) → sync issues when source data changes and redundant state to keep consistent. Compute with memoized selectors instead of storing computed results.

**[MEDIUM]** `createSelector` input selector returning a new object or array on every call → memoization cache always misses, selector recomputes on every render. Return primitive values or stable references from input selectors.

**[MEDIUM]** `useSelector` called in parent component and result passed as prop to children → parent re-renders on any state change even if children do not use the changed data. Move `useSelector` calls into the child components that actually use the data.

**[MEDIUM]** Not normalizing relational data with `createEntityAdapter` → duplicate data across list and detail views leads to inconsistent updates and O(n) lookups by id. Use EntityAdapter for all list-type state.

**[LOW]** Overly normalized state requiring many selector joins to render a single view → excessive computation on every render in read-heavy components. Denormalize read-heavy slices using createEntityAdapter selectors or derived selectors.
---

## Architecture

**[CRITICAL]** Direct state mutation in reducer outside RTK/Immer context → Redux requires immutability for change detection; mutations cause missed re-renders and stale UI. Use spread operators or RTK with Immer which handles immutability automatically.

**[HIGH]** Non-serializable values in Redux state (functions, class instances, Map, Set, Promise, Date objects) → Redux DevTools breaks, persistence fails, and RTK middleware emits serialization warnings. Use plain serializable values only.

**[HIGH]** All application state stored in Redux including form state, modal open/closed, and local UI toggles → unnecessary complexity and boilerplate for ephemeral state. Use local useState for UI-only state that no other component needs.

**[HIGH]** Redux Thunk used for all async operations instead of RTK Query → verbose code with no built-in caching, deduplication, or invalidation; every feature reimplements the same patterns. Use RTK Query for server data and Thunk only for complex multi-step async logic.

**[HIGH]** Selectors defined inline inside component functions instead of in slice files → not reusable across components, not memoizable with createSelector, not independently testable. Define all selectors in the slice file using createSelector.

**[MEDIUM]** `createAsyncThunk` result not handled with `.unwrap()` in the calling component → errors from rejected thunks are silently swallowed at the call site. Use dispatch(thunk()).unwrap() and catch the promise to surface errors.

**[MEDIUM]** Missing loading, error, and success state tracking for async operations → UI cannot show loading spinners or error messages, user has no feedback on async progress. Handle all three lifecycle states (pending, fulfilled, rejected) in extraReducers.

**[MEDIUM]** Action type strings not namespaced (SET_USER instead of users/setUser) → collision risk in large applications with many slices. RTK slices auto-namespace actions; migrate hand-written action types to createSlice.

**[MEDIUM]** Store shape not typed with RootState and AppDispatch exports → useSelector returns any type, typed dispatch not enforced, runtime type errors in reducers. Export RootState type from store and use TypedUseSelectorHook in a typed hooks file.

**[LOW]** Large switch statement reducers not migrated to `createSlice` → verbose, error-prone string action types, and manual immutable update logic. Migrate to RTK createSlice for automatic action creators and Immer-powered reducers.
---

## Code Quality

**[HIGH]** `extraReducers` missing pending and rejected cases for async thunks → no loading or error state tracked in the slice, UI cannot reflect async progress. Handle all three lifecycle states for every createAsyncThunk.

**[HIGH]** Large switch statement reducer instead of `createSlice` → verbose action type strings, error-prone manual immutability, no automatic action creators. Migrate to RTK createSlice.

**[HIGH]** Accessing `action.payload` without type guard in manually typed reducers → runtime error if payload shape differs from expectation. Use RTK createSlice with typed PayloadAction or add explicit type guards.

**[MEDIUM]** Slice actions exported incorrectly or forgotten from the slice file → action creator not available in components, dispatch(undefined) silently fails or throws. Always export actions from slice.actions and verify imports.

**[MEDIUM]** `combineReducers` not typed → implicit any on slice reducers, no autocomplete for state shape. Use TypedUseSelectorHook with explicit RootState type.

**[MEDIUM]** Not using `createEntityAdapter` for list-type state → manual CRUD operations on arrays are verbose, error-prone, and hard to keep normalized. Use EntityAdapter for all collections with id-keyed access.

**[MEDIUM]** RTK Query endpoint tags not defined on query endpoints → cache is never invalidated after mutations, stale data shown indefinitely after writes. Define providesTags on queries and invalidatesTags on mutations.

**[MEDIUM]** RTK Query not using providesTags and invalidatesTags for cache management → manual refetch needed after every mutation; users see outdated data. Define tag relationships to enable automatic cache invalidation.

**[LOW]** initialState with undefined values instead of explicit null → undefined vs null causes subtle comparison bugs in reducers and selectors. Use explicit null for absent optional values in initialState.

**[LOW]** Store configured with middleware array spread accidentally removed → default middleware (thunk, DevTools, serializability check) silently removed when middleware array is not spread correctly. Always spread getDefaultMiddleware() when adding custom middleware.

---

## Common Bugs & Pitfalls

**[HIGH]** Immer reducer mixes mutation and new object return: state.items.push(x); return {...state} → Immer error at runtime; you must either mutate the draft or return a new value, never both. Do one or the other, never mix in the same reducer case.

**[HIGH]** Action creator called without dispatch: fetchUser(id) instead of dispatch(fetchUser(id)) → action object created but never dispatched, state never updates, no error thrown. Always call dispatch() around every action creator or thunk.

**[HIGH]** `useSelector` called outside React component tree (in event handler or module scope) → stale closure value, not reactive to state changes, potential runtime error. Always call useSelector inside a React function component or custom hook.

**[HIGH]** RTK Query hook called conditionally (inside if/switch before other hooks) → violates React hook rules, causes runtime error on conditional renders. All hook calls must be at the top level of the component unconditionally.

**[MEDIUM]** `createSelector` not given stable input selectors → recomputes every render because input reference changes each call, memoization never hits. Ensure input selectors are stable functions defined outside the component.

**[MEDIUM]** RTK Query optimistic update not rolled back on error → UI shows updated state even after server rejects the mutation, permanently out of sync. Implement onQueryStarted with patchResult.undo() in the catch block.

**[MEDIUM]** `useDispatch` result incorrectly added to useEffect dependency array → useDispatch returns a stable reference; adding it to deps is harmless but misleading and can cause confusion. Remove dispatch from effect deps arrays.

**[LOW]** Redux state shape deeply nested (more than 3 levels) → verbose spread operators required for immutable updates, easy to accidentally mutate. Flatten state shape or use createEntityAdapter to eliminate nesting.