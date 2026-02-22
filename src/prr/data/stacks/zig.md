# Zig — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.zig`, `const std = @import("std")`, `pub fn main()`, `@allocator`, `comptime`, `zig build`, `build.zig`

---

## Security
- **[CRITICAL]** `@ptrCast` without bounds validation → memory safety violation that bypasses Zig's safety checks. Always validate pointer alignment and bounds before casting; prefer safe alternatives like `std.mem.bytesAsValue`.
- **[HIGH]** `undefined` values used without initialization before first read → undefined behavior in ReleaseFast; reads garbage data in Debug. Initialize all values explicitly or use `std.mem.zeroes()`.
- **[HIGH]** Allocator errors not handled → unhandled `error.OutOfMemory` causes a panic or silent data corruption. Always propagate or handle allocator errors with `try` or explicit `catch`.
- **[HIGH]** C interop via `@cImport` with unsafe C APIs without bounds checking → buffer overflows from C side invisible to Zig's safety. Wrap all C calls in a safe Zig layer that validates sizes and return values.
- **[MEDIUM]** Integer overflow not using `@addWithOverflow` or checked math → wraps silently in ReleaseFast, panics in Debug. Use `std.math.add` or `@addWithOverflow` for arithmetic on external data.
- **[MEDIUM]** Unsafe type punning via `@bitCast` on incompatible types → undefined behavior when alignment or size mismatches. Use `std.mem.bytesAsValue` with explicit alignment checks.

---

## Performance
- **[HIGH]** Allocator calls inside hot loops instead of fixed buffers or arena allocators → per-iteration syscall overhead and fragmentation. Use a stack buffer (`var buf: [N]u8 = undefined`) or `std.heap.ArenaAllocator` for loop-scoped allocations.
- **[HIGH]** Comptime-known computations not evaluated at `comptime` → runtime overhead for constants. Annotate with `comptime` to move computation to compile time.
- **[HIGH]** Heap allocation where stack allocation suffices → unnecessary allocator pressure and pointer indirection. Prefer local arrays and slices; reserve heap for runtime-sized or long-lived data.
- **[MEDIUM]** Not using `@Vector` for data-parallel operations on numeric arrays → leaving SIMD throughput unused. Use `@Vector(N, T)` and let the backend auto-vectorize.
- **[MEDIUM]** Untagged union field accessed for the wrong active tag → misinterpretation of bit patterns with no runtime check. Use tagged unions (`union(enum)`) and switch exhaustively on the tag.
- **[LOW]** Build mode not set to `ReleaseFast` or `ReleaseSafe` for production → unnecessary safety overhead or missed optimizations. Set `optimize` in `build.zig` explicitly and document the choice.

---

## Architecture
- **[HIGH]** Error handling not using Zig's error union (`!T`) pattern consistently → callers must guess whether a function can fail. Return `!T` for all fallible functions and propagate with `try`.
- **[HIGH]** `defer` not used for resource cleanup → resources leaked on early returns or errors. Add `defer resource.deinit()` immediately after successful acquisition.
- **[MEDIUM]** Custom allocators not used for subsystem memory isolation → one subsystem's leak affects global heap. Pass allocators explicitly and use arena or fixed-buffer allocators to scope lifetimes.
- **[MEDIUM]** `comptime` overused for logic that varies at runtime → code harder to follow and debug. Reserve `comptime` for type-level generics and compile-time constants; document non-obvious uses.
- **[LOW]** Not using Zig's build system (`build.zig`) for cross-platform builds → relying on shell scripts that break on Windows or non-standard targets. Express all build steps in `build.zig`.

---

## Code Quality
- **[HIGH]** `unreachable` in code paths that can actually be reached → illegal behavior in ReleaseFast, panic in Debug. Replace with an explicit `else` branch that returns an error or asserts loudly in tests.
- **[HIGH]** Ignoring error union by discarding with `_ = try expr` without handling → silent swallowing of errors. Explicitly handle or log the error; use `catch |err| std.log.err(...)` pattern.
- **[MEDIUM]** Slice bounds not checked before indexing → potential panic or out-of-bounds access. Assert `index < slice.len` or use `slice[index..]` range checks explicitly.
- **[MEDIUM]** Not using `std.testing` module for unit tests → missing coverage and no integration with `zig test`. Write tests in `test` blocks and run them with `zig build test`.
- **[LOW]** Not following Zig naming conventions → camelCase for functions/variables, PascalCase for types, SCREAMING_SNAKE for comptime constants. Inconsistency impedes readability; enforce via code review.

---

## Common Bugs & Pitfalls
- **[HIGH]** Pointer to stack-allocated memory returned from a function → dangling pointer after frame unwinds. Never return pointers to local variables; heap-allocate or pass a caller-owned buffer.
- **[HIGH]** Slice created from pointer with incorrect length → buffer over-read or under-read. Always derive length from the same source as the pointer; prefer passing slices (`[]T`) over raw pointers.
- **[MEDIUM]** Optional (`?T`) unwrapped with `.?` without prior null check → panic in safe modes, undefined in unsafe. Use `if (opt) |val|` or `orelse` to handle the null case explicitly.
- **[MEDIUM]** Integer type mismatch in arithmetic → unexpected truncation or sign extension. Use explicit casts (`@intCast`, `@truncate`) with documented intent rather than implicit coercion.
- **[LOW]** `@field(obj, comptime_str)` with a string not validated at comptime → compile error surfaced at the call site with a confusing message. Validate field names with `std.meta.fields` and provide a clear comptime error.
