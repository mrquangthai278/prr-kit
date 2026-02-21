# Redux / Redux Toolkit — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `redux` or `@reduxjs/toolkit` in deps · `createSlice` · `configureStore` · `useSelector` · `useDispatch` · `createAsyncThunk` · `createSelector`

---

## Security

- **[MEDIUM]** Storing sensitive data (auth tokens, PII) in Redux store → Redux DevTools extension serializes and displays the entire store; Redux Persist may write to `localStorage` in plaintext. Store sensitive values in memory-only variables or use encryption.

---

## Performance

- **[HIGH]** Selector not memoized with `createSelector` (Reselect) → selector recomputes on every `useSelector` call whenever any store state changes, even if its inputs are unchanged. Memoize derived / filtered data.
- **[HIGH]** `useSelector` selecting an entire slice object: `useSelector(state => state.users)` → component re-renders on any change to the users slice. Select the minimal required value.
- **[HIGH]** `dispatch` called in `useEffect` without correct dependency array → infinite dispatch loop or missing updates.
- **[MEDIUM]** Storing derived or computed data in Redux state (e.g., filtered lists) → creates sync issues and redundancy. Compute on-the-fly with a memoized selector.
- **[MEDIUM]** Multiple sequential dispatches that should be a single atomic state update → each dispatch causes a render cycle. Use a single action that covers all changes, or `batch()`.
- **[LOW]** Overly normalized state requiring many lookups to render a single component → denormalize for read-heavy UI slices using `createEntityAdapter` selectors.

---

## Architecture

- **[CRITICAL]** Mutating state directly in a reducer outside of Redux Toolkit (Immer) context: `state.items.push(item)` without RTK → Redux requires immutability for change detection. Use spread or RTK (which uses Immer internally).
- **[HIGH]** Storing non-serializable values in Redux state: functions, class instances, `Map`, `Set`, `Promise`, `Date` → Redux Toolkit middleware warns; Redux DevTools breaks; persistence fails. Use plain serializable values.
- **[MEDIUM]** `createAsyncThunk` thunk not returning the result: `dispatch(fetchUser(id))` but caller needs the result → thunks return a promise; `return dispatch(thunk).unwrap()` to await and propagate errors.
- **[MEDIUM]** Using raw `redux-thunk` to implement data fetching that RTK Query would handle → reinventing caching, loading states, and invalidation logic. Use RTK Query for server data.
- **[LOW]** Action type strings not namespaced: `type: 'SET_USER'` → collision risk in large apps. Use `slice/actionName` convention (RTK does this automatically).

---

## Code Quality

- **[HIGH]** Large `switch` statement reducers instead of `createSlice` → verbose, string-based action types are error-prone. Migrate to Redux Toolkit.
- **[MEDIUM]** `extraReducers` missing `pending` and `rejected` cases for async thunks → no loading/error state tracked. Handle all three lifecycle states.
- **[MEDIUM]** Accessing `action.payload` without type guard in manually typed reducers → runtime error if payload shape differs. Use RTK's TypeScript integration.
- **[LOW]** Redux state shape deeply nested > 3 levels → hard to update immutably (lots of spread operators) and hard to select from. Flatten or use `createEntityAdapter`.

---

## Common Bugs & Pitfalls

- **[HIGH]** Immer-based reducer (RTK) mixes mutations and returns a new object: `state.items.push(x); return { ...state }` → returning a value AND mutating causes Immer error. Do one or the other, not both.
- **[HIGH]** Action creator called without `dispatch`: `fetchUser(id)` instead of `dispatch(fetchUser(id))` → action object created but never dispatched, state never updates.
- **[MEDIUM]** `createSelector` input selector returning a new object reference on every call → memoization never hits because input is always "new". Ensure input selectors return stable references.
- **[LOW]** `initialState` with `undefined` values → `undefined` vs `null` difference causes subtle comparison bugs in selectors. Be explicit with `null` for intentionally absent values.
