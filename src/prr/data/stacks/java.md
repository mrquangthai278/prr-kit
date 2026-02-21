# Java — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.java` files · `public class` · `import java.` · without Spring Boot signals (`@SpringBootApplication`) — for Spring Boot, see `spring-boot.md`

---

## Security

- **[CRITICAL]** JDBC query built with string concatenation: `"SELECT * WHERE id = " + id` → SQL injection. Always use `PreparedStatement` with `?` placeholders.
- **[CRITICAL]** `Runtime.getRuntime().exec(userInput)` or `new ProcessBuilder(userInput)` with shell string → command injection. Pass argument array, never a shell string.
- **[HIGH]** `ObjectInputStream.readObject()` on untrusted data → arbitrary code execution (deserialization gadget chain). Use JSON/Protobuf or filter with a `ObjectInputFilter`.
- **[HIGH]** `XMLDecoder.readObject()` on untrusted XML → arbitrary Java object construction, effectively RCE.
- **[MEDIUM]** `Math.random()` for security tokens, nonces, or session IDs → not cryptographically secure. Use `SecureRandom`.
- **[MEDIUM]** Sensitive data (passwords, keys) stored in `String` → strings are immutable and interned, persist in memory. Use `char[]` and zero it after use.

---

## Performance

- **[HIGH]** `String +=` in a loop → O(n²) due to immutability. Use `StringBuilder` or `String.join()`.
- **[HIGH]** Returning `null` from collection-returning method → forces null checks everywhere. Return `Collections.emptyList()` / `Optional.empty()`.
- **[MEDIUM]** Synchronized on entire method when only a small critical section needs it → unnecessary contention. Use a narrower `synchronized` block.
- **[MEDIUM]** `Iterator.remove()` not used when removing during iteration → `ConcurrentModificationException`. Use `iterator.remove()` or `removeIf()`.
- **[MEDIUM]** Autoboxing `Integer` / `Long` in tight loops with primitive arithmetic → heap allocation per operation. Use `int` / `long` primitives.
- **[LOW]** `List.contains()` called in a loop on large `ArrayList` → O(n²). Use `HashSet` for membership checks.

---

## Architecture

- **[HIGH]** `static` mutable fields → shared global state, not thread-safe without synchronization, complicates testing.
- **[MEDIUM]** Exception swallowed in catch: `catch (Exception e) { }` or `catch (Exception e) { e.printStackTrace(); }` → silent failure. Log properly or rethrow.
- **[MEDIUM]** `throws Exception` in method signature → too broad, forces all callers to handle `Exception`. Declare specific checked exceptions.
- **[MEDIUM]** `Connection` / `Statement` / `ResultSet` not closed on all paths → DB connection pool exhaustion. Use try-with-resources.
- **[LOW]** Method > 50 lines → decompose for readability and testability.

---

## Code Quality

- **[HIGH]** `==` used for `String` comparison → compares object references, not values. Use `String.equals()` or `Objects.equals()`.
- **[HIGH]** `NullPointerException` risk: no null checks on external / user data → use `Objects.requireNonNull()`, `Optional<T>`, or `@NonNull` annotations.
- **[MEDIUM]** Raw generic types: `List list` instead of `List<String>` → unchecked cast warnings, `ClassCastException` at runtime.
- **[MEDIUM]** `instanceof` check followed by explicit cast without pattern matching (Java < 16) → redundant but necessary. Consider upgrading or using pattern matching.
- **[LOW]** Missing `@Override` on overridden methods → if base class signature changes, override silently becomes a new method.

---

## Common Bugs & Pitfalls

- **[HIGH]** `Integer` auto-boxing comparison: `Integer a = 200; Integer b = 200; a == b` → `false` outside cache range (-128 to 127). Always use `.equals()` for boxed types.
- **[HIGH]** `java.util.Date` / `Calendar` mutability → objects modified after creation cause subtle bugs. Use `java.time` (`LocalDate`, `Instant`, `ZonedDateTime`).
- **[MEDIUM]** `Arrays.asList()` returns fixed-size list → `UnsupportedOperationException` on `add()`/`remove()`. Use `new ArrayList<>(Arrays.asList(...))` for mutable list.
- **[MEDIUM]** `Collections.unmodifiableList()` wraps original list → mutations to original list are reflected. For true immutability use `List.copyOf()` (Java 10+).
- **[LOW]** `finalize()` method overridden and relied upon → not guaranteed to run, deprecated since Java 9, removed in Java 18. Use `Cleaner` or `try-with-resources`.
