# Java — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.java` files · `public class` · `import java.` · without Spring Boot signals — for Spring Boot see `spring-boot.md`

---

## Security

- **[CRITICAL]** JDBC query with string concatenation: `"SELECT * WHERE id = " + id` → SQL injection. Use `PreparedStatement` with `?`.
- **[CRITICAL]** `Runtime.getRuntime().exec(userInput)` with shell string → command injection. Use argument array.
- **[CRITICAL]** `ObjectInputStream.readObject()` on untrusted data → arbitrary code execution (gadget chain). Filter with `ObjectInputFilter`.
- **[CRITICAL]** `XMLDecoder.readObject()` on untrusted XML → arbitrary Java object construction, effectively RCE.
- **[HIGH]** Deserializing JSON with `@JsonTypeInfo` and `enableDefaultTyping` → polymorphic deserialization attack.
- **[HIGH]** `File` operations with user-controlled paths without canonicalization → path traversal. Use `Path.normalize()` + prefix check.
- **[HIGH]** LDAP injection via string-concatenated LDAP queries with user input.
- **[HIGH]** XXE via `DocumentBuilderFactory` without disabling external entities → SSRF or file read.
- **[MEDIUM]** `Math.random()` for security tokens, nonces, session IDs → use `SecureRandom`.
- **[MEDIUM]** Sensitive data (passwords, keys) stored in `String` → immutable, interned, persists in memory. Use `char[]`.
- **[MEDIUM]** Log4j / SLF4J logging user input without sanitization → log injection (historically log4shell vector).
- **[LOW]** Sensitive data in Java heap dumps or thread dumps if not cleared.

---

## Performance

- **[HIGH]** `String +=` in loop → O(n²). Use `StringBuilder` or `String.join()`.
- **[HIGH]** `synchronized` on entire method when only small section needs it → unnecessary contention.
- **[HIGH]** `Connection` / `Statement` / `ResultSet` not closed → DB connection pool exhaustion. Use try-with-resources.
- **[HIGH]** N+1 queries in JPA — loading associations via lazy loading in loop → use `JOIN FETCH` or `EntityGraph`.
- **[HIGH]** Autoboxing `Integer`/`Long` in tight loops → heap allocation per operation. Use primitives.
- **[HIGH]** Virtual threads (Java 21+) blocked on synchronized → pin carrier thread. Use `ReentrantLock` instead.
- **[HIGH]** `Stream.parallel()` used for I/O-bound tasks → wrong executor, thread starvation.
- **[MEDIUM]** `List.contains()` called in loop on large `ArrayList` → O(n²). Use `HashSet`.
- **[MEDIUM]** Returning mutable collections from public API → caller can modify internal state. Return `Collections.unmodifiableList()` or `List.copyOf()`.
- **[MEDIUM]** `HashMap` without initial capacity for known large size → multiple rehashes.
- **[MEDIUM]** Unnecessary object creation inside loop (`new StringBuilder()` etc.).
- **[LOW]** `Iterator.remove()` not used when removing during iteration → `ConcurrentModificationException`.
- **[LOW]** Primitive array vs collection for large numeric data → boxing overhead.

---

## Architecture

- **[HIGH]** `static` mutable fields → shared global state, not thread-safe, complicates testing.
- **[HIGH]** Exception swallowed: `catch (Exception e) {}` or `e.printStackTrace()` → silent failure.
- **[HIGH]** `throws Exception` too broad → forces callers to handle `Exception`. Declare specific checked exceptions.
- **[HIGH]** Not using try-with-resources for `AutoCloseable` → resource leak on exception.
- **[HIGH]** Checked exceptions overused for recoverable business conditions → use result types or unchecked.
- **[MEDIUM]** Not using `Optional<T>` for nullable return values → NullPointerException propagation.
- **[MEDIUM]** God class >300 lines → decompose by responsibility (SRP).
- **[MEDIUM]** Concrete class dependencies instead of interface → hard to mock in tests.
- **[MEDIUM]** Not using `record` (Java 16+) for data carrier classes → verbose POJO boilerplate.
- **[MEDIUM]** Not using sealed classes (Java 17+) for ADT patterns → unchecked `instanceof` chains.
- **[LOW]** Method >50 lines → decompose.
- **[LOW]** Not using `var` (Java 10+) where type obvious → verbose.

---

## Code Quality

- **[HIGH]** `==` for `String` comparison → reference equality not value. Use `String.equals()` or `Objects.equals()`.
- **[HIGH]** NPE risk: no null checks on external/user data → use `Objects.requireNonNull()` or `Optional`.
- **[HIGH]** Not overriding `hashCode()` when overriding `equals()` → breaks HashMap/HashSet behavior.
- **[HIGH]** `instanceof` check without pattern matching (Java 16+) → redundant cast.
- **[MEDIUM]** Raw generic types: `List list` instead of `List<String>` → unchecked cast warnings, `ClassCastException`.
- **[MEDIUM]** Not using `@Override` on overridden methods → if base signature changes, override silently becomes new method.
- **[MEDIUM]** Not using `Collections.emptyList()` instead of `null` for empty collection returns.
- **[MEDIUM]** Mutable object stored in `final` field without defensive copy → field reference immutable but content mutable.
- **[LOW]** Not using `Stream` API for collection transformations → verbose `for` loops.
- **[LOW]** `System.out.println` for logging in production → use SLF4J.

---

## Common Bugs & Pitfalls

- **[HIGH]** `Integer` autoboxing comparison: `Integer a = 200; a == 200` → false outside cache (-128 to 127). Use `.equals()`.
- **[HIGH]** `java.util.Date`/`Calendar` mutability and timezone handling → use `java.time` (`Instant`, `ZonedDateTime`).
- **[HIGH]** `ConcurrentModificationException` from modifying collection during enhanced for-each → use `Iterator.remove()` or `removeIf()`.
- **[HIGH]** `HashMap` not thread-safe under concurrent writes → use `ConcurrentHashMap`.
- **[HIGH]** `Optional.get()` without `isPresent()` check → `NoSuchElementException`.
- **[MEDIUM]** `Arrays.asList()` returns fixed-size list → `UnsupportedOperationException` on `add()`/`remove()`.
- **[MEDIUM]** `List.of()` / `Map.of()` (Java 9+) are null-hostile and unmodifiable → don't pass null.
- **[MEDIUM]** `ThreadLocal` not removed in thread pool → stale data in reused threads.
- **[MEDIUM]** `SimpleDateFormat` not thread-safe → use `DateTimeFormatter` (thread-safe).
- **[LOW]** `finalize()` overridden → not guaranteed to run, removed Java 18. Use `Cleaner` or try-with-resources.
- **[LOW]** `instanceof` + cast without pattern matching → verbose, duplicates the type check.
