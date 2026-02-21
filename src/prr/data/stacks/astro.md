# Astro — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.astro` files · `astro.config.*` · `from 'astro'` · `@astrojs/` imports · `Astro.props`

---

## Security

- **[HIGH]** `set:html={userInput}` directive with user-controlled data → XSS. Use `{userInput}` (text interpolation) or sanitize with DOMPurify.
- **[MEDIUM]** `PUBLIC_*` env vars contain secrets → `PUBLIC_` prefix exposes values to the client bundle. Non-public secrets must use server-only access.
- **[MEDIUM]** `Astro.cookies.set()` without `httpOnly: true` and `secure: true` on session cookies → JavaScript-accessible cookies.

---

## Performance

- **[HIGH]** Heavy framework component imported without `client:` directive → component renders as static HTML, JS still shipped to client if component file imports heavy deps. Verify with bundle analyzer.
- **[HIGH]** `client:load` on non-critical interactive components → increases Time-to-Interactive. Prefer `client:idle` (after page load) or `client:visible` (when in viewport).
- **[MEDIUM]** `<img>` used instead of Astro's `<Image>` component for local images → no automatic format conversion (WebP/AVIF), no lazy loading, no dimension optimization.
- **[MEDIUM]** `getStaticPaths` with `paginate()` and no `pageSize` → defaults to 10, may generate excessive static pages or under-paginate.
- **[LOW]** `define:vars={{ largeObject }}` passing large data to client script → serializes entire object inline. Use `data-*` attributes for small values or a separate API endpoint.

---

## Architecture

- **[HIGH]** Mutable state (arrays, objects) declared at Astro component top-level (outside a function) → runs once at build time for SSG, or once per request for SSR, but is shared across renders in the same process. Use server-side state carefully.
- **[MEDIUM]** Framework component (React/Vue/Svelte) used where an Astro component suffices → unnecessary hydration overhead.
- **[MEDIUM]** `Astro.request` / `Astro.cookies` accessed in a `.astro` file without `output: 'server'` or `export const prerender = false` → build error in static mode.
- **[LOW]** Deep island nesting (interactive component inside another `client:*` component) → double hydration, unclear ownership.

---

## Code Quality

- **[MEDIUM]** Framework component imported but no `client:*` directive → renders as static HTML with no interactivity. If interactivity is needed, add `client:load` or appropriate directive.
- **[MEDIUM]** `Astro.props` accessed in a `<script>` tag → props are server-only. Pass values via `data-*` attributes or `define:vars`.
- **[LOW]** `---` frontmatter containing complex business logic → extract to utility functions in `src/lib/` for testability.

---

## Common Bugs & Pitfalls

- **[HIGH]** `Astro.props` destructured incorrectly in `.astro` file: `const { title = 'Default' }` with no TypeScript interface → missing props silently get `undefined`. Define `interface Props` for type safety.
- **[MEDIUM]** `getStaticPaths` returning `params` with non-string values → Astro requires all params to be strings. Use `.toString()` on numeric IDs.
- **[MEDIUM]** Content Collections `getCollection()` called at runtime in SSR without `prerender = false` → hydration mismatch or empty results.
- **[LOW]** Named slots in Astro component used with framework child components → slot forwarding behaves differently than HTML slots.
