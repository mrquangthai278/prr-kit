# TypeScript — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.ts` / `*.tsx` files, `tsconfig.json`, `typescript` in devDeps, `strict: true`, type imports

---

## Security

- **[HIGH]** `as any` on external/user data bypasses all type checking → runtime errors and security holes. Use `unknown` + type narrowing.
- **[HIGH]** Missing runtime validation at system boundaries (API responses, user input, env vars) — types are erased at runtime; use Zod/Valibot/ArkType.
- **[HIGH]** Prototype pollution via `Object.assign({}, userInput)` with no type guard → attacker can set `__proto__`.
- **[MEDIUM]** `@ts-ignore` without explanation → suppressing errors that may indicate real bugs.
- **[MEDIUM]** Unsafe type cast `value as SpecificType` without runtime validation → assumption may be wrong at runtime.
- **[MEDIUM]** `JSON.parse(userInput)` typed with `as MyType` without validation → type lie, runtime mismatch.
- **[LOW]** `any` return from `JSON.parse()` propagating through typed interfaces without guard.

---

## Performance

- **[HIGH]** Massive barrel files (`index.ts` re-exporting hundreds of items) → slow TypeScript compilation and IDE.
- **[HIGH]** Deeply nested conditional types → exponential type-checking time; simplify with mapped types.
- **[MEDIUM]** `const enum` used in declaration files / across module boundaries → erasure issues with bundlers.
- **[MEDIUM]** Type assertions `as` in hot paths creating false sense of safety and potential misuse.
- **[LOW]** Project references not configured for monorepo → single tsconfig compiling everything slowly.
- **[LOW]** `tsc --noEmit` not run in CI → type errors only caught on build.

---

## Architecture

- **[HIGH]** `any` type on function parameters, return types, or variables → defeats TypeScript's purpose. Use `unknown` + narrow.
- **[HIGH]** `strict: false` in tsconfig → implicit `any`, loose null checks. Always enable `"strict": true`.
- **[HIGH]** Non-null assertion `!` without justification → potential `null`/`undefined` runtime crash.
- **[HIGH]** Types defined as `interface` with implementation knowledge leaked into them → couple type to impl.
- **[HIGH]** `any` used in generics `<T = any>` → generic provides no type safety.
- **[HIGH]** Discriminated union missing exhaustive check → new variant added later silently falls through.
- **[MEDIUM]** Missing return type annotation on exported functions → API contract not enforced.
- **[MEDIUM]** `interface` vs `type` inconsistency → pick one convention; `type` for unions/intersections, `interface` for objects.
- **[MEDIUM]** Overly broad union type instead of discriminated union → defeats narrowing.
- **[MEDIUM]** `extends` abuse creating deep inheritance chains → use composition/intersection types.
- **[MEDIUM]** `Partial<T>` used as function return type when specific optional fields are known → too permissive.
- **[MEDIUM]** Type utilities (`Pick`, `Omit`, `Partial`) not used → manual re-typing of subsets creates drift.
- **[LOW]** `enum` usage → prefer `as const` objects for better tree-shaking and JS interop.
- **[LOW]** Missing `readonly` on arrays/objects that shouldn't be mutated → accidental mutation.
- **[LOW]** Deeply nested generic types (3+ levels) → create intermediate type aliases for readability.

---

## Code Quality

- **[HIGH]** `// @ts-ignore` or `// @ts-expect-error` without comment explaining why → hidden bugs.
- **[HIGH]** Missing null/undefined checks on values from external sources → `Cannot read properties of undefined` at runtime.
- **[HIGH]** `!` non-null assertion on DOM queries (`document.getElementById('x')!`) → crashes if element missing.
- **[HIGH]** `keyof typeof obj` not used when iterating object keys → `Object.keys()` returns `string[]`, losing type info.
- **[MEDIUM]** `import` instead of `import type` for type-only imports → slightly larger bundles, breaks isolatedModules.
- **[MEDIUM]** Duplicate type definitions across files instead of shared types module → drift over time.
- **[MEDIUM]** Type assertions in tests (`as any`, `as unknown as T`) masking real type errors.
- **[MEDIUM]** `Record<string, any>` instead of specific type → index signature hides structure.
- **[MEDIUM]** `Function` type instead of specific signature → loses parameter and return type info.
- **[MEDIUM]** `object` type instead of `Record<string, unknown>` → too broad, no property access.
- **[LOW]** Missing JSDoc on exported public API functions → poor IDE experience for consumers.
- **[LOW]** Large barrel `index.ts` exporting everything → circular dependency risk, slow compilation.
- **[LOW]** `namespace` used instead of ES modules → legacy pattern, avoid in new code.

---

## Common Bugs & Pitfalls

- **[HIGH]** Optional chaining `?.` used but result not checked before use → defeats the purpose; still need null check.
- **[HIGH]** `async` function in array `.map()` → returns `Promise[]` not resolved values. Use `Promise.all(arr.map(async ...))`.
- **[HIGH]** Spreading typed object onto untyped base `{ ...defaults, ...userInput }` where `userInput: any` → loses type safety.
- **[HIGH]** `as unknown as T` double assertion → bypasses all type checking; red flag in code review.
- **[HIGH]** Generic constraint not tight enough → function accepts invalid types without error.
- **[MEDIUM]** `Object.keys(obj)` returns `string[]` not `(keyof typeof obj)[]` → type-unsafe iteration.
- **[MEDIUM]** `parseInt` / `parseFloat` return `NaN` on invalid input, not caught → NaN propagates silently.
- **[MEDIUM]** Conditional type `extends` not distributing over union as expected → wrap in `[]` to prevent distribution.
- **[MEDIUM]** `infer` in complex conditional types causing `never` unexpectedly → simplify or test with `ts-expect-error`.
- **[MEDIUM]** Declaration merging on interfaces used inadvertently → confusing for maintainers.
- **[MEDIUM]** Mapped type modifiers (`-readonly`, `-?`) not understood → removing optionality unintentionally.
- **[LOW]** `satisfies` operator (TS 4.9+) not used where it would be clearer than `as`.
- **[LOW]** Template literal types used for validation logic that should be runtime validation.
