# CSS / SCSS / SASS — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.css`, `*.scss`, `*.sass`, `*.less`, `*.styl` files

---

## Security

- **[HIGH]** `url()` with user-controlled value → CSS injection loading external resources. Never interpolate user data into CSS.
- **[MEDIUM]** `expression()` (IE legacy) in CSS → executes JavaScript. Never use.
- **[MEDIUM]** Missing `Content-Security-Policy: style-src 'self'` allowing inline styles that could be injected.

---

## Performance

- **[HIGH]** Universal selector `*` with expensive properties (`box-shadow`, `transform`) → applied to every element, layout thrash.
- **[HIGH]** `@import` in CSS (not SCSS) → blocking serial HTTP requests. Use `<link>` or bundler imports.
- **[HIGH]** Triggering layout thrash — reading layout properties (`offsetWidth`, `getBoundingClientRect`) then writing in same frame (JS + CSS combo). Use `transform` for animations.
- **[MEDIUM]** Overly specific selectors (`div > ul > li > a.link`) → slow browser matching, hard to override.
- **[MEDIUM]** `position: fixed` elements on scroll-heavy pages without `will-change: transform` → repaints entire page.
- **[MEDIUM]** Animating `width`/`height`/`top`/`left` → triggers layout recalculation. Use `transform: translate()` / `scale()` instead.
- **[LOW]** Large unused CSS from third-party libraries not purged → bundle bloat.

---

## Architecture

- **[HIGH]** Deeply nested SCSS selectors (>4 levels) → high specificity, hard to override, fragile.
- **[MEDIUM]** Color/spacing values duplicated as magic numbers instead of CSS custom properties / SCSS variables.
- **[MEDIUM]** `!important` overuse → specificity war, maintainability nightmare.
- **[MEDIUM]** Class names not following a convention (BEM, utility-first) → inconsistent, hard to predict.
- **[LOW]** Vendor prefixes added manually instead of using Autoprefixer → out-of-date, missing prefixes.
- **[LOW]** SCSS `@extend` used with placeholder selectors — can cause unexpected selector bloat.

---

## Accessibility

- **[HIGH]** `outline: none` / `outline: 0` on focusable elements without alternative focus indicator → keyboard navigation broken (WCAG 2.4.7).
- **[HIGH]** Text contrast below WCAG AA (4.5:1 for normal text, 3:1 for large text).
- **[MEDIUM]** `display: none` used on content that should be accessible to screen readers → use visually-hidden pattern instead.
- **[MEDIUM]** `pointer-events: none` on interactive elements without disabling them in HTML → keyboard still reaches them.
- **[LOW]** `user-select: none` on body/large containers → breaks copy-paste for users.

---

## Common Bugs & Pitfalls

- **[HIGH]** `z-index` wars — arbitrary large values (`z-index: 9999`) without documented stacking context.
- **[MEDIUM]** Margin collapsing not accounted for — `margin-top` on child collapses with parent without overflow/padding/border.
- **[MEDIUM]** `height: 100%` on child without parent having explicit height → renders as 0.
- **[MEDIUM]** Flexbox/Grid item `flex: 1` without `min-width: 0` → overflow issues with long text content.
- **[LOW]** `calc()` with missing spaces around operators (`calc(100%-20px)`) → invalid in some browsers.
