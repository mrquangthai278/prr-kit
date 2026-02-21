# Next.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `next.config.*`, `pages/` or `app/` directory, `getServerSideProps`, `getStaticProps`, `from 'next'`, `next/router`, `next/navigation`

---

## Security

- **[CRITICAL]** Server-side secrets (API keys, DB URLs) accessed in client components → exposed in JS bundle. Only use in Server Components, `getServerSideProps`, Route Handlers, or Server Actions.
- **[CRITICAL]** `dangerouslySetInnerHTML` with user content in any component → XSS.
- **[HIGH]** Missing authentication check in Route Handler / API route (`pages/api/`) → unprotected endpoint.
- **[HIGH]** `NEXT_PUBLIC_` prefix on sensitive env vars → exposed to browser. Only prefix truly public values.
- **[HIGH]** Server Actions missing authorization check → any authenticated user can invoke any action.
- **[HIGH]** Redirect URL from query param without validation → open redirect. Validate against allowlist.
- **[MEDIUM]** Missing `Content-Security-Policy` header in `next.config.js` headers config.
- **[MEDIUM]** `cookies()` / `headers()` data from Server Component passed as props to Client Component → serialized, visible in RSC payload.

---

## Performance

- **[HIGH]** `getServerSideProps` used when `getStaticProps` + ISR would suffice → every request hits server, higher TTFB.
- **[HIGH]** Large Client Component importing heavy libraries that could stay server-side → increases client bundle.
- **[HIGH]** Missing `next/image` for images → no automatic optimization, large payload.
- **[HIGH]** Client Component tree starting too high → wrapping entire layout in `'use client'` negates Server Component benefits.
- **[MEDIUM]** Missing `loading.tsx` / `Suspense` boundaries for async Server Components → no streaming, waterfall loading.
- **[MEDIUM]** `fetch` without caching strategy in Server Component (`cache: 'no-store'`) when data could be cached.
- **[MEDIUM]** Missing `next/font` for custom fonts → layout shift (CLS), FOUT.
- **[LOW]** Not using `next/dynamic` with `ssr: false` for browser-only components (charts, maps) → SSR errors.

---

## Architecture

- **[HIGH]** Mixing server-only and client-only logic in same component → use `server-only` / `client-only` packages to enforce boundaries.
- **[HIGH]** Data fetching in Client Component when Server Component could fetch directly → extra client-server round trip.
- **[MEDIUM]** Deeply nested `params` / `searchParams` drilling instead of using `useSearchParams()` or server-side access.
- **[MEDIUM]** API routes (`pages/api/`) used as BFF in App Router project → migrate to Route Handlers (`app/api/`).
- **[MEDIUM]** `useRouter().push()` for external URLs → use `window.location` or `<a href>` for external navigation.
- **[LOW]** Missing `error.tsx` boundary for error handling in App Router segments.
- **[LOW]** `layout.tsx` fetching data that changes per request without proper caching → layout re-renders more than needed.

---

## Code Quality

- **[HIGH]** `'use client'` at top of file that only uses server features → unnecessary client bundle increase.
- **[MEDIUM]** `useEffect` used in Server Component (impossible) → common mistake when migrating from Pages Router.
- **[MEDIUM]** `router.push` called without `await` in async context → navigation timing issues.
- **[LOW]** Missing `generateMetadata` or `export const metadata` on public pages → poor SEO.
- **[LOW]** `_app.tsx` still used in App Router project → dead file causing confusion.

---

## Common Bugs & Pitfalls

- **[HIGH]** `cookies()` / `headers()` called outside of request scope (in static context) → throws at build time.
- **[HIGH]** Async Server Component not awaited in parent → renders as Promise object.
- **[MEDIUM]** `searchParams` in Server Component not typed as `Promise<>` in Next.js 15+ → breaking change.
- **[MEDIUM]** Mutation (form submit) without revalidating cache → stale data after action.
- **[MEDIUM]** `Link` component `href` with hash (`#section`) navigating to different page → scroll behavior unexpected.
- **[LOW]** Missing `rel="noopener noreferrer"` on external links opened with `target="_blank"`.
