# tRPC — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from '@trpc/server'`, `from '@trpc/client'`, `from '@trpc/react-query'`, `initTRPC`, `router()`, `publicProcedure`, `protectedProcedure`

---

## Security
- **[CRITICAL]** Sensitive operations (user data, admin actions) implemented on `publicProcedure` without any auth middleware → unauthenticated access to protected resources. Create `protectedProcedure` that validates session from context and use it for all authenticated routes.
- **[CRITICAL]** `protectedProcedure` middleware absent → no consistent enforcement of authentication across the router. Define and enforce a middleware chain: `t.middleware(({ ctx, next }) => { if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' }); return next({ ctx }) })`.
- **[HIGH]** Procedure input not validated with a Zod schema → type confusion, prototype pollution, and unexpected data shapes reaching business logic. Always define `.input(z.object({ ... }))` on every procedure that accepts input.
- **[HIGH]** Returning full ORM/DB model objects instead of selecting only needed fields → PII and internal fields (hashed passwords, internal IDs) exposed to clients. Select only required fields in DB queries; use Zod `.pick()` or explicit select projections.
- **[HIGH]** IDOR via ID passed in input without ownership verification → user A reads or mutates user B's data. After fetching by input ID, assert `record.userId === ctx.user.id` before returning or modifying.
- **[MEDIUM]** Internal error details (stack traces, DB error messages) leaking to client in production → reconnaissance information for attackers. Configure `errorFormatter` to strip internal details in production: return only `code` and a safe `message`.

---

## Performance
- **[HIGH]** N+1 query pattern in query handlers — fetching a list then querying per-item in a loop → multiplicative DB round trips. Batch with a single query using `WHERE id IN (...)` or use a DataLoader instance per request.
- **[HIGH]** DataLoader pattern not used for cross-procedure data sharing → repeated identical queries across procedures in a single request. Attach per-request DataLoader instances to context and use them in all procedures.
- **[HIGH]** tRPC subscriptions not cleaned up when the client disconnects → server-side resource leak (DB connections, event emitter listeners). Use the `on` cleanup return in `observable` to tear down resources when the subscription ends.
- **[MEDIUM]** `useQuery` called without configuring `staleTime` or `gcTime` → refetches on every component mount and window focus. Set appropriate `staleTime` per query based on data freshness requirements.
- **[MEDIUM]** Large objects serialized over the wire without selecting specific fields → high bandwidth usage and slow serialization. Define output schemas with `.output(z.object({ ... }))` to enforce response shape and size.

---

## Architecture
- **[HIGH]** Business logic (complex validation, external API calls, DB operations) written directly inside procedure handlers → untestable handlers, fat router files. Extract to a service layer; procedures should only orchestrate: validate input → call service → return result.
- **[HIGH]** `t.createCallerFactory` not used for server-to-server calls; instead procedures called by importing handler functions directly → context middleware (auth, logging) is bypassed. Use `createCallerFactory` to call procedures server-side so middleware runs correctly.
- **[MEDIUM]** Context not used to inject shared services (DB client, logger, auth) → services instantiated inside procedures, no request-scoped sharing. Attach all shared services to the tRPC context in `createContext` and consume via `ctx`.
- **[MEDIUM]** Deeply nested routers without a clear domain boundary grouping → hard to navigate, hard to apply middleware selectively. Group by domain (e.g. `userRouter`, `postRouter`) with one file per domain; merge in a root `appRouter`.
- **[MEDIUM]** Missing `errorFormatter` in `initTRPC` configuration → default error shape varies between tRPC versions and client expectations. Define a consistent `errorFormatter` that maps `TRPCError` to a stable client-facing structure.

---

## Code Quality
- **[MEDIUM]** Procedure responses not validated with `.output()` schema → clients receive untyped `unknown` responses; breaking changes in DB schema silently alter API shape. Add `.output(z.object({ ... }))` to critical procedures to enforce response contracts.
- **[MEDIUM]** Procedures scattered across many files without a consistent co-location strategy → hard to find and review related functionality. Co-locate each router with its domain: `src/server/routers/user.ts` contains all user-related procedures.
- **[HIGH]** `query` procedure used for operations with side effects (sending email, writing DB) → GET requests cached by browser/CDN, side effect may not run on repeat navigations. Always use `mutation` for any operation that changes state.
- **[LOW]** Procedures not annotated with a `meta` description → generated OpenAPI docs (if used) are empty; hard to discover API surface. Add `meta: { openapi: { method: 'GET', path: '/resource', description: '...' } }` or use `procedure.meta({ description: '...' })`.

---

## Common Bugs & Pitfalls
- **[HIGH]** `useQuery` without `error` state handled in the UI → unhandled errors are silently swallowed; user sees blank/stale UI with no feedback. Always destructure and render `error` from every `useQuery` call.
- **[HIGH]** `ctx.user` typed as `any` because context type not properly inferred → type safety of `protectedProcedure` is illusory. Ensure `createContext` return type is explicit and flows into the `initTRPC` generic: `initTRPC.context<Context>().create()`.
- **[HIGH]** Infinite queries not using cursor-based pagination → offset pagination breaks on concurrent inserts/deletes. Use `z.object({ cursor: z.string().optional() })` input and return `{ items, nextCursor }` for `useInfiniteQuery`.
- **[HIGH]** `useMutation`'s `onSuccess` not calling `utils.queryName.invalidate()` → related `useQuery` data stays stale after mutation. Add cache invalidation in `onSuccess`: `await utils.posts.list.invalidate()`.
- **[HIGH]** `superjson` transformer not configured on both the tRPC client and server → `Date` objects serialized as strings on server are not deserialized back to `Date` on client; type mismatch. Add `transformer: superjson` to both `initTRPC.create()` and `createTRPCProxyClient()`.
