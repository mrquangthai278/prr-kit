# TanStack Query (React Query) — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from '@tanstack/react-query'`, `from 'react-query'`, `useQuery`, `useMutation`, `QueryClient`, `QueryClientProvider`

---

## Security
- **[CRITICAL]** Single `QueryClient` instance shared across SSR requests (module-level singleton) → cached data from user A served to user B. Create a new `QueryClient` per server request; only share client-side.
- **[HIGH]** Query cache not cleared on user logout → stale authenticated data (PII, private content) accessible to the next user of the same browser session. Call `queryClient.clear()` on logout before redirecting.
- **[HIGH]** `queryFn` making requests without attaching auth headers or cookies → unauthenticated API calls returning empty or error responses. Centralize auth header attachment in a shared fetch wrapper passed to all `queryFn`s.
- **[MEDIUM]** Sensitive PII cached with `gcTime: Infinity` or very long `staleTime` → private data persists in memory longer than the session. Set conservative `gcTime` and `staleTime` for queries containing PII; clear on logout.

---

## Performance
- **[HIGH]** `staleTime` not set (defaults to `0`) → data refetched on every component mount and every window focus event. Set `staleTime` based on data volatility: `staleTime: 60_000` for semi-static data.
- **[HIGH]** `refetchInterval` set aggressively (< 5s) for non-real-time data → unnecessary server load and bandwidth consumption. Use WebSockets or SSE for real-time data; set `refetchInterval` to the minimum meaningful update frequency.
- **[HIGH]** Parallel independent queries not using `useQueries` → multiple `useQuery` hooks cause sequential waterfall in some renderers. Combine parallel queries with `useQueries([{ queryKey, queryFn }, ...])` for concurrent execution.
- **[MEDIUM]** `select` option not used to derive/transform data → entire raw response stored in cache and components re-render on any field change. Use `select: (data) => transform(data)` to subscribe only to the derived slice.
- **[MEDIUM]** `gcTime: Infinity` set globally or on large queries → memory grows unboundedly in long-running SPAs. Use the default `gcTime` (5 minutes) or set it explicitly; never use `Infinity` for large datasets.
- **[LOW]** Prefetching not used for predictable navigation (hover, visible links) → users wait for data fetch after every navigation. Use `queryClient.prefetchQuery` on hover or route anticipation to pre-warm the cache.

---

## Architecture
- **[HIGH]** Query key arrays defined as inline literals across multiple files (`['users', id]`) → typos cause cache misses and broken invalidation. Centralize query keys in a factory: `userKeys.detail(id)` returning `['users', 'detail', id]`.
- **[HIGH]** `queryFn` containing business logic (data transformation, error mapping) instead of pure data fetching → logic untestable in isolation. Keep `queryFn` as a thin fetch wrapper; transform data in `select` or a separate utility.
- **[MEDIUM]** Overly broad query key used for invalidation (e.g. `['users']` invalidating all user queries) → unnecessary refetches for unrelated components. Use scoped keys and targeted invalidation: `queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })`.
- **[MEDIUM]** Mutations missing optimistic updates for latency-sensitive UI interactions (like/dislike, reorder) → UI lags behind user action. Implement `onMutate`/`onError`/`onSettled` pattern for optimistic updates on interactive mutations.
- **[MEDIUM]** Dependent queries not using the `enabled` flag → query fires immediately with `undefined` params, causing spurious 400/404 errors. Use `enabled: !!userId` to prevent a query from running until its dependencies are ready.

---

## Code Quality
- **[HIGH]** `useQuery` called without TypeScript generics (`useQuery<TData, TError>`) → data and error typed as `unknown`, losing type safety throughout the component. Always provide generics or use a typed query factory that infers them.
- **[HIGH]** `error` state not handled in every `useQuery` consumer → components render loading or empty state indefinitely on error. Destructure `error` and `isError` and render an appropriate error UI in every query consumer.
- **[MEDIUM]** `queryKey` as inline array literal (`['posts', id]`) → referential instability causes unnecessary cache misses in `useQuery` comparisons. Define query keys via factory functions that return stable arrays.
- **[LOW]** `QueryClient` default options not configured globally → each query re-specifies the same `staleTime`, `retry`, and `refetchOnWindowFocus` options. Set sensible app-wide defaults in `new QueryClient({ defaultOptions: { queries: { ... } } })`.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** Cached query data mutated directly (`data.items.push(newItem)`) instead of using `setQueryData` → bypasses TanStack Query's immutability contract, causing unpredictable re-renders and cache corruption. Always produce new objects: `queryClient.setQueryData(key, old => ({ ...old, items: [...old.items, newItem] }))`.
- **[CRITICAL]** `useQuery` called conditionally (inside an `if` or after an early return) → violates React Rules of Hooks, causing runtime error. Always call `useQuery` unconditionally at the top level; use the `enabled` option to control when fetching occurs.
- **[HIGH]** `onSuccess` callback used in TanStack Query v5 (`useQuery` no longer supports it) → silent no-op, invalidation or side effects never run. Migrate to `mutation.isSuccess` in render or use `useEffect` watching `isSuccess`.
- **[HIGH]** `queryKey` not including all variables the query depends on (e.g. filters, page number omitted) → stale data served when variables change, cache never invalidated correctly. Include every variable that affects the query result in the key array.
- **[HIGH]** SSR dehydration/hydration with non-serializable data (`Date`, `Map`, `Set`) in cached queries → hydration mismatch or JSON serialization failure. Use `superjson` as the serializer for `dehydrate`/`hydrate`, or convert to serializable types before caching.
