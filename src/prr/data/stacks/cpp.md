# C++ — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.cpp` · `*.cc` · `*.cxx` · `*.hpp` · `*.h` with `#include <` · `namespace` · `std::` · `CMakeLists.txt` · `Makefile`

---

## Security

- **[CRITICAL]** `strcpy`, `sprintf`, `gets`, `strcat` with user-controlled input → buffer overflow. Use `strncpy`, `snprintf`, `fgets`, `strncat` with explicit size limits, or C++ `std::string`.
- **[CRITICAL]** `system(userInput)` → command injection. Avoid `system()`; use `exec*()` family with sanitized argv array.
- **[HIGH]** Integer overflow in buffer size calculation (e.g., `malloc(count * sizeof(T))`) → heap overflow if multiplication wraps. Use checked arithmetic or `std::vector`.
- **[HIGH]** `printf(userInput)` — untrusted string used as format specifier → format string attack. Always use `printf("%s", userInput)`.
- **[MEDIUM]** Reading from uninitialized memory → undefined behavior, potential info leak. Initialize all variables at declaration.

---

## Performance

- **[HIGH]** Large object passed by value to function → unnecessary copy. Use `const T&` or `T&&` (move semantics).
- **[HIGH]** `new` / `delete` in tight loop → heap fragmentation and allocator overhead. Use stack allocation, `std::vector` with `reserve()`, or a pool allocator.
- **[HIGH]** Virtual function calls in performance-critical inner loop → vtable dispatch per call. Consider templates (CRTP) or `final` to enable devirtualization.
- **[MEDIUM]** `std::map` / `std::set` where `std::unordered_map` / `std::unordered_set` suffices → O(log n) vs O(1) average lookup.
- **[MEDIUM]** Missing `std::move` when returning named local variable (before NRVO applies) → unnecessary copy.
- **[LOW]** `std::endl` in output loop → flushes buffer every iteration. Use `'\n'` unless flush is explicitly needed.

---

## Architecture

- **[CRITICAL]** Raw owning pointer without RAII wrapper → manual `delete` easily missed, double-free, or leak. Use `std::unique_ptr` for exclusive ownership, `std::shared_ptr` for shared.
- **[HIGH]** Memory leak: `new` allocated object not `delete`d on all code paths (including exceptions) → use smart pointers or stack allocation.
- **[HIGH]** Use-after-free: accessing pointer after `delete` → undefined behavior. Set pointer to `nullptr` after delete (or eliminate raw `delete` entirely).
- **[HIGH]** Double-free: `delete` called twice on same pointer → heap corruption. Smart pointers prevent this automatically.
- **[MEDIUM]** Global / static mutable state → thread safety issues without synchronization. Use `std::mutex` or `thread_local`.
- **[LOW]** Deep inheritance hierarchy → prefer composition over inheritance for non-polymorphic designs.

---

## Code Quality

- **[HIGH]** `using namespace std;` in a header file → pollutes namespace of every translation unit that includes it. Limit to `.cpp` files or use explicit `std::` prefix.
- **[MEDIUM]** Member function that doesn't modify state not marked `const` → prevents use with `const` objects, hides intent.
- **[MEDIUM]** Implicit conversion between signed and unsigned integers without explicit cast → subtle overflow or wrap-around bugs. Enable `-Wsign-conversion`.
- **[MEDIUM]** Missing `override` on virtual method override → if base signature changes, override silently becomes a new function.
- **[LOW]** Long function > 50 lines with complex control flow → decompose into smaller functions.

---

## Common Bugs & Pitfalls

- **[CRITICAL]** Undefined behavior: signed integer overflow, null pointer dereference, out-of-bounds array access, data race → UB cannot be relied upon to "just work" even if it appears to.
- **[HIGH]** Iterator invalidation: modifying `std::vector` / `std::map` while iterating (erase, push_back) → UB. Collect indices/iterators first or use erase-remove idiom.
- **[HIGH]** `std::vector::operator[]` without bounds check in production code → UB on out-of-bounds. Use `.at()` during development/testing; add assertion in production.
- **[MEDIUM]** Object slicing: assigning derived-class object to base-class by value → vtable and derived members are lost silently.
- **[MEDIUM]** `#pragma once` vs include guards mixed in same codebase → inconsistency. Pick one convention.
- **[LOW]** Comparing floating-point values with `==` → imprecise. Use epsilon comparison: `std::abs(a - b) < epsilon`.
