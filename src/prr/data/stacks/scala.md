# Scala — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.scala`, `import scala.`, `object `, `case class`, `trait `, `def `, `implicit`, `Future`, `sbt`, `build.sbt`

---

## Security
- **[HIGH]** Deserialization with Java's `ObjectInputStream` on untrusted data → arbitrary code execution via gadget chains. Use a type-safe serialization library (Circe, uPickle, Protobuf) and never deserialize from untrusted sources with Java's native mechanism.
- **[HIGH]** SQL injection via string interpolation in Slick/Doobie raw queries (`sql"SELECT ... $userInput"`) → database compromise. Use typed interpolators (`sql"... ${param}"` with Doobie's parameterized queries) which bind values safely.
- **[HIGH]** `sys.process` constructed from user-controlled strings → command injection. Use the sequence form (`Seq("cmd", "--flag", userValue).!`) which bypasses shell interpretation.
- **[MEDIUM]** `Future` failure cases not handled with `recover` or `recoverWith` → unhandled exceptions surface as `Future.failed` silently swallowed by callers. Attach `recover`/`onComplete` at every boundary; log and report failures explicitly.
- **[MEDIUM]** Akka HTTP or Play exposing internal exception messages in HTTP responses → information disclosure of stack traces and class names. Catch all `Throwable` at route boundaries and return sanitized error DTOs.

---

## Performance
- **[HIGH]** Blocking operations (`Await.result`, JDBC, blocking IO) inside a `Future` without a dedicated blocking execution context → thread starvation on the default `ExecutionContext`. Wrap blocking calls in `blocking { ... }` or dispatch to a fixed-thread-pool EC.
- **[HIGH]** `List` used for large collections requiring random access → `List` access is O(n). Use `Vector` (effectively O(log n)) or `ArrayBuffer` for indexed access patterns.
- **[HIGH]** Chaining `flatMap`/`map` on large in-memory collections → intermediate collection allocated at each step. Use `Iterator`, `LazyList`, or `fs2.Stream` to process elements lazily without intermediates.
- **[MEDIUM]** Non-exhaustive pattern match inside a `match` expression → `MatchError` thrown at runtime for unhandled cases. Enable `-Wunreachable-code` and `-Wexhaustive` compiler flags; seal all ADT base traits.
- **[MEDIUM]** Complex implicit resolution chains → compilation slowdowns of 10–100×. Prefer explicit type class summoning (`implicitly[TC[A]]`), use `given`/`using` in Scala 3, and minimize implicit scope pollution.
- **[LOW]** Deep recursion without tail call optimization → stack overflow on large inputs. Annotate with `@tailrec` to get compile-time verification; convert non-tail recursion to trampolining with `cats.free.Trampoline`.

---

## Architecture
- **[HIGH]** Mutable `var` state in business logic when immutable design is feasible → shared mutable state causes race conditions and reasoning difficulty. Model state transitions explicitly with immutable case classes and `State` monad or `Ref` from Cats Effect.
- **[HIGH]** Exceptions used for control flow instead of `Either`/`Try`/`Option` → callers unaware a function can fail; exceptions cross `Future` boundaries unpredictably. Return `Either[Error, A]` or `IO[A]` for all fallible operations.
- **[MEDIUM]** Cake pattern or deeply nested implicit hierarchies instead of explicit dependency injection → difficult to understand, test, and refactor. Use constructor injection with a DI framework (ZIO layers, Koin, or simple manual wiring).
- **[MEDIUM]** `Future` chains without `.recover` or `.recoverWith` at service boundaries → errors propagate as unhandled `Future.failed` to the API layer. Add recovery at each service boundary to translate domain errors to typed responses.
- **[LOW]** Not using Cats, Cats Effect, or ZIO for effect management in applications with concurrency → ad hoc `Future` usage becomes hard to reason about. Adopt a consistent effect system and its resource management (`Resource`, `ZIO.acquireRelease`).

---

## Code Quality
- **[HIGH]** Non-exhaustive pattern match without a wildcard catch-all → `MatchError` in production for unhandled ADT variants. Seal all base traits/classes and enable the `-Wunreachable-code` compiler warning.
- **[HIGH]** `Option.get` called without an `isDefined` guard → `NoSuchElementException` at runtime. Use `getOrElse`, `fold`, `for`-comprehension, or pattern match; never call `.get` directly.
- **[MEDIUM]** Implicit conversions causing unexpected type coercions → code behaves differently than it reads. Limit implicit conversions to extension methods; avoid `implicit def` that transforms one type to another silently.
- **[MEDIUM]** Recursive function not annotated with `@tailrec` when intended to be tail-recursive → JVM does not optimize, causing stack overflow. Add `@tailrec` to get a compile error if the recursion is not in tail position.
- **[LOW]** `toString` not overridden on domain classes → log output shows unhelpful `MyClass@1a2b3c`. Override `toString` or use `case class` which auto-generates a meaningful representation.

---

## Common Bugs & Pitfalls
- **[HIGH]** `Future` created without an implicit `ExecutionContext` in scope → compile error, or the wrong global EC used inadvertently. Always import or pass an explicit `ExecutionContext`; use `ExecutionContext.parasitic` for pure transformations.
- **[HIGH]** `==` used on Java-interop objects → Scala forwards `==` to `equals()` for non-primitives, but Java objects may not override `equals()`, falling back to reference equality. Check Java API docs and use `.equals()` or wrap in a Scala case class.
- **[MEDIUM]** `for`-comprehension mixing monads of different types (e.g., `Option` and `Future`) → type mismatch compile error with a confusing message. Keep all generator types consistent; use `OptionT[Future, A]` from Cats to combine.
- **[MEDIUM]** `null` returned from Java interop method used directly in Scala code → `NullPointerException`. Wrap all Java interop results with `Option(javaValue)` immediately at the boundary.
- **[LOW]** `Unit` return type not explicitly annotated on a method that should return `Unit` → inferred as a more specific type if the last expression is non-unit, masking a logic error. Annotate all side-effecting methods with `: Unit` explicitly.
