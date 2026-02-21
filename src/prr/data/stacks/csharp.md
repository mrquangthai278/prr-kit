# C# / .NET — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.cs` files · `*.csproj` · `*.sln` · `using System` · `namespace` · `dotnet` CLI · `appsettings.json`

---

## Security

- **[CRITICAL]** SQL built with string interpolation: `$"SELECT * WHERE id = {id}"` or concatenation → SQL injection. Use parameterized queries (`SqlParameter`) or an ORM.
- **[CRITICAL]** `Process.Start(new ProcessStartInfo { UseShellExecute = true, FileName = input })` with user input → command injection.
- **[HIGH]** `BinaryFormatter.Deserialize()` on untrusted data → arbitrary code execution (CVE-class issue). Use `System.Text.Json` or `XmlSerializer` with safe settings.
- **[HIGH]** Missing `[ValidateAntiForgeryToken]` on ASP.NET Core POST/PUT/DELETE actions → CSRF.
- **[HIGH]** Hardcoded connection strings, API keys, or secrets in `appsettings.json` committed to version control → use `dotnet user-secrets` or environment variables.
- **[MEDIUM]** `Path.Combine(baseDir, userInput)` without `Path.GetFullPath()` + prefix check → path traversal.
- **[MEDIUM]** `Math.Random` used for security purposes → use `RandomNumberGenerator` from `System.Security.Cryptography`.

---

## Performance

- **[HIGH]** `async void` method (not an event handler) → exceptions are unobservable, swallowed silently. Use `async Task`.
- **[HIGH]** `.Result` or `.Wait()` called on a `Task` in ASP.NET context → deadlock on default synchronization context. Always `await`.
- **[HIGH]** `string +=` in a loop → O(n²) allocations. Use `StringBuilder` or `string.Join`.
- **[MEDIUM]** `.ToList()` called on `IQueryable` before further LINQ operations → materializes entire result set prematurely. Chain LINQ before `.ToList()`.
- **[MEDIUM]** Missing `ConfigureAwait(false)` in library code (non-UI) → captures unnecessary synchronization context, potential deadlock.
- **[MEDIUM]** `IEnumerable<T>` iterated multiple times (e.g., `Count()` then `foreach`) → if source is `IQueryable`, triggers two DB calls. Materialize once.
- **[LOW]** Large object allocation in hot path without pooling → GC pressure. Consider `ArrayPool<T>` or `MemoryPool<T>`.

---

## Architecture

- **[HIGH]** `static` mutable fields in ASP.NET Core services → shared across requests, race conditions without synchronization.
- **[HIGH]** `IDisposable` object created without `using` statement or `await using` → resource leak (DB connections, streams, HTTP clients).
- **[MEDIUM]** Catching `Exception` too broadly: `catch (Exception e) { }` → masks unrelated bugs. Catch specific exception types.
- **[MEDIUM]** `HttpClient` instantiated per request (`new HttpClient()`) → socket exhaustion. Use `IHttpClientFactory` or a singleton.
- **[MEDIUM]** Service registered with wrong lifetime in DI: `Scoped` service injected into `Singleton` → captive dependency, stale scoped instance.

---

## Code Quality

- **[HIGH]** Nullable reference types disabled (`<Nullable>disable</Nullable>` in `.csproj`) → NullReferenceException not caught at compile time. Enable and fix warnings.
- **[HIGH]** `throw ex` instead of `throw` in catch block → resets stack trace, hides origin of exception.
- **[MEDIUM]** `var` used where type is not obvious from right-hand side → readability suffers. Use explicit type or improve variable naming.
- **[MEDIUM]** Missing cancellation token propagation in async call chain → operation cannot be cancelled, resource held until timeout.
- **[LOW]** Public method without XML doc comment on public API → poor discoverability.

---

## Common Bugs & Pitfalls

- **[HIGH]** `DateTime.Now` used for storage or cross-system comparison → timezone-dependent. Use `DateTime.UtcNow` or `DateTimeOffset.UtcNow`.
- **[HIGH]** `int.Parse(input)` without try-catch or using `int.TryParse()` → `FormatException` on invalid input crashes the request.
- **[MEDIUM]** Struct implementing `IDisposable` boxed via interface → `Dispose` called on box copy, not original. Use class for disposable types.
- **[MEDIUM]** Enum default value (0) not explicitly named → uninitialized enum variable has a valid but meaningless value. Always define a `None = 0` or `Unknown = 0` member.
- **[MEDIUM]** `lock(this)` or `lock(typeof(Foo))` → public lock objects can be acquired externally, causing deadlocks. Use a private `readonly object _lock = new()`.
- **[LOW]** `string.Compare` used for equality check → use `string.Equals` with `StringComparison` for intent clarity and performance.
