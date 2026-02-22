# Sass/SCSS — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.scss`, `*.sass`, `from 'sass'`, `$variable`, `@mixin`, `@include`, `@extend`, `@use`, `@forward`

---

## Security
- **[HIGH]** User-controlled values interpolated into `url()` via `#{}` in Sass → path traversal or injection in the compiled CSS `url()` function. Never interpolate unvalidated user input into `url()` calls; use only static or config-defined paths.
- **[MEDIUM]** Server-rendered Sass variables populated from user input before compilation → CSS injection allowing layout manipulation or data exfiltration via CSS. Treat Sass compilation as server-side code; never pass user input into the Sass variable pipeline.
- **[MEDIUM]** Sensitive asset paths exposed in Sass `@import` or `@use` error messages in development → internal directory structure revealed in browser console or build output. Suppress detailed Sass error output in production builds.
- **[LOW]** `@import` of external Sass files from user-configurable URLs → arbitrary remote Sass executed during build. Restrict `@import`/`@use` to local paths only; validate any configurable paths.

---

## Performance
- **[HIGH]** Nesting depth exceeding 4 levels → over-specific CSS selectors in output, large stylesheet, and slow browser style recalculation. Limit nesting to 3 levels maximum; use BEM or component-scoped class names to avoid deep nesting.
- **[HIGH]** `@extend` used with widely-used class selectors (not placeholders) → all matched selectors grouped in the output CSS, causing unintended selector combinations and bloated output. Use `%placeholder` selectors with `@extend`, or prefer `@include` with mixins.
- **[MEDIUM]** `@import` used instead of `@use`/`@forward` → `@import` causes all variables, mixins, and functions to be re-evaluated and duplicated in every file that imports them. Migrate to `@use`/`@forward` to deduplicate compiled output.
- **[MEDIUM]** `background-image: url("#{$var}")` in frequently rendered components → prevents CSS-level optimization and HTTP/2 push hints. Use static `url()` values in Sass and inject dynamic values via CSS custom properties at runtime.
- **[LOW]** `outputStyle: 'compressed'` not enabled in production Sass compilation → unminified CSS increases file size and parse time. Set `style: 'compressed'` in the Sass compiler options for production builds.
- **[LOW]** Unused Sass variables and mixins not removed → dead code inflates the source, and some Sass configurations may include them in output. Audit and prune unused abstractions.

---

## Architecture
- **[HIGH]** `@import` used in a modern Sass codebase instead of `@use`/`@forward` → global namespace pollution where all variables/mixins are available everywhere, `@import` is deprecated and will be removed. Replace all `@import` with `@use 'module'` and expose public APIs via `@forward`.
- **[HIGH]** Design tokens (colors, spacing, typography) defined in multiple files without a single canonical source → values diverge across files causing visual inconsistency. Define all tokens in one `_tokens.scss` or `_variables.scss` partial and `@forward` it from an index.
- **[MEDIUM]** Presentation mixins mixed with logic helpers (`@if`, `@each`, `@for`) in the same file → hard to locate specific abstractions. Separate utility/logic mixins from visual/component mixins into distinct partials.
- **[MEDIUM]** Partial files not following the `_partial.scss` underscore naming convention → Sass compiler treats them as standalone entry points and compiles them to individual CSS files. Prefix all partials with `_` to signal they are not standalone entry points.
- **[LOW]** No clear decision on when to use mixins vs `%placeholders` vs utility classes → inconsistent approach across the codebase. Document and enforce the team's chosen abstraction strategy.

---

## Code Quality
- **[HIGH]** `!important` used inside mixins or component styles → creates an unresolvable specificity arms race as every override also requires `!important`. Remove `!important` from reusable code; use specificity or cascade order to resolve conflicts.
- **[MEDIUM]** Magic numbers used inline instead of extracted to named variables → values like `24px`, `1.5`, `#3a86ff` appear without explanation and must be updated in multiple places. Extract all repeated or meaningful values to named Sass variables or CSS custom properties.
- **[MEDIUM]** Vendor prefix mixins maintained manually instead of using Autoprefixer → manually added prefixes become outdated and no-ops, while newer prefixes are missed. Remove manual vendor prefixes and integrate Autoprefixer as a PostCSS step.
- **[MEDIUM]** `@extend` used across different partial files → creates brittle coupling where changes to one file's placeholder affect compiled output in unrelated files. Restrict `@extend` to within the same partial; prefer `@include` for cross-file reuse.
- **[LOW]** `@mixin` defined with required arguments not documented with comments → consumers must read implementation to understand usage. Add JSDoc-style comments above each mixin describing parameters, types, and usage.

---

## Common Bugs & Pitfalls
- **[HIGH]** `@use 'module'` statement not placed at the top of the file before any other rules → Sass throws a compile error. `@use` and `@forward` must be the first statements in a file, before any CSS rules, variables, or mixins.
- **[HIGH]** Division using the `/` operator `$value / 2` → Sass treats this as ambiguous CSS division in newer versions and issues a deprecation warning or compiles incorrectly. Replace with `math.div($value, 2)` after `@use 'sass:math'`, or use `calc()` for runtime division.
- **[MEDIUM]** Local variable inside a mixin or block shadowing a module-level variable of the same name → unexpected value used in nested context with no warning. Use the `!global` flag intentionally when writing to module scope, and prefix local variables distinctly.
- **[MEDIUM]** `@mixin` with default argument of `null` used without checking before passing to a CSS property → `property: null` outputs `property: ` which is invalid CSS and may cause parse errors. Guard with `@if $param != null { property: $param; }`.
- **[MEDIUM]** `@each` loop over a map generating utility classes not purged by CSS purge tools → tools like PurgeCSS cannot detect dynamically generated class names. Document generated class patterns or safelist them in the PurgeCSS configuration.
- **[LOW]** Compiled CSS class order differing from expected source order when using `@extend` → `@extend` groups selectors at the location of the placeholder, not the `@extend` call. Understand that `@extend` changes class order in output; use `@include` when cascade order matters.
- **[LOW]** `@use` namespace collision when two modules share the same filename → `@use 'utils/colors'` and `@use 'theme/colors'` both default to `colors.variable`. Use `@use 'path' as alias` to avoid namespace conflicts.
