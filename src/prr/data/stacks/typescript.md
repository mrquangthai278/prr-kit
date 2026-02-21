# TypeScript — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.ts` / `*.tsx` files, `tsconfig.json`, `typescript` in devDeps

---

## Security

- **[HIGH]** `as any` type assertion on external/user data bypasses all type checking → runtime errors and security holes. Use `unknown` + type narrowing instead.
- **[HIGH]** Missing runtime validation at system boundaries (API responses, user input, env vars) even when TypeScript types are declared — types are erased at runtime.
- **[MEDIUM]** Unsafe type cast `value as SpecificType` without runtime validation → assumption may be wrong at runtime.
- **[MEDIUM]** `@ts-ignore` without explanation → suppressing type errors that may indicate real bugs.

---

## Architecture

- **[HIGH]** `any` type on function parameters, return types, or variables → defeats TypeScript's purpose. Use `unknown` and narrow, or define proper types.
- **[HIGH]** `strict: false` in tsconfig (or missing strict) → implicit `any`, loose null checks. Always enable `"strict": true`.
- **[HIGH]** Non-null assertion `!` without clear justification → potential `null`/`undefined` runtime crash. Add a null guard instead.
- **[MEDIUM]** Missing return type annotation on exported functions → type inferred from implementation, callers cannot rely on stable contract.
- **[MEDIUM]** `interface` vs `type` inconsistency within same codebase → pick one convention for object shapes.
- **[MEDIUM]** Overly broad union type (`string | number | boolean | object | null`) instead of discriminated union → defeats narrowing.
- **[MEDIUM]** Deeply nested generic types (3+ levels) → unreadable, refactor with type aliases.
- **[LOW]** `enum` usage → prefer `const` objects (`as const`) for better tree-shaking and JS interop.
- **[LOW]** Missing `readonly` on arrays/objects that shouldn't be mutated → accidental mutation.

---

## Code Quality

- **[HIGH]** Ignoring TypeScript errors with `// @ts-ignore` or `// @ts-expect-error` without comment explaining why → hidden bugs.
- **[HIGH]** Missing null/undefined checks on values from external sources → `Cannot read properties of undefined` at runtime.
- **[MEDIUM]** `import` instead of `import type` for type-only imports → slightly larger bundles, matters for barrel files.
- **[MEDIUM]** Duplicate type definitions across files instead of shared types module → drift over time.
- **[MEDIUM]** Type assertions in tests (`as any`, `as unknown as T`) masking real type errors.
- **[LOW]** Missing JSDoc on exported public API functions → poor IDE experience for consumers.
- **[LOW]** Large barrel `index.ts` exporting everything → circular dependency risk, slow compilation.

---

## Common Bugs & Pitfalls

- **[HIGH]** Optional chaining `?.` used but result not checked for `undefined` before use → defeats the purpose.
- **[HIGH]** Spreading typed object onto untyped base (`{ ...defaults, ...userInput }`) where `userInput` is `any` → loses type safety.
- **[MEDIUM]** `Object.keys(obj)` returns `string[]` not `(keyof typeof obj)[]` → type-unsafe iteration. Cast with `(Object.keys(obj) as Array<keyof typeof obj>)`.
- **[MEDIUM]** `parseInt` / `parseFloat` return `NaN` not caught → `NaN` propagates silently through arithmetic.
- **[MEDIUM]** Async function in array `.map()` → returns `Promise[]` not resolved values. Use `Promise.all(arr.map(async ...))`.
- **[LOW]** Declaration merging on interfaces used inadvertently → confusing for maintainers.
