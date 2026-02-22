# Remix — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `remix.config.*`, `from '@remix-run/react'`, `from '@remix-run/node'`, `loader`, `action` exports, `app/routes/`

---

## Security
- **[CRITICAL]** `loader` returning sensitive data without authentication check → any user can access protected resources. Add session validation at the top of every `loader` before touching data.
- **[CRITICAL]** SQL injection via unvalidated `params` or `request.formData()` values passed directly to queries → database compromise. Validate and sanitize all input with Zod or similar before use in queries.
- **[CRITICAL]** `dangerouslySetInnerHTML` with user-controlled content → XSS. Replace with safe text rendering; sanitize with DOMPurify if HTML is required.
- **[HIGH]** Missing CSRF protection on `action` mutations → cross-site request forgery. Use `remix-utils` CSRF helpers or validate `Origin`/`Referer` headers in actions.
- **[HIGH]** Session data trusted without server-side re-validation → privilege escalation if session is tampered. Re-fetch user role/permissions from DB in loader rather than trusting session fields.
- **[HIGH]** Environment secrets accessed via `window.ENV` pattern without restricting which vars are exposed → secrets in client bundle. Only inject non-sensitive config to client; keep secrets server-only.

---

## Performance
- **[HIGH]** `loader` returning large JSON payloads not needed by the UI → slow TTFB and large JS hydration cost. Select only fields consumed by the route component; use projection queries.
- **[HIGH]** Missing HTTP caching headers (`Cache-Control`) in `loader` responses → every request hits the server. Return `headers` with appropriate `Cache-Control` from loaders for cacheable data.
- **[HIGH]** N+1 queries in nested route loaders each hitting the DB independently → multiplicative query count. Use `Promise.all` for parallel queries or a DataLoader/batching layer.
- **[MEDIUM]** Sequential `loader` + `useFetcher` calls creating client-side waterfall → delayed content display. Move secondary data into the route `loader` or use parallel `Promise.all` fetches.
- **[MEDIUM]** Non-critical data not using `defer()` + `<Await>` → page blocked on slow data before render. Wrap slow, non-essential fetches in `defer()` and render with `<Suspense>`/`<Await>`.

---

## Architecture
- **[HIGH]** Business logic (validation, DB calls, external API) written directly inside `loader`/`action` → untestable, bloated route files. Extract to a service/model layer and call from loaders/actions.
- **[HIGH]** Client-side `fetch` calls for data that should come through `loader` → bypasses Remix data flow, breaks SSR. Move all initial data fetching into `loader`; use `useFetcher` only for non-navigating updates.
- **[HIGH]** Missing `ErrorBoundary` export on routes → unhandled loader/action errors bubble to root with no context. Export an `ErrorBoundary` component from every route that fetches data.
- **[MEDIUM]** Not using Remix nested routing for shared UI (nav, sidebar) → duplicated layout markup across routes. Leverage parent route layouts with `<Outlet>` to share chrome and loaders.
- **[MEDIUM]** Overusing `clientLoader` when a server `loader` suffices → unnecessary client JS and loss of server caching. Reserve `clientLoader` for browser-only data (localStorage, IndexedDB).

---

## Code Quality
- **[HIGH]** Missing `LoaderFunctionArgs`/`ActionFunctionArgs` types → untyped `request` and `params`, runtime surprises. Type every `loader` and `action` with the appropriate Remix args type.
- **[HIGH]** `action` without input schema validation (e.g. Zod) → invalid data silently processed. Parse `formData` through a Zod schema and return field errors on failure.
- **[MEDIUM]** `useFetcher` not used for non-navigating mutations (e.g. like button) → full navigation triggered on submit. Use `fetcher.Form` or `fetcher.submit` for in-place mutations.
- **[MEDIUM]** Inline `fetch` inside React component for data available in `loader` → duplicate request, hydration mismatch. Use `useLoaderData()` to consume data already fetched server-side.
- **[MEDIUM]** Not using `json()` helper for loader responses → missing default `Content-Type` and status code control. Wrap all loader return values with the `json()` helper from `@remix-run/node`.
- **[LOW]** Route files exceeding 300 lines with mixed concerns → hard to review and maintain. Split into co-located component, loader, action, and service files.

---

## Common Bugs & Pitfalls
- **[HIGH]** `useLoaderData()` called outside its route module (e.g. in a child component) → returns `undefined` or wrong route's data. Pass data as props or use `useRouteLoaderData(routeId)` for ancestor data.
- **[HIGH]** Cookies not set with `httpOnly` and `secure` flags → session cookies accessible via JS and sent over HTTP. Always create cookies with `{ httpOnly: true, secure: process.env.NODE_ENV === 'production' }`.
- **[HIGH]** `defer` data error state not handled inside `<Await>` `errorElement` prop → unhandled promise rejection in UI. Always provide `errorElement` to every `<Await>` wrapping deferred data.
- **[MEDIUM]** `action` returning a redirect without `303` status code → browser may cache the redirect or re-POST on back. Use `redirect(url, { status: 303 })` after successful mutations.
- **[MEDIUM]** Using `<form>` (native HTML) instead of Remix `<Form>` → loses progressive enhancement, pending state, and revalidation. Use Remix `<Form>` for all route-level form submissions.
