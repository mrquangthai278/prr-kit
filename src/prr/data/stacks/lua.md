# Lua — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.lua`, `require(`, `local function`, `love.`, `--[[`, `ngx.`, `redis.call(`, `luarocks`

---

## Security
- **[CRITICAL]** `load()` / `loadstring()` with user input → arbitrary Lua code execution. Never pass user-controlled strings to `load()`; validate and whitelist all dynamic code paths.
- **[CRITICAL]** `os.execute()` with user-controlled strings → command injection. Use a whitelist of allowed commands or avoid `os.execute()` entirely for user input.
- **[HIGH]** `io.open()` with user-controlled paths → path traversal. Canonicalize and validate paths against an allowed root before opening.
- **[HIGH]** `require()` with user-controlled module names → arbitrary module loading. Never construct module names from user input; use a static allowlist.
- **[MEDIUM]** Lua metatables manipulated to bypass access control → sandbox escape. Lock metatables with `__newindex` guards and freeze sensitive tables.
- **[MEDIUM]** Globals not sandboxed in embedded Lua environments → host process exposure. Set a restricted `_ENV` sandbox for all user-provided scripts.

---

## Performance
- **[HIGH]** String concatenation with `..` in loops → O(n²) garbage collection pressure. Collect strings in a table and use `table.concat()` at the end.
- **[HIGH]** Global variable access in hot loops → globals are ~30% slower than locals due to hash lookups. Cache globals as locals at function top (`local sin = math.sin`).
- **[HIGH]** Not caching table field lookups in hot loops → repeated hash traversal. Assign frequently accessed fields to locals before the loop.
- **[MEDIUM]** Creating tables or closures inside inner loops → excessive GC pressure. Pre-allocate and reuse tables; move closure creation outside the loop.
- **[MEDIUM]** Recursive functions without tail call optimization → stack growth. Rewrite as `return f()` (true tail call) or convert to iterative form.
- **[LOW]** Not using LuaJIT for performance-critical applications → leaving significant JIT speedups on the table. Evaluate LuaJIT compatibility for the deployment target.

---

## Architecture
- **[HIGH]** Module pattern not used → global namespace pollution and load-order dependencies. Wrap every module in `local M = {} … return M` and `require()` it explicitly.
- **[HIGH]** Metatables used for OOP without a consistent class pattern → fragile inheritance chains. Adopt one pattern (e.g., `__index`-based prototype) and enforce it across the codebase.
- **[MEDIUM]** Circular `require()` dependencies → partially-initialized module tables at require time. Refactor shared state into a third module or use lazy loading.
- **[MEDIUM]** Error handling not using `pcall`/`xpcall` → unhandled errors crash the running coroutine silently. Wrap all external calls and IO in `pcall`; use `xpcall` with a traceback handler for top-level boundaries.
- **[LOW]** Coroutines not used for cooperative multitasking where appropriate → blocking code in event-driven hosts (e.g., OpenResty). Yield at IO boundaries using coroutine-based async patterns.

---

## Code Quality
- **[HIGH]** `local` not used for variables → accidental globals silently pollute `_G` and persist across calls. Declare every variable `local`; use `luacheck` to catch globals.
- **[HIGH]** Missing `pcall` around risky operations (file IO, network, `require`) → unhandled errors propagate and crash callers. Wrap with `pcall`/`xpcall` and return structured error values.
- **[MEDIUM]** Magic numbers instead of named constants → intent unclear and values duplicated. Lua has no `const`; define constants as module-level locals with UPPER_SNAKE naming.
- **[MEDIUM]** Tables used as arrays with mixed integer/string keys → the `#` length operator only counts the integer sequence and gives undefined results for sparse or mixed tables. Use purely integer-keyed tables for arrays and track length explicitly if needed.
- **[LOW]** Inconsistent use of `:` vs `.` for method calls → runtime errors when `self` is missing or an extra argument is passed. Establish a convention and enforce it in code review.

---

## Common Bugs & Pitfalls
- **[HIGH]** Array indexing starts at 1, not 0 → off-by-one errors when porting algorithms or interfacing with C. Audit all index arithmetic and document the convention explicitly.
- **[HIGH]** `nil` in an array breaks the `#` length operator → iterating with `ipairs` stops early; `#` returns an unpredictable value. Track array length in a separate field or avoid `nil` holes.
- **[MEDIUM]** `and`/`or` used as a ternary expression → `false or default` evaluates to `default` even when the intended value is `false`. Use an explicit `if` expression or helper function.
- **[MEDIUM]** `==` on tables compares references, not content → two structurally identical tables are never equal. Implement a deep-equality function for value comparison.
- **[LOW]** Multiple return values silently truncated when assigned to a single variable → data loss with no error. Capture all return values explicitly or use `select('#', ...)` to verify count.
