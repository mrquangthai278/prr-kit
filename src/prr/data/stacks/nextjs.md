# Next.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `next.config.*`, `pages/` or `app/` directory, `getServerSideProps`, `getStaticProps`, `from 'next'`, `next/router`, `next/navigation`, `Server Components`, `Server Actions`, `use client`, `use server`

---

## Security

- **[CRITICAL]** Server-side secrets (API keys, DB URLs) accessed in Client Components → exposed in JS bundle. Only use in Server Components, Route Handlers, or Server Actions.
- **[CRITICAL]** `dangerouslySetInnerHTML` with user content → XSS.
- **[CRITICAL]** Server Action missing authorization check → any authenticated (or unauthenticated) user can invoke with arbitrary data.
- **[HIGH]** Missing authentication check in Route Handler / API route (`pages/api/`) → unprotected endpoint.
- **[HIGH]** `NEXT_PUBLIC_` prefix on sensitive env vars → exposed to browser. Only prefix truly public values.
- **[HIGH]** Redirect URL from query param (`?next=/`) without allowlist validation → open redirect.
- **[HIGH]** `cookies()` session data used without CSRF protection on mutating Server Actions.
- **[HIGH]** Server Action accepting file uploads without size/MIME validation → arbitrary file upload.
- **[HIGH]** IDOR in Server Action / Route Handler — accessing resource by ID without ownership verification.
- **[HIGH]** `process.env.SECRET` accessed in component that has both server and client rendering paths.
- **[MEDIUM]** Missing `Content-Security-Policy` header in `next.config.js`.
- **[MEDIUM]** `cookies()` / `headers()` data from Server Component passed as prop to Client Component → visible in RSC payload over network.
- **[MEDIUM]** `revalidatePath('/')` after sensitive mutation invalidating too broadly → cached sensitive data regenerated.
- **[LOW]** `rel="noopener noreferrer"` missing on external `target="_blank"` links.

---

## Performance

- **[HIGH]** `getServerSideProps` used when `getStaticProps` + ISR would suffice → every request hits server, higher TTFB.
- **[HIGH]** Large Client Component importing heavy libraries that could stay server-side → increases client bundle.
- **[HIGH]** Missing `next/image` for images → no optimization, LCP degraded.
- **[HIGH]** `'use client'` on root layout/page → entire subtree is client-side, kills Server Component benefits.
- **[HIGH]** Fetching same data in multiple Server Components without `cache()` / `fetch` deduplication → redundant DB calls per request.
- **[HIGH]** Not using Partial Prerendering (PPR) or `<Suspense>` for dynamic sections → entire page deferred.
- **[HIGH]** `app/` route fetching in `useEffect` instead of Server Component → client-side waterfall.
- **[MEDIUM]** Missing `loading.tsx` / `<Suspense>` for async Server Components → no streaming, all-or-nothing loading.
- **[MEDIUM]** `fetch` with `cache: 'no-store'` when data could be cached → bypasses Next.js data cache.
- **[MEDIUM]** Missing `next/font` for custom fonts → layout shift (CLS), FOUT.
- **[MEDIUM]** `generateStaticParams` not used for dynamic routes with known values → falls back to SSR.
- **[MEDIUM]** Multiple unrelated `fetch` calls not parallelized via `Promise.all()` in Server Component → sequential.
- **[LOW]** `next/dynamic` with `ssr: false` not used for browser-only components (charts, maps) → SSR error.
- **[LOW]** Not using `unstable_cache` for non-fetch data sources (DB queries) in Server Components.

---

## Architecture

- **[HIGH]** Mixing server-only and client-only logic in same component → use `server-only` / `client-only` packages.
- **[HIGH]** Data fetching in Client Component when Server Component could fetch directly → unnecessary client-server round trip.
- **[HIGH]** Server Action doing multiple mutations without transaction → partial failure leaves inconsistent state.
- **[HIGH]** Not using Route Handlers for external webhook endpoints → Server Actions not suitable for non-browser callers.
- **[MEDIUM]** Deeply nested `params`/`searchParams` drilling instead of `useSearchParams()` or server-side access.
- **[MEDIUM]** `pages/api/` routes used in App Router project → migrate to Route Handlers (`app/api/route.ts`).
- **[MEDIUM]** `useRouter().push()` for external URLs → use `window.location.href` or `<a href>`.
- **[MEDIUM]** `layout.tsx` fetching per-request data → layouts are cached, use `page.tsx` for dynamic data.
- **[MEDIUM]** Not using `@` path alias configured in `tsconfig.json` → deep relative imports `../../../../`.
- **[LOW]** Missing `error.tsx` boundary for error handling in App Router segments.
- **[LOW]** `_app.tsx` still present in App Router project → dead file causing confusion.

---

## Code Quality

- **[HIGH]** `'use client'` on file that only uses server features → unnecessary client bundle.
- **[HIGH]** Missing `generateMetadata` or `export const metadata` on public pages → poor SEO.
- **[HIGH]** `notFound()` / `redirect()` called inside `try/catch` → these throw internally, catch swallows them.
- **[MEDIUM]** `useEffect` logic that could be in Server Component → unnecessary client-side complexity.
- **[MEDIUM]** `router.push` vs `router.replace` not chosen semantically (replace for login redirect).
- **[MEDIUM]** `searchParams` not typed correctly in Next.js 15+ (async) → `Promise<{ [key: string]: string }>`.
- **[MEDIUM]** Not using `next-safe-action` or similar for type-safe Server Actions.
- **[LOW]** Missing `not-found.tsx` for custom 404 pages.
- **[LOW]** Image `alt` prop missing on `next/image` → accessibility violation.

---

## Common Bugs & Pitfalls

- **[HIGH]** `cookies()` / `headers()` called in static context (outside request) → throws at build time.
- **[HIGH]** Async Server Component not awaited in parent → renders as Promise object.
- **[HIGH]** Server Action called from `useEffect` → Server Actions are for user interactions/forms, not effects.
- **[HIGH]** `revalidatePath()` / `revalidateTag()` not called after mutation → stale data served indefinitely.
- **[HIGH]** Middleware `matcher` too broad → auth middleware running on static assets → performance hit.
- **[MEDIUM]** `searchParams` in Server Component not typed as `Promise<>` in Next.js 15+ → breaking change.
- **[MEDIUM]** `Link` with `href` hash to same page causing full navigation → use `useRouter` scroll behavior.
- **[MEDIUM]** `params` destructured from `props` synchronously in Next.js 15+ → must be awaited.
- **[MEDIUM]** Data fetched in `layout.tsx` not available to nested pages without prop drilling or fetch deduplication.
- **[LOW]** `next/head` used in App Router → use `metadata` export instead.
- **[LOW]** Environment variable undefined in Edge Runtime (not all Node.js APIs available).
