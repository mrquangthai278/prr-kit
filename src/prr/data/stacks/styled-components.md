# Styled Components — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from 'styled-components'`, `styled.div`, `` css` ``, `ThemeProvider`, `createGlobalStyle`, `keyframes`

---

## Security
- **[CRITICAL]** Interpolating user-controlled input directly into a CSS template string `styled.div\`color: ${userInput}\`` → CSS injection, potentially leaking data via `url()` or overriding layout. Sanitize or validate all dynamic CSS values before interpolation.
- **[HIGH]** Dynamic styled component receiving user-controlled style props that map to raw CSS values → style injection allowing arbitrary CSS. Whitelist allowed values and reject freeform strings.
- **[MEDIUM]** `dangerouslySetInnerHTML` used inside a styled component → XSS vector unrelated to CSS but compounded by component complexity. Remove or sanitize HTML before rendering.
- **[MEDIUM]** CSS custom properties (`var(--color)`) bound to values derived from user input in server-rendered HTML → CSS injection via `style` attribute. Encode or restrict user-influenced CSS variable values.
- **[LOW]** External font or image `url()` in global styles loaded from user-configurable CMS fields → unexpected resource loading. Validate URLs against an allowlist before use in CSS.

---

## Performance
- **[HIGH]** Styled component defined inside another component's render function → a new component class and stylesheet entry is generated on every render. Move all `styled.*` definitions to module scope, outside render.
- **[HIGH]** `ThemeProvider` mounted at a granular or frequently re-rendering level → all children re-render when theme reference changes. Place a single `ThemeProvider` at the app root and memoize the theme object.
- **[HIGH]** Complex conditional styles using many props without the `css` helper → styled-components generates a unique class for each prop combination, causing class explosion. Use the `css` helper with conditional logic to minimize class variants.
- **[MEDIUM]** `createGlobalStyle` component instantiated inside a component body → global styles re-injected into the `<head>` on every mount. Render `createGlobalStyle` components once at the app root only.
- **[MEDIUM]** Deeply nested CSS selectors (>3 levels) in styled component templates → high specificity output, larger CSS bundle, harder override. Flatten selector hierarchy or compose via component props.
- **[LOW]** `shouldForwardProp` not configured for custom props → unknown HTML attributes forwarded to the DOM, React warnings in console and potential attribute bloat. Use `.withConfig({ shouldForwardProp })` or prefix custom props with `$`.

---

## Architecture
- **[HIGH]** Business logic or conditional rendering logic embedded inside CSS template literals → logic not testable and duplicated across style and component. Keep templates as pure styling; move logic to component level.
- **[MEDIUM]** Colors, spacing, and typography hardcoded inside styled components instead of consumed from theme → global restyling requires grep-and-replace across all files. Define a design token theme and access via `${({ theme }) => theme.colors.primary}`.
- **[MEDIUM]** No clear boundary between global styles (`createGlobalStyle`) and component-scoped styles → specificity conflicts and unintended style bleed. Reserve global styles for resets and root variables only.
- **[MEDIUM]** Styled components not organized per feature/component → style files scattered without clear ownership. Co-locate `styled.ts` or `styles.ts` alongside each component file.
- **[LOW]** Styled components exported without display names (anonymous) → DevTools and error stack traces show `styled.div` instead of meaningful names. Name styled components explicitly or use the Babel/SWC plugin for automatic display names.

---

## Code Quality
- **[HIGH]** TypeScript `DefaultTheme` interface not augmented → `theme` prop typed as `{}`, no autocomplete or type checking on theme tokens. Augment `DefaultTheme` in a `.d.ts` file with the full theme shape.
- **[MEDIUM]** Custom props on styled components not declared in the TypeScript generic → prop types inferred as `any`, breaking type safety. Pass prop interface as generic: `styled.div<{ $active: boolean }>`.
- **[MEDIUM]** Mixing inline `style` attribute with styled-components on the same element → specificity conflicts and unclear style source of truth. Choose one mechanism; use styled-components props for dynamic values.
- **[MEDIUM]** `attrs` used to set dynamic values that change frequently (e.g., cursor position) → `attrs` values become part of the class hash, generating a new class per value. Use inline `style` for values that change on every frame.
- **[LOW]** `keyframes` animations defined inline within component files rather than in a shared animations module → duplicated keyframe blocks across the bundle. Extract to a shared `animations.ts` and import where needed.

---

## Common Bugs & Pitfalls
- **[HIGH]** Server-side rendered styled-components class names not matching client-side names → React hydration mismatch and style flicker. Install and configure the `babel-plugin-styled-components` or `@swc/plugin-styled-components` and enable `ssr: true`.
- **[HIGH]** `attrs` used to inject dynamic values that change on every interaction → a new class is injected into the stylesheet per unique value, causing stylesheet pollution and memory growth. Use the `style` prop for high-frequency dynamic values.
- **[MEDIUM]** `ref` forwarding broken on a styled component wrapping a custom component → `ref` not passed through to DOM node. Ensure the inner component uses `React.forwardRef`.
- **[MEDIUM]** Component using `theme` values rendered outside a `ThemeProvider` → theme is `undefined`, causing runtime crash or missing styles. Provide a default theme fallback or always wrap the app in `ThemeProvider`.
- **[MEDIUM]** Extending styled components with `styled(ComponentA)` when `ComponentA` does not accept `className` prop → styles silently not applied. Ensure base components accept and apply the `className` prop.
- **[LOW]** CSS specificity conflicts with CSS reset or third-party libraries → styled-components class specificity (single class) loses to multi-selector resets. Increase specificity with `&&` or restructure the reset.
