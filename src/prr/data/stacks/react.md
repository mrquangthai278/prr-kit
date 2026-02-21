# React — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.jsx` / `*.tsx` files, `from 'react'`, `useState`, `useEffect`, JSX syntax, `react` in package.json deps

---

## Security

- **[CRITICAL]** `dangerouslySetInnerHTML` with user-controlled content → XSS. Use text content or a sanitizer (DOMPurify) if HTML rendering is truly needed.
- **[CRITICAL]** `eval()` or `new Function()` called with user input inside component → remote code execution.
- **[HIGH]** `href` set to user-provided URL without validation → `javascript:` protocol XSS. Validate protocol before rendering.
- **[HIGH]** Storing auth tokens, sensitive data in `localStorage` / `sessionStorage` → accessible to any script on the page. Use httpOnly cookies for tokens.
- **[MEDIUM]** Sensitive data logged with `console.log` in dev (often shipped to prod) → info disclosure.
- **[MEDIUM]** Missing sanitization on user input before storing in state that feeds into rendered content.

---

## Performance

- **[CRITICAL]** `useEffect` with no dependency array AND side effects that trigger state → infinite re-render loop.
- **[HIGH]** `useEffect` with object or array literal in deps array (`deps: [{}]`, `deps: [[]]`) → new reference every render → infinite loop.
- **[HIGH]** Missing `React.memo` on expensive pure child components receiving stable props → re-renders on every parent render.
- **[HIGH]** Context provider with large value object created inline → new object reference every render → all consumers re-render.
- **[HIGH]** Event listener / timer / subscription not cleaned up in `useEffect` return → memory leak.
- **[MEDIUM]** Missing `useMemo` for expensive calculations run on every render (sort, filter, transform of large arrays).
- **[MEDIUM]** Missing `useCallback` for handler functions passed as props to memoized children → memo ineffective.
- **[MEDIUM]** Large lists rendered without virtualization (react-window, react-virtual) → DOM overload at 200+ items.
- **[LOW]** Lazy loading not used for heavy route components → large initial bundle.

---

## Architecture

- **[HIGH]** Data fetching directly in component body (not in useEffect or data layer) → side effects in render → bugs.
- **[HIGH]** Custom hooks not prefixed with `use` → React rules-of-hooks linter cannot protect them.
- **[HIGH]** Directly mutating state: `state.items.push(x)` instead of `setState([...state.items, x])` → UI out of sync with state.
- **[HIGH]** Prop drilling >3 levels for shared state → lift to Context or state manager.
- **[MEDIUM]** Multiple `useState` for closely related state → prefer `useReducer` for complex state transitions.
- **[MEDIUM]** Component doing too many things (data fetching + transformation + rendering) → split into container/presentational.
- **[MEDIUM]** `useEffect` used for state derived from other state → `useMemo` or compute inline instead.
- **[LOW]** Global mutable variables (module-scope `let`) shared across component instances → state not isolated per component.

---

## Code Quality

- **[HIGH]** Missing `key` prop in list renders → broken reconciliation, React warning, wrong element reuse.
- **[MEDIUM]** Array index used as `key` → keys unstable on reorder/delete → state/animation bugs.
- **[MEDIUM]** Stale closure in `useEffect` — reading state/props captured at effect creation time instead of current value. Use functional state updates or `useRef`.
- **[MEDIUM]** PropTypes not defined (if not using TypeScript) → no runtime prop validation.
- **[LOW]** Component file exports multiple unrelated components → hard to navigate, import bloat.
- **[LOW]** Default export for components makes refactoring harder → prefer named exports.

---

## Common Bugs & Pitfalls

- **[HIGH]** `async` function passed directly to `useEffect(() => async () => {...})` — effect returns a Promise not a cleanup function. Wrap with inner async IIFE instead.
- **[HIGH]** `setState` called after component unmounts → "Can't perform state update on unmounted component" warning + potential memory leak.
- **[HIGH]** Reading stale ref value inside `useEffect` without including ref in deps.
- **[MEDIUM]** Double-rendering in StrictMode (dev only) breaking non-idempotent effects → effects must be idempotent.
- **[MEDIUM]** `useContext` inside component that doesn't need the full context → unnecessary re-renders on any context change.
- **[LOW]** Missing `displayName` on forwardRef / HOC components → poor DevTools debugging.
