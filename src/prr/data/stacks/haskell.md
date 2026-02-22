# Haskell — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.hs`, `import Control.`, `import Data.`, `module `, `where`, `do`, `IO ()`, `cabal.project`, `stack.yaml`, `ghc`

---

## Security
- **[HIGH]** `unsafePerformIO` used in ostensibly pure code → violates referential transparency and can introduce data races when the IO action is shared across threads. Replace with properly threaded `IO` or use `IORef`/`MVar` for shared mutable state.
- **[HIGH]** `read` called on untrusted input → throws an exception (partial function) on any parse failure, crashing the thread. Use `readMaybe` from `Text.Read` and handle the `Nothing` case explicitly.
- **[MEDIUM]** Lazy IO via `readFile` / `hGetContents` → file handle not closed until the lazy string is fully consumed; if evaluation is deferred, handle leaks occur. Use `withFile` + strict `Data.ByteString` / `Data.Text` IO or the `conduit`/`pipes` streaming library.
- **[MEDIUM]** Cryptographic operations using unmaintained or unaudited libraries → known vulnerabilities unpatched. Use `cryptonite` or `botan-bindings` and pin exact versions; review library update history before adoption.

---

## Performance
- **[HIGH]** Lazy evaluation causing space leaks — thunks accumulate in long-running folds or accumulator patterns → process RSS grows unboundedly. Force strict evaluation with `seq`, `deepseq`, `BangPatterns`, or strict data fields (`{-# LANGUAGE StrictData #-}`).
- **[HIGH]** `String` (linked list of `Char`) used for text processing → 5–20× memory overhead and poor cache performance compared to `Text`. Use `Data.Text` (UTF-16 packed) or `Data.ByteString` for all string-heavy code.
- **[HIGH]** `Data.List` operations (`!!`, `length`) on large lists → O(n) traversal. Use `Data.Sequence` for O(log n) indexed access or `Data.Vector` for O(1) arrays.
- **[MEDIUM]** Accumulator in recursive function not forced with `!` (BangPattern) → thunk chain of size n built before evaluation begins, consuming O(n) stack/heap. Add `BangPatterns` or use `foldl'` (strict fold from `Data.List`).
- **[MEDIUM]** No profiling performed with GHC's `+RTS -p -s` runtime flags → space leaks and hot spots remain undetected until production. Run with `-prof -fprof-auto` during development to generate heap profiles.

---

## Architecture
- **[HIGH]** `IO` actions scattered throughout pure business logic → untestable without executing real effects. Separate pure logic from effects using the `ReaderT` pattern, `MTL` type classes, or an algebraic effects library (`effectful`, `polysemy`).
- **[HIGH]** Partial functions (`head`, `tail`, `fromJust`, `!!`) used in production code → `Exception` thrown on empty list or `Nothing`. Replace with total alternatives: `listToMaybe`, `maybe`, pattern match with an explicit empty case.
- **[MEDIUM]** Not using the `ReaderT` pattern for passing configuration and dependencies → functions take many explicit arguments or rely on global `IORef`s. Thread a `Env` record through `ReaderT Env IO` for implicit dependency injection.
- **[MEDIUM]** `State` monad overused for logic that is actually a pure fold → unnecessary monad overhead. Prefer `foldl'` or explicit accumulator arguments for simple stateful transformations.
- **[LOW]** Library and executable sources not separated in the Cabal file → internal modules exposed inadvertently; slower test compilation. Define a `library` stanza with the `exposed-modules` list and have the `executable` depend on it.

---

## Code Quality
- **[HIGH]** Partial functions in production: `head []`, `fromJust Nothing`, `arr !! outOfBounds` → runtime `Exception` with no meaningful error site. Use `listToMaybe`, `maybe default id`, and bounds-checked indexing; compile with `-Wall -Werror` to catch incomplete patterns.
- **[HIGH]** `error "TODO"` or `undefined` left in non-test code → crashes at runtime when the code path is reached. Replace with proper `Either`/`Maybe` returns or typed not-implemented errors before merging.
- **[MEDIUM]** Not running `hlint` and `ormolu`/`fourmolu` in CI → stylistic inconsistencies and common anti-patterns accumulate. Add `hlint` and formatter checks as CI steps; fail on any hint.
- **[MEDIUM]** Type signatures missing on top-level functions → GHC infers types but they may be more general than intended, causing subtle bugs or confusing error messages elsewhere. Add explicit type signatures to all top-level and exported functions.
- **[LOW]** Pattern matching not exhaustive with `-Wall` suppressed → `Non-exhaustive patterns` warning hidden, crashes in production. Compile with `-Wall -Wexhaustive-fields` and treat warnings as errors in CI.

---

## Common Bugs & Pitfalls
- **[HIGH]** Lazy `foldl` instead of strict `foldl'` for summation or accumulation → O(n) thunk chain causes stack overflow on large inputs. Always use `Data.List.foldl'` or `Data.Foldable.foldl'`; never use `foldl` on a strict result.
- **[HIGH]** `show` / `read` round-trip assumed for all types → `read (show x) /= x` for types like `Double` (NaN, Infinity) or custom `Show` instances. Use explicit serialization (Aeson, binary) for persistence rather than `show`/`read`.
- **[MEDIUM]** Monad transformer stack order not carefully chosen → `StateT s (ExceptT e IO)` (state lost on error) vs `ExceptT e (StateT s IO)` (state preserved on error) have different semantics. Document the intended error/state interaction and encode it in the type stack order.
- **[MEDIUM]** `unsafeCoerce` used to work around a type-checker error → type safety voided, potential runtime crash or memory corruption. Fix the underlying type mismatch; use `Data.Coerce.coerce` only for `newtype` coercions where it is guaranteed safe.
- **[LOW]** `deriving (Eq, Ord)` field order determines comparison semantics → adding a field changes the `Ord` instance, breaking `Map`/`Set` ordering. Document the intended comparison key and consider a manual `Ord` instance or `newtype` wrapper for maps.
