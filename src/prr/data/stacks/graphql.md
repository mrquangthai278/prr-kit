# GraphQL — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.graphql` / `*.gql` files, `gql\`\``, `GraphQLSchema`, `typeDefs`, `resolvers`, `ApolloServer`, `graphql-yoga`

---

## Security

- **[CRITICAL]** Missing authorization in resolver → any authenticated user can query any field/mutation. Check permissions per-field or per-resolver, not just at route level.
- **[CRITICAL]** Introspection enabled in production → attackers can discover full schema. Disable with `introspection: false` in production.
- **[HIGH]** Missing query depth limiting → deeply nested query causes exponential DB queries (DoS). Use `graphql-depth-limit`.
- **[HIGH]** Missing query complexity limiting → single query requesting thousands of nodes. Use `graphql-query-complexity`.
- **[HIGH]** User-controlled field names in resolver (dynamic field selection from input) → potential injection or over-fetching.
- **[MEDIUM]** GraphQL errors leaking stack traces or internal details → configure custom error formatter.
- **[MEDIUM]** Missing rate limiting at GraphQL endpoint level → high-complexity queries bypass REST-level rate limits.

---

## Performance

- **[CRITICAL]** N+1 in resolver — querying DB for each parent node's children individually. Use DataLoader (batching + caching per request).
- **[HIGH]** Resolving fields not requested in query — resolver always fetches all related data regardless of selection set.
- **[HIGH]** No persisted queries in production → clients send full query string on every request, larger payloads.
- **[MEDIUM]** Missing `@cacheControl` directives on cacheable fields → CDN cannot cache GraphQL responses.
- **[MEDIUM]** Over-fetching in resolvers — fetching entire DB record when query only needs 2 fields.
- **[LOW]** Not using `context.dataloaders` pattern → DataLoader instances not shared across resolvers in same request.

---

## Architecture

- **[HIGH]** Business logic in resolver functions → move to service/domain layer. Resolvers should only orchestrate.
- **[HIGH]** Schema-first vs code-first inconsistency within same project → pick one approach.
- **[MEDIUM]** Mutations not returning affected type → client must refetch to update cache. Always return mutated object.
- **[MEDIUM]** Missing input validation on mutation arguments → invalid data reaches business logic.
- **[MEDIUM]** Overloaded Query type with dozens of top-level fields → organize with namespaced types or separate schemas.
- **[LOW]** Missing `description` on types and fields → poor schema documentation, bad developer experience.

---

## Common Bugs & Pitfalls

- **[HIGH]** Resolver returning `undefined` for nullable field → client receives `null` unexpectedly even if data exists.
- **[HIGH]** `async` resolver not returning Promise → Apollo silently treats synchronous return as resolved value, async work never awaited.
- **[MEDIUM]** DataLoader key type mismatch (string vs number) → batching function receives mixed keys, unexpected behavior.
- **[MEDIUM]** Subscription not cleaning up on unsubscribe → resource leak (DB connections, event listeners).
- **[LOW]** Union type resolver `__resolveType` missing → Apollo cannot distinguish union members.
