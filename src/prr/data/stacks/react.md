# React — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.jsx` / `*.tsx` files, `from 'react'`, `useState`, `useEffect`, JSX syntax, `react` in package.json deps, `createRoot`, `use client`, `use server`

---

## Security

- **[CRITICAL]** `dangerouslySetInnerHTML` with user-controlled content → XSS. Use text content or DOMPurify if HTML rendering truly needed.
- **[CRITICAL]** `eval()` or `new Function()` called with user input inside component → remote code execution.
- **[CRITICAL]** Server Actions (`'use server'`) not validating/authenticating caller → any client can invoke with arbitrary data.
- **[HIGH]** `href` set to user-provided URL without protocol validation → `javascript:` XSS. Validate with allowlist `['http','https']`.
- **[HIGH]** Storing auth tokens in `localStorage` / `sessionStorage` → accessible to any script on page. Use httpOnly cookies.
- **[HIGH]** Third-party script loaded via `dangerouslySetInnerHTML` script tag → XSS vector outside React's tree.
- **[HIGH]** `window.location.href = userInput` without validation → open redirect / XSS.
- **[HIGH]** React Server Components fetching data with credentials from user-controlled params → IDOR.
- **[MEDIUM]** Sensitive data in component state logged via `console.log` in dev → often shipped to production.
- **[MEDIUM]** Missing sanitization on user input before storing in state that feeds rendered content.
- **[MEDIUM]** `dangerouslySetInnerHTML` used for markdown rendering without a safe library (use `remark`/`rehype` with proper plugins).
- **[MEDIUM]** User-controlled CSS via `style` prop with `content` property → CSS injection.
- **[LOW]** React DevTools exposing component state with sensitive fields in development builds shipped to staging.

---

## Performance

- **[CRITICAL]** `useEffect` with no dependency array AND side effects that trigger state → infinite re-render loop.
- **[HIGH]** `useEffect` with object/array literal in deps (`deps: [{}]`, `deps: [[]]`) → new reference every render → infinite loop.
- **[HIGH]** Missing `React.memo` on expensive pure child components receiving stable props → re-renders on every parent render.
- **[HIGH]** Context provider with large value object created inline (`value={{ a, b, c }}`) → new reference every render → all consumers re-render. Split context or memoize value.
- **[HIGH]** Event listener / timer / subscription / WebSocket not cleaned up in `useEffect` return → memory leak.
- **[HIGH]** Large lists rendered without virtualization (react-window, TanStack Virtual) → DOM overload at 200+ items.
- **[HIGH]** `useMemo`/`useCallback` dependencies including unstable references → memoization always invalidated, overhead with no benefit.
- **[HIGH]** Server Components importing heavy client libraries unnecessarily → increases server bundle.
- **[HIGH]** Missing `Suspense` boundaries → whole tree waits for slowest data fetch; waterfall instead of parallel.
- **[MEDIUM]** Missing `useMemo` for expensive calculations (sort, filter, transform on large arrays) run every render.
- **[MEDIUM]** Missing `useCallback` for handlers passed as props to memoized children → `React.memo` ineffective.
- **[MEDIUM]** `React.lazy` not used for heavy route components → single large initial bundle.
- **[MEDIUM]** Context split not done — single context with frequently-changing + rarely-changing data → all consumers re-render on any change.
- **[MEDIUM]** `useTransition` not used for expensive state updates → UI blocked during transition.
- **[MEDIUM]** Images not using `loading="lazy"` / `next/image` equivalent → blocking initial render.
- **[LOW]** `key` changed unnecessarily on stable list items → forced remount instead of update.
- **[LOW]** `React.StrictMode` disabled in dev to hide bugs → keep it on, fix double-invoke issues instead.
- **[LOW]** `startTransition` wrapping urgent updates → deprioritizes UI that should be immediate.

---

## Architecture

- **[HIGH]** Data fetching directly in component body → side effects in render → bugs and double fetching in StrictMode.
- **[HIGH]** Custom hooks not prefixed with `use` → ESLint rules-of-hooks cannot protect them.
- **[HIGH]** Directly mutating state: `state.items.push(x)` → UI out of sync, React does not detect change.
- **[HIGH]** Prop drilling >3 levels for shared state → lift to Context or state manager.
- **[HIGH]** Business logic mixed into JSX event handlers inline → untestable, bloated render.
- **[HIGH]** `'use client'` on root layout/page → entire subtree opts out of RSC; be precise about boundaries.
- **[HIGH]** Server Component importing client-only libraries (browser APIs) → build error or runtime crash.
- **[HIGH]** Mixing `useState` for server-fetched data with local UI state → use TanStack Query / SWR for server state.
- **[MEDIUM]** Multiple `useState` for closely related state → prefer `useReducer` for complex state transitions.
- **[MEDIUM]** Component doing too many things (fetch + transform + render) → split container/presentational.
- **[MEDIUM]** `useEffect` used for state derived from other state → compute inline or `useMemo`.
- **[MEDIUM]** Context used for high-frequency updates (mouse position, scroll) → kills performance; use Zustand/Jotai.
- **[MEDIUM]** Colocation not followed — component, hook, and test in separate far-away directories → hard to maintain.
- **[MEDIUM]** `forwardRef` not used when parent needs DOM ref access to child → workaround via prop is anti-pattern.
- **[LOW]** Global mutable variables (module-scope `let`) shared across component instances → state not isolated per mount.
- **[LOW]** HOC pattern used where custom hook would be cleaner (React 16.8+).

---

## Code Quality

- **[HIGH]** Missing `key` prop in list renders → broken reconciliation, wrong element reuse.
- **[HIGH]** Array index as `key` in lists that reorder/delete → state/animation bugs.
- **[HIGH]** `async` function passed directly to `useEffect` (`useEffect(async () => {...})`) → returns Promise not cleanup function. Use inner IIFE.
- **[HIGH]** Stale closure in `useEffect` — reading state/props captured at creation time. Use functional state updates or `useRef` for latest value.
- **[HIGH]** Missing `eslint-plugin-react-hooks` → violations not caught.
- **[MEDIUM]** PropTypes not defined (non-TS projects) → no runtime prop validation.
- **[MEDIUM]** `useImperativeHandle` overused → exposing too many internals via refs breaks encapsulation.
- **[MEDIUM]** Component returning `null` for loading state instead of `<Suspense>` → no concurrent rendering benefit.
- **[MEDIUM]** Boolean prop without value: `<Comp flag />` for false intent → always explicit `flag={true}`.
- **[MEDIUM]** Ternary with JSX getting too deep (3+ levels) → extract to named variable or component.
- **[LOW]** `displayName` missing on `forwardRef`/HOC → poor DevTools debugging.
- **[LOW]** Default export for components → harder to refactor/rename; prefer named exports.
- **[LOW]** Fragment shorthand `<>` vs `<Fragment key={...}>` confusion when key needed.

---

## Common Bugs & Pitfalls

- **[CRITICAL]** `useEffect` dependency array missing variables used inside → stale data silently, linter off → add `react-hooks/exhaustive-deps`.
- **[HIGH]** `setState` called after component unmounts → memory leak warning (pre-React 18) / noop (React 18+) but indicates cleanup missing.
- **[HIGH]** `useEffect` cleanup function not returning properly → double subscription on StrictMode double-invoke.
- **[HIGH]** Reading stale ref value inside `useEffect` → ref value at capture time, not current.
- **[HIGH]** `useLayoutEffect` on server → SSR warning; wrap with check or replace with `useEffect`.
- **[HIGH]** `React.use(promise)` called conditionally → violates rules of hooks (React 19).
- **[HIGH]** Optimistic update not rolled back on error → UI shows wrong state permanently.
- **[MEDIUM]** Double-rendering in StrictMode (dev only) breaks non-idempotent effects → effects must be idempotent.
- **[MEDIUM]** `useContext` in component that does not need full context → re-renders on any context change; split context.
- **[MEDIUM]** `key` reset trick used for component reset → intentional but must be documented.
- **[MEDIUM]** `startTransition` callback not synchronous → async inside startTransition does not work.
- **[MEDIUM]** Server Action called inside `useEffect` → should use event handlers or form actions.
- **[MEDIUM]** `useOptimistic` update not matching final server response shape → causes flash.
- **[LOW]** Missing `displayName` on memoized components → `React.memo(Component)` shows as "memo" in DevTools.
- **[LOW]** `children` prop type not using `React.ReactNode` in TypeScript → too narrow or too broad.
