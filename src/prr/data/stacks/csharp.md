# C# / .NET — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.cs` files · `*.csproj` · `*.sln` · `using System` · `namespace` · `dotnet` CLI · `appsettings.json` · ASP.NET Core · Entity Framework

---

## Security

- **[CRITICAL]** SQL built with string interpolation: `$"SELECT * WHERE id = {id}"` → SQL injection. Use parameterized queries (`SqlParameter`) or EF Core.
- **[CRITICAL]** `Process.Start(new ProcessStartInfo { UseShellExecute = true, FileName = input })` with user input → command injection. Use argument arrays, not shell strings.
- **[CRITICAL]** `BinaryFormatter.Deserialize()` on untrusted data → arbitrary code execution (CVE-class). Use `System.Text.Json` or `XmlSerializer` with safe settings.
- **[HIGH]** Missing `[ValidateAntiForgeryToken]` on ASP.NET Core POST/PUT/DELETE → CSRF.
- **[HIGH]** Hardcoded connection strings / API keys in `appsettings.json` committed to VCS → use `dotnet user-secrets`, Azure Key Vault, or environment variables.
- **[HIGH]** `Path.Combine(baseDir, userInput)` without `Path.GetFullPath()` + prefix check → path traversal.
- **[HIGH]** `JsonConvert.DeserializeObject<T>(input)` with `TypeNameHandling.All` → remote code execution via `$type`.
- **[HIGH]** Sensitive data logged via `_logger.LogInformation()` with string interpolation → log injection.
- **[HIGH]** `RNGCryptoServiceProvider` deprecated → use `RandomNumberGenerator.Fill()` (static, .NET 6+).
- **[MEDIUM]** `Math.Random` used for security purposes → use `RandomNumberGenerator` from `System.Security.Cryptography`.
- **[MEDIUM]** CORS configured too permissively (`AllowAnyOrigin + AllowCredentials`) → CORS misconfiguration.
- **[MEDIUM]** `HttpContext.Request.Headers["X-Forwarded-For"]` trusted without proxy validation → IP spoofing.
- **[MEDIUM]** Passwords stored as `string` → immutable, lingers in memory. Use `SecureString` or clear char arrays.
- **[LOW]** Exception details returned in API response in production → configure `app.UseExceptionHandler` properly.

---

## Performance

- **[HIGH]** `async void` method (not event handler) → exceptions unobservable, swallowed silently. Use `async Task`.
- **[HIGH]** `.Result` or `.Wait()` on Task in ASP.NET context → deadlock on synchronization context. Always `await`.
- **[HIGH]** `string +=` in loop → O(n²). Use `StringBuilder` or `string.Join`.
- **[HIGH]** `await` inside loop instead of batching with `Task.WhenAll()` → sequential async = unnecessary latency.
- **[HIGH]** Entity Framework `Include()` loading entire related collection when only count or single field needed → select projection.
- **[HIGH]** Synchronous EF Core calls (`.ToList()` without `Async`) in ASP.NET Core → blocking thread pool thread.
- **[HIGH]** Missing `AsNoTracking()` on read-only EF Core queries → change tracker overhead.
- **[MEDIUM]** `.ToList()` called on `IQueryable` before further LINQ operations → materializes entire result prematurely.
- **[MEDIUM]** Missing `ConfigureAwait(false)` in library code → captures unnecessary sync context.
- **[MEDIUM]** `IEnumerable<T>` iterated multiple times → if `IQueryable`, triggers multiple DB calls. Materialize once.
- **[MEDIUM]** Large object allocation in hot path without pooling → GC pressure. Use `ArrayPool<T>` or `MemoryPool<T>`.
- **[MEDIUM]** Not using `Span<T>` / `Memory<T>` for buffer operations → unnecessary heap allocations.
- **[MEDIUM]** LINQ `GroupBy` on large in-memory collections → O(n) memory → push to DB if possible.
- **[LOW]** Not using `HttpClient` with `IHttpClientFactory` → socket exhaustion with `new HttpClient()`.
- **[LOW]** `Task.Run` wrapping CPU-bound work then awaiting → thread pool overhead for short tasks.

---

## Architecture

- **[HIGH]** `static` mutable fields in ASP.NET Core services → shared across requests, race conditions without sync.
- **[HIGH]** `IDisposable` object created without `using` or `await using` → resource leak (DB connections, streams).
- **[HIGH]** Service registered with wrong DI lifetime: `Scoped` injected into `Singleton` → captive dependency.
- **[HIGH]** `DbContext` used as singleton → EF Core `DbContext` is not thread-safe, designed for scoped lifetime.
- **[HIGH]** Business logic in ASP.NET Core controllers → move to service/domain layer.
- **[HIGH]** Not using Repository/Unit of Work pattern with EF Core → testability and coupling issues.
- **[MEDIUM]** Catching `Exception` too broadly → masks unrelated bugs. Catch specific exceptions.
- **[MEDIUM]** `HttpClient` instantiated per request → socket exhaustion. Use `IHttpClientFactory`.
- **[MEDIUM]** Not using `CancellationToken` propagation in async chain → operations can't be cancelled.
- **[MEDIUM]** God class with >500 lines → decompose by responsibility.
- **[MEDIUM]** Domain model leaking persistence concerns (EF navigation properties in API contracts).
- **[LOW]** Not using `record` types (C# 9+) for DTOs and value objects → verbose boilerplate equality.
- **[LOW]** Not using `sealed` on classes not designed for inheritance → unintended extension.

---

## Code Quality

- **[HIGH]** Nullable reference types disabled (`<Nullable>disable</Nullable>`) → NullReferenceException not caught at compile time. Enable and fix warnings.
- **[HIGH]** `throw ex` instead of `throw` in catch block → resets stack trace, hides origin.
- **[HIGH]** `int.Parse(input)` without `TryParse` → `FormatException` on invalid input crashes request.
- **[HIGH]** Not using `pattern matching` for type checks → verbose `is`/`as` + null check.
- **[MEDIUM]** `var` used where type not obvious from RHS → readability suffers.
- **[MEDIUM]** Missing cancellation token propagation in async call chain.
- **[MEDIUM]** Magic strings for configuration keys instead of typed options with `IOptions<T>`.
- **[MEDIUM]** `?.` null conditional chaining producing `null` result silently used without null check.
- **[MEDIUM]** Not using C# 10+ features (`record struct`, global using, file-scoped namespace) in modern projects.
- **[MEDIUM]** Event subscription not unsubscribed → memory leak via event handler reference.
- **[LOW]** Public method without XML doc comment on public API.
- **[LOW]** Not using `nameof()` for property names in validation/logging → typo-prone string literals.

---

## Common Bugs & Pitfalls

- **[HIGH]** `DateTime.Now` for storage/cross-system → timezone-dependent. Use `DateTime.UtcNow` or `DateTimeOffset.UtcNow`.
- **[HIGH]** `LINQ` deferred execution not understood → query executed multiple times or after `DbContext` disposed.
- **[HIGH]** EF Core `SaveChangesAsync()` not called after mutations → changes not persisted silently.
- **[HIGH]** `lock(this)` or `lock(typeof(Foo))` → public lock objects can be acquired externally → deadlock.
- **[HIGH]** `Task.WhenAll()` not awaited → exceptions swallowed.
- **[MEDIUM]** Struct implementing `IDisposable` boxed via interface → `Dispose` called on copy.
- **[MEDIUM]** Enum default value (0) not explicitly named → uninitialized enum has valid meaningless value.
- **[MEDIUM]** `string.Compare` for equality → use `string.Equals` with `StringComparison`.
- **[MEDIUM]** EF Core lazy loading enabled without understanding → N+1 queries via navigation property access.
- **[MEDIUM]** `ConcurrentDictionary.GetOrAdd` with factory that has side effects → factory may run multiple times.
- **[LOW]** `StringBuilder.Append()` returning `this` for chaining not used → verbose multi-line appends.
- **[LOW]** `Encoding.UTF8.GetString` on bytes from wrong encoding → mojibake.
