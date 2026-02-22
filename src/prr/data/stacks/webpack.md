# Webpack — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `webpack.config.*`, `from 'webpack'`, `module.exports` with `entry`/`output`, `loader:`, `HtmlWebpackPlugin`

---

## Security
- **[CRITICAL]** `devtool: 'eval'` or `devtool: 'eval-source-map'` used in production build → full source code exposed via `eval()` strings in the bundle. Set `devtool: false` or `devtool: 'source-map'` for production; use `eval` only in development.
- **[CRITICAL]** `require()` called with user-controlled path input → path traversal allowing arbitrary file reads from the server filesystem. Never pass user input to `require()`; use a whitelist map for dynamic module loading.
- **[HIGH]** Secrets inlined via `DefinePlugin` with `process.env.SECRET` → secrets embedded as plaintext in the client bundle. Only inline non-sensitive build-time constants; load secrets at runtime from a server endpoint.
- **[HIGH]** `externals` loading libraries from a CDN without Subresource Integrity (SRI) hashes → CDN compromise injects malicious code. Add SRI `integrity` and `crossorigin` attributes to all CDN `<script>` tags.
- **[MEDIUM]** `devServer.proxy` forwarding requests without stripping or validating auth headers → credentials forwarded to unintended upstream services. Configure proxy to only forward necessary headers; validate target URLs.

---

## Performance
- **[HIGH]** `optimization.splitChunks` not configured → everything bundled into a single file, no cache reuse across deploys. Configure `splitChunks: { chunks: 'all' }` and define `cacheGroups` for vendor separation.
- **[HIGH]** `TerserPlugin` not used in production (`mode: 'production'` does this automatically, but custom configs may omit it) → unminified output, 3-5x larger bundle. Ensure `optimization.minimize: true` with `TerserPlugin` in all production configs.
- **[HIGH]** Tree-shaking disabled because packages not marked `sideEffects: false` in `package.json` → dead code included in bundle. Mark your app's `package.json` with `"sideEffects": false` and use ES module imports.
- **[HIGH]** Entire lodash imported (`import _ from 'lodash'`) instead of tree-shakeable `lodash-es` or per-method imports → ~70KB dead weight. Replace with `import { debounce } from 'lodash-es'` or `import debounce from 'lodash/debounce'`.
- **[MEDIUM]** `babel-loader` without `cacheDirectory: true` → Babel re-transpiles every file on every rebuild. Add `options: { cacheDirectory: true }` to `babel-loader` to persist transpile cache between builds.

---

## Architecture
- **[HIGH]** Single monolithic `webpack.config.js` mixing development and production configuration → dev-only settings risk leaking to production. Split into `webpack.common.js`, `webpack.dev.js`, `webpack.prod.js` and merge with `webpack-merge`.
- **[HIGH]** Circular dependencies between modules not detected → subtle initialization order bugs and failed tree-shaking. Add `circular-dependency-plugin` to the build and fix or document any true circular dependencies.
- **[HIGH]** Hardcoded absolute or relative paths instead of `path.resolve(__dirname, '...')` → config breaks when run from a different working directory. Use `path.resolve(__dirname, 'src')` for all path resolution in config.
- **[MEDIUM]** Loaders and plugins not organized with comments or grouping by concern → config becomes unreadable as it grows. Group by: asset loaders, style loaders, script loaders, optimization plugins, with section comments.
- **[LOW]** Webpack config not committed to version control or `.gitignore`d → team members use different build settings. Commit all config variants; use environment variables only for secrets.

---

## Code Quality
- **[MEDIUM]** Deprecated `require.ensure` used for code splitting instead of dynamic `import()` → `require.ensure` is legacy, not supported in ESM or modern bundlers. Replace with `import('path/to/module').then(...)` for dynamic splitting.
- **[MEDIUM]** Inline loader syntax (`require('style-loader!css-loader!./style.css')`) in source files → couples application code to build tooling. Configure all loaders exclusively in `module.rules`; never use inline loader strings in source.
- **[MEDIUM]** `module.rules` with overly broad `test` regex matching unintended file types → files processed by wrong loader silently. Make `test` patterns precise and add `include`/`exclude` to constrain loader scope.
- **[LOW]** Config lacks comments explaining non-obvious plugin options or loader combinations → next developer cannot understand intent. Add inline comments for any non-default configuration decision.

---

## Common Bugs & Pitfalls
- **[HIGH]** `output.publicPath` misconfigured or missing → asset URLs in the HTML resolve to wrong paths, causing 404s for JS/CSS/images. Set `output.publicPath` to the CDN base URL in production or `'/'` for root-relative serving.
- **[HIGH]** `HotModuleReplacementPlugin` included in the production build (common when config is not split) → HMR runtime added to production bundle, unnecessary code and overhead. Guard `HotModuleReplacementPlugin` with `if (isDev)` or remove from shared/production config.
- **[HIGH]** Loader order reversed in `module.rules` `use` array (webpack processes right-to-left) → CSS not processed correctly, e.g. `css-loader` running before `sass-loader`. Order loaders right-to-left: `['style-loader', 'css-loader', 'sass-loader']`.
- **[MEDIUM]** `resolve.extensions` missing file extensions commonly used in the project → imports without extensions fail or resolve to wrong file. List all used extensions: `resolve: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] }`.
- **[MEDIUM]** CSS ordering non-deterministic when `mini-css-extract-plugin` extracts styles from multiple async chunks → visual inconsistencies across deploys. Set `optimization.moduleIds: 'deterministic'` and review CSS import order for consistency.
