# Apollo GraphQL — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from '@apollo/client'`, `from 'apollo-server'`, `ApolloClient`, `` gql` ``, `useQuery`, `useMutation`, `ApolloServer`

---

## Security
- **[CRITICAL]** GraphQL introspection enabled in production → full schema structure (types, fields, mutations) exposed to attackers for reconnaissance. Disable with `introspection: process.env.NODE_ENV !== 'production'` in `ApolloServer` options.
- **[CRITICAL]** Field-level authorization missing in resolvers → any authenticated user can query any field regardless of ownership or role. Implement field-level authorization in each resolver using a library like `graphql-shield` or explicit permission checks.
- **[HIGH]** Query depth not limited → deeply nested queries (exponential explosion) cause CPU and memory DoS. Add `graphql-depth-limit` and `graphql-query-complexity` plugins to `ApolloServer`.
- **[HIGH]** Query complexity not calculated → a single query joining many relations can overload the database. Define complexity scores per field and reject queries exceeding a threshold.
- **[HIGH]** User input passed directly to database query inside a resolver without parameterization → SQL or NoSQL injection. Always use parameterized queries or ORM methods; never interpolate input into query strings.
- **[HIGH]** Resolver errors leaking stack traces to the client in production → internal implementation details and file paths exposed. Use `formatError` in `ApolloServer` to strip stack traces and internal details from production error responses.
- **[MEDIUM]** Subscriptions not authenticated → WebSocket connections for GraphQL subscriptions bypass HTTP middleware auth checks. Validate auth token in the `onConnect` hook of the subscriptions server.

---

## Performance
- **[HIGH]** N+1 problem in list resolvers: parent resolver fetches a list, child resolver fetches per-item → 1 + N database queries per request. Batch child resolvers with `DataLoader`, keying by parent ID.
- **[HIGH]** `@cacheControl` directives absent on cacheable query fields → CDN and Apollo's response cache cannot cache responses, every request hits the origin. Add `@cacheControl(maxAge: N)` directives to stable fields.
- **[HIGH]** `useQuery` called without `fetchPolicy` in a context where fresh data is not required → defaults to network request on mount in some configurations, bypassing cache. Set `fetchPolicy: 'cache-first'` for stable data and `'network-only'` only where freshness is critical.
- **[MEDIUM]** Large fragments applied to every query even when only a few fields are needed → over-fetching increases payload size and resolver execution cost. Use specific field selections; reserve fragments for genuinely shared selection sets.
- **[MEDIUM]** GraphQL subscriptions not unsubscribed on component unmount → WebSocket subscriptions continue consuming server resources. Return the unsubscribe function from `useEffect` or rely on Apollo Client's `useSubscription` cleanup.
- **[LOW]** Automatic Persisted Queries (APQ) not enabled in production → full query strings sent on every request, increasing payload size. Enable APQ on both client and server to send only a hash after the first request.

---

## Architecture
- **[HIGH]** Business logic (validation, side effects, external API calls) implemented directly in resolvers → resolvers untestable in isolation and logic duplicated across REST and GraphQL endpoints. Extract to a service/domain layer called from resolvers.
- **[HIGH]** Schema defined entirely in code-first style without a reviewed SDL → schema design reviewed only after implementation, making structural problems expensive to fix. Adopt schema-first design with a reviewed `.graphql` SDL file as the source of truth.
- **[MEDIUM]** `context` not used to share common dependencies (database connection, authenticated user, DataLoader instances) → dependencies instantiated inside each resolver causing inconsistency and waste. Build a typed context object in the `context` factory function and inject shared resources.
- **[MEDIUM]** Mutations not following the `input` type convention `mutation CreateUser(input: CreateUserInput!)` → argument lists grow unwieldy and breaking changes are harder to manage. Wrap all mutation arguments in a single named `input` type.
- **[MEDIUM]** Schema not using federation for a microservices architecture → all types defined in a monolithic schema, creating a single point of failure. Use Apollo Federation with `@key` directives to distribute schema ownership across services.
- **[LOW]** No query cost analysis in CI → expensive queries introduced by developers go undetected until production load. Add complexity analysis to the test suite with cost thresholds enforced as failing tests.

---

## Code Quality
- **[HIGH]** Resolver `context` parameter typed as `any` → no autocomplete, no type safety on auth user, DB, or DataLoader access. Define and export a typed `Context` interface and apply it to all resolvers.
- **[HIGH]** Query fragments not used for shared field selections across multiple operations → same field list copy-pasted across queries, diverging silently. Define named fragments for shared selections and import via `...FragmentName`.
- **[MEDIUM]** `__resolveType` not implemented on union or interface types → Apollo cannot determine the concrete type for polymorphic responses, causing runtime errors. Implement `__resolveType` in the resolver map for every union and interface.
- **[MEDIUM]** Resolver return types do not match the schema definition (e.g., returning `null` for non-nullable fields) → Apollo throws a null propagation error that can mask the root cause. Align resolver return types strictly with the schema and handle nullability explicitly.
- **[LOW]** Generated TypeScript types from GraphQL schema (`graphql-codegen`) not used → type safety benefit of GraphQL wasted. Run `graphql-codegen` in CI and use generated types for all resolver and hook signatures.

---

## Common Bugs & Pitfalls
- **[HIGH]** `useQuery` result destructuring does not handle `loading` or `error` states → component renders with `undefined` data causing runtime crashes. Always handle all three states: `if (loading) return <Spinner />; if (error) return <Error />;`.
- **[HIGH]** Apollo cache not normalized correctly after mutation → stale cached data persists because the mutated object is not updated by ID. Ensure Apollo's `InMemoryCache` has a correct `keyFields` configuration and that mutations return updated objects with their `id`.
- **[MEDIUM]** `refetchQueries` not listing all queries affected by a mutation → related queries display stale data after mutation succeeds. Enumerate all affected operation names in `refetchQueries` or use `update` to manually update the cache.
- **[MEDIUM]** Optimistic response shape does not exactly match the server response shape → cache corruption when the real response arrives and cannot be merged with the optimistic entry. Match the optimistic response field names, types, and `__typename` exactly to the expected server response.
- **[MEDIUM]** `useMutation` error not caught → mutation rejection is an unhandled promise if `onError` is not provided and the result is not checked. Always provide an `onError` callback or check the returned `error` value.
- **[LOW]** Apollo Client DevTools browser extension not installed during development → cache contents, query results, and mutation history not inspectable. Install the Apollo DevTools extension and enable it via `connectToDevTools: true` in dev builds.
