# Vite — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `vite.config.*`, `from 'vite'`, `import.meta.env`, `import.meta.hot`, `defineConfig` from vite

---

## Security
- **[CRITICAL]** Any variable prefixed with `VITE_` is automatically embedded in the client bundle → ALL such values are publicly visible. Never store API keys, secrets, or credentials in `VITE_` variables; use server-side env vars for secrets.
- **[CRITICAL]** `import.meta.env.VITE_API_KEY` used as an authentication secret → secret exposed to every browser visitor. Move secret usage to a backend proxy; expose only a public endpoint URL to the client.
- **[HIGH]** `define` plugin option replacing `process.env.SECRET` in the bundle → inlined plaintext secret shipped to clients. Remove secret values from `define`; use runtime server-side configuration instead.
- **[HIGH]** `server.fs.allow` set to `/` or overly broad path → dev server can serve any file on the system including `/etc/passwd`. Restrict `fs.allow` to the project root or specific necessary directories.
- **[MEDIUM]** No Content Security Policy configured for the production build → XSS attacks not mitigated by browser. Add CSP headers via the hosting layer or a Vite plugin (e.g. `vite-plugin-csp`).

---

## Performance
- **[HIGH]** `build.rollupOptions.output.manualChunks` not configured for large applications → single monolithic bundle with poor cache efficiency. Define `manualChunks` to separate vendor, framework, and feature code into cacheable chunks.
- **[HIGH]** Dynamic `import()` not used for route-level or feature-level code splitting → entire app JS loaded on first page visit. Wrap route components and large features in `import('...')` for lazy loading.
- **[HIGH]** Loading entire utility libraries (lodash, moment) without tree-shaking → dead code bloat. Import named exports from tree-shakeable equivalents (`lodash-es`, `date-fns`) or use specific subpath imports.
- **[MEDIUM]** `build.sourcemap: true` in production config → large `.map` files deployed alongside bundles. Set `sourcemap: false` or `sourcemap: 'hidden'` for production to avoid exposing source to users.
- **[MEDIUM]** No compression plugin configured → uncompressed JS/CSS served, missing 60-80% size reduction. Add `vite-plugin-compression` for gzip/brotli output or configure compression at the CDN/server layer.
- **[LOW]** `optimizeDeps.exclude` incorrectly listing packages that should be pre-bundled → slow dev server cold starts and waterfall module requests. Only exclude packages that are truly incompatible with pre-bundling (e.g. those using `require.resolve`).

---

## Architecture
- **[HIGH]** Plugins not ordered correctly in the `plugins` array → transform conflicts (e.g. TypeScript plugin must run before framework plugin). Review each plugin's documented order requirement; check plugin `enforce: 'pre'/'post'` settings.
- **[HIGH]** `resolve.alias` overriding paths inside `node_modules` → breaks the package's own internal imports and causes hard-to-debug resolution errors. Only alias your own source paths (e.g. `@/` → `src/`); never alias into `node_modules`.
- **[MEDIUM]** Single `vite.config.ts` handling all environments without using the `mode` parameter → environment-specific config mixed together, risk of dev-only settings leaking to production. Use `mode` to conditionally apply plugins: `if (mode === 'production') { ... }`.
- **[MEDIUM]** Dev-only plugins (e.g. mock server, inspector) not guarded with `apply: 'serve'` → dev tooling included in production build. Add `apply: 'serve'` to all development-only plugins.

---

## Code Quality
- **[MEDIUM]** Missing `/// <reference types="vite/client" />` in `vite-env.d.ts` → `import.meta.env`, `import.meta.hot`, and asset imports are untyped. Add the triple-slash reference to enable Vite's built-in type definitions.
- **[MEDIUM]** `import.meta.glob()` used without explicit typing → returned module map is `Record<string, unknown>`. Type the glob call: `import.meta.glob<{ default: Component }>('./routes/*.tsx')`.
- **[MEDIUM]** HMR custom handlers (`import.meta.hot.accept(...)`) written without checking `import.meta.hot` guard → fails in production build where HMR is stripped. Always guard: `if (import.meta.hot) { import.meta.hot.accept(...) }`.
- **[LOW]** `defineConfig` used without TypeScript, relying on plain JS config without type checking → mistyped config options silently ignored. Rename config to `vite.config.ts` and use TypeScript for type-checked configuration.

---

## Common Bugs & Pitfalls
- **[HIGH]** `process.env.VAR` used in client code (React/Vue habit from CRA/webpack) → `process` is undefined in Vite's browser environment; build fails or returns `undefined`. Replace all client-side `process.env` references with `import.meta.env.VITE_VAR`.
- **[HIGH]** SSR build missing `resolve.conditions: ['node']` or `ssr: true` in build options → wrong package entry points resolved, browser bundles used on server. Configure separate SSR build with `build.ssr` and proper resolve conditions.
- **[MEDIUM]** Relative imports breaking after changing the `base` config option → asset URLs and router base paths misalign. Audit all hardcoded `/` paths and use `import.meta.env.BASE_URL` for dynamic base-relative URLs.
- **[MEDIUM]** CSS Modules class name collisions because `generateScopedName` not configured → two modules produce the same hashed class. Configure `css.modules.generateScopedName` with a pattern that includes the filename for uniqueness.
- **[MEDIUM]** Files in `publicDir` served without content hash in filename → CDN or browser caches stale version after update. Files in `publicDir` are never hashed by Vite; use `src/assets/` with `import` for hash-fingerprinted assets.
