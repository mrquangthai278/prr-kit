# GraphQL — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.graphql` / `*.gql` files, `gql\`\``, `GraphQLSchema`, `typeDefs`, `resolvers`, `ApolloServer`, `graphql-yoga`, `pothos`, `nexus`

---

## Security

- **[CRITICAL]** Missing field-level authorization in resolver → any authenticated user queries any field/mutation. Check permissions per-resolver, not just at route level.
- **[CRITICAL]** Introspection enabled in production → full schema exposed to attackers. Set `introspection: false` in production.
- **[HIGH]** Missing query depth limit → nested queries cause exponential DB calls (DoS). Use `graphql-depth-limit` (max 7-10 levels).
- **[HIGH]** Missing query complexity limit → single query requesting thousands of nodes. Use `graphql-query-complexity`.
- **[HIGH]** User-controlled field names in dynamic resolver → injection or over-fetching of sensitive fields.
- **[HIGH]** Batch query abuse — 1000 aliases in single query bypassing per-query rate limit. Limit max aliases.
- **[HIGH]** Missing rate limiting at GraphQL endpoint → high-complexity queries bypass REST-level limits.
- **[HIGH]** GraphQL errors leaking stack traces → configure custom error formatter to strip internal details.
- **[MEDIUM]** IDOR in resolver — fetching resource by ID in args without ownership check.
- **[MEDIUM]** Subscription not authenticated → real-time events delivered to unauthenticated WebSocket.
- **[LOW]** `directives` not documented or enforced on sensitive fields → ad-hoc security.

---

## Performance

- **[CRITICAL]** N+1 in resolver — DB query per parent node's children. Use `DataLoader` for batching + per-request caching.
- **[HIGH]** Resolver fetching all related data regardless of selection set → over-fetching. Use projection based on `info.fieldNodes`.
- **[HIGH]** No persisted queries → clients send full query string each request, larger payload, no CDN caching.
- **[HIGH]** `DataLoader` not scoped per-request → stale data served from previous request's loader cache.
- **[HIGH]** Subscription sending full object on every update when client only needs changed fields.
- **[MEDIUM]** Missing `@cacheControl` directives → CDN cannot cache GraphQL responses.
- **[MEDIUM]** Over-fetching in resolvers — entire DB record loaded for 2-field selection.
- **[MEDIUM]** `context.dataloaders` not used → DataLoader instances not shared across resolvers in request.
- **[MEDIUM]** Deeply nested fragment spread causing resolver chain traversal on every request.
- **[LOW]** Not using `graphql-jit` for hot query compilation.

---

## Architecture

- **[HIGH]** Business logic in resolver functions → move to service/domain layer; resolvers orchestrate only.
- **[HIGH]** Schema-first vs code-first inconsistency in same project → pick one, enforce via lint.
- **[HIGH]** Mutations not returning affected type → client must do extra query to refresh; return mutated entity.
- **[HIGH]** Missing input validation on mutation args → invalid data reaches business logic.
- **[MEDIUM]** Overloaded `Query` type with dozens of top-level fields → use namespaced query types.
- **[MEDIUM]** Not using schema federation for microservices → monolithic schema becomes bottleneck.
- **[MEDIUM]** Context not used for shared services (DB, auth, DataLoader) → instantiating per-resolver.
- **[MEDIUM]** Union/interface types not used for polymorphic data → overloaded nullable fields.
- **[LOW]** Missing `description` on types/fields → poor schema documentation, bad DX.
- **[LOW]** Not using code-generation (`graphql-codegen`) for TypeScript types → resolvers typed as `any`.

---

## Code Quality

- **[HIGH]** `any` type on resolver `context` or `parent` → no type safety.
- **[HIGH]** Missing `__resolveType` on union/interface → Apollo can't distinguish members.
- **[MEDIUM]** Resolver returning `undefined` for nullable field → client gets `null` unexpectedly.
- **[MEDIUM]** `async` resolver not returning Promise → Apollo silently resolves, async work never awaited.
- **[MEDIUM]** Mutations not following `input` type convention → inline args instead of typed `input` object.
- **[MEDIUM]** Error handling inconsistent — some resolvers throw, others return `null` → client can't distinguish.
- **[LOW]** Not using `graphql-scalars` for common scalars (DateTime, URL, Email) → custom validator reinvented.
- **[LOW]** Schema not validated with `graphql-inspector` → breaking changes undetected.

---

## Common Bugs & Pitfalls

- **[HIGH]** `DataLoader` key type mismatch (string vs number) → batching function receives mixed types, wrong results.
- **[HIGH]** Subscription not cleaned up on client disconnect → resource leak (DB connection, event listener).
- **[HIGH]** Resolver error not wrapped in `GraphQLError` → error format inconsistent, stack trace leaked.
- **[MEDIUM]** `context` mutated inside resolver → shared between parallel field resolvers, race condition.
- **[MEDIUM]** DataLoader `batchLoadFn` not returning results in same order as keys → wrong data mapped to wrong parents.
- **[MEDIUM]** `@deprecated` directive added but not enforced in CI → clients continue using deprecated fields.
- **[LOW]** Union type `__resolveType` missing → Apollo returns null for union field.
- **[LOW]** `null` vs empty array not distinguished in list fields → client gets wrong "no results" state.
