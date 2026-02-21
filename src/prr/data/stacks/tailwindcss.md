# Tailwind CSS — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `tailwind.config.*`, `@tailwind` directives in CSS, `@apply`, utility class patterns (`flex`, `grid`, `text-`, `bg-`, `p-`, `m-`)

---

## Performance

- **[HIGH]** `safelist` in `tailwind.config` with overly broad regex patterns → prevents PurgeCSS from removing unused classes, massive CSS bundle.
- **[MEDIUM]** Dynamically constructed class strings: `` `text-${color}-500` `` → Tailwind's JIT/purge cannot detect these classes, they won't be generated. Use full class names or safelist them.
- **[MEDIUM]** Inline `style` overriding Tailwind classes → defeats the purpose of utility-first; use Tailwind variants instead.
- **[LOW]** Importing full Tailwind CSS without content config → all classes included, large bundle.

---

## Architecture

- **[HIGH]** Component-specific one-off utility combinations repeated across many files → extract to a component class with `@apply` or a shared component.
- **[MEDIUM]** `@apply` used for complex multi-class combinations that could be a reusable component → creates hidden coupling between CSS and HTML structure.
- **[MEDIUM]** Conflicting utility classes on same element (`flex` and `block`, `hidden` and `flex`) → only the last one (by CSS specificity/order) wins — likely a bug.
- **[MEDIUM]** Design tokens (colors, spacing) hardcoded as arbitrary values (`bg-[#3b82f6]`, `p-[13px]`) instead of extending the Tailwind theme → inconsistency.
- **[LOW]** Not using `dark:` variant for dark mode when app supports it — inconsistent theming.

---

## Code Quality

- **[MEDIUM]** Class list too long (>15 utility classes on single element) → hard to read. Extract to component or `@apply`.
- **[MEDIUM]** Responsive prefix inconsistency (`md:` in some places, inline style in others for breakpoints).
- **[MEDIUM]** `!important` modifier (`!text-red-500`) overused → specificity war, hard to maintain.
- **[LOW]** Custom CSS that could be replaced with Tailwind utilities → diverges from design system.
- **[LOW]** Missing `prose` class from `@tailwindcss/typography` for rich text content → manual typography styles.

---

## Accessibility

- **[HIGH]** Focus styles removed (`outline-none` without `focus:ring-*`) → keyboard navigation broken. Always pair `outline-none` with visible focus indicator.
- **[MEDIUM]** Low contrast color combinations — check `text-gray-400` on `bg-white` etc. against WCAG AA (4.5:1 ratio).
- **[MEDIUM]** Interactive elements too small — buttons/links with `p-1` or less → touch target below 44x44px WCAG minimum.
