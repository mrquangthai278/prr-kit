# Tailwind CSS — Stack-Specific Review Rules
> Applies to: GR · SR · PR · AR · BR
> Detection signals: `tailwind.config.*`, `@tailwind` directives in CSS, `@apply`, utility class patterns (`flex`, `grid`, `text-`, `bg-`, `p-`, `m-`), `tw` template tag

## Security

- **[HIGH]** `url()` in arbitrary value with user-controlled content: `bg-[url(${userUrl})]` → CSS injection loading external resources. Never interpolate user data into Tailwind classes or CSS `url()`.
- **[MEDIUM]** Missing Content-Security-Policy `style-src` → injected inline styles from XSS not blocked. CSP must cover `style-src 'self'` or nonce-based.
- **[MEDIUM]** Dynamic class construction with user-provided values → classes not in safelist not generated, silent styling failure. Sanitize and allowlist user-provided class values.
- **[LOW]** Tailwind's `theme()` function in CSS exposing design tokens via CSS custom properties → design system values readable by JS. Document intentionally or restrict.