# WebAssembly (WASM) — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.wasm`, `*.wat`, `WebAssembly`, `wasm-pack`, `wasm-bindgen`, `emscripten`, `#[wasm_bindgen]`, `wasm32-unknown-unknown`

---

## Security
- **[HIGH]** User-supplied WASM modules executed without sandboxing → sandbox escape via WASI filesystem or network capabilities. Validate modules with `WebAssembly.validate()` and restrict WASI capabilities to the minimum required set.
- **[HIGH]** WASM linear memory directly accessible from JavaScript → JS can read and write all WASM heap memory including sensitive data. Keep secrets in WASM-side memory only when necessary, zero them after use, and never expose the raw `memory` export to untrusted JS.
- **[HIGH]** WASM module loaded from untrusted CDN without a Subresource Integrity hash → module swapped for malicious payload. Add `integrity="sha384-..."` to all `<script>` tags and `fetch` calls that load WASM.
- **[HIGH]** Secrets hardcoded in WASM binary → extractable via `wasm-decompile` or `wasm2wat`. Store secrets server-side and pass them as runtime parameters; never embed them in the binary.
- **[MEDIUM]** Cross-origin WASM loading without CORP/COEP headers when using `SharedArrayBuffer` → `SharedArrayBuffer` unavailable or cross-origin data leaks. Set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on all pages using shared memory.
- **[MEDIUM]** WASM module not validated with `WebAssembly.validate()` before instantiation → malformed module causes unhandled exception. Always validate untrusted WASM bytes before calling `WebAssembly.instantiate()`.

---

## Performance
- **[HIGH]** Large WASM binaries served without gzip or brotli compression → slow initial load on every visit. Enable brotli compression at the CDN/server level; a 1 MB WASM binary typically compresses to ~250 KB.
- **[HIGH]** JS–WASM boundary crossed too frequently in tight loops → per-call overhead accumulates to measurable latency. Batch work on the WASM side and exchange results in bulk; prefer passing typed arrays over individual calls.
- **[HIGH]** WASM binary not compiled with optimization (`-O3` / `wasm-opt -O3`) → 2–5× larger and slower than optimized output. Always run `wasm-opt -O3` as a post-build step and set `-C opt-level=3` in Rust/Zig builds.
- **[HIGH]** Not using `SharedArrayBuffer` and Web Workers for parallel WASM execution → single-threaded throughput ceiling. Use `wasm-bindgen-rayon` or manual worker pools for data-parallel workloads.
- **[MEDIUM]** WASM memory not pre-allocated → frequent `memory.grow` operations stall execution. Use `--initial-memory` / `INITIAL_MEMORY` flags to pre-allocate expected working set at startup.
- **[MEDIUM]** WASM instantiation performed on the main thread → blocks UI during parsing and compilation. Instantiate asynchronously via `WebAssembly.instantiateStreaming()` in a Worker and `postMessage` the exports back.

---

## Architecture
- **[HIGH]** Many small WASM→JS calls instead of batching work on the WASM side → call overhead dominates execution time. Design APIs that transfer bulk data (typed arrays, shared memory regions) rather than scalar values per call.
- **[HIGH]** WASM used for operations where JavaScript already performs adequately → added complexity without throughput gain. Reserve WASM for CPU-bound algorithms, codecs, parsers, and cryptography; profile before migrating.
- **[MEDIUM]** WASM module not cached via Service Worker → full re-download on every cold load. Cache the `.wasm` file with a content-hashed URL and serve from cache on repeat visits.
- **[LOW]** WASM binary not code-split → entire module loaded even when only a subset is needed. Use dynamic `import()` or lazy `WebAssembly.instantiateStreaming()` to defer loading of optional functionality.

---

## Code Quality
- **[HIGH]** Manual `malloc`/`free` in C/Emscripten WASM not tracked → heap corruption or leaks invisible to browser dev tools. Use ASAN (`-fsanitize=address`) during development and run `valgrind`-equivalent checks in CI.
- **[MEDIUM]** `wasm-bindgen` types not properly annotated with `#[wasm_bindgen]` → JS type coercion produces unexpected `undefined` or wrong values. Annotate all public FFI types and verify with `wasm-pack test --headless`.
- **[MEDIUM]** Not using `wasm-pack test` for browser-side WASM tests → logic tested only in native mode, missing WASM-specific bugs. Run `wasm-pack test --headless --chrome` in CI to catch binding and memory issues.
- **[LOW]** WASM binary not stripped of debug symbols for production → binary 3–10× larger than necessary. Use `wasm-strip` or `wasm-opt --strip-debug` in the production build pipeline.

---

## Common Bugs & Pitfalls
- **[HIGH]** Stack overflow in WASM (default 1 MB stack) → cryptic `unreachable` trap with no useful stack trace. Increase the stack via `-z stack-size` for recursive algorithms or rewrite as iterative with an explicit stack.
- **[HIGH]** `i64` values passed between WASM and JavaScript → JS `Number` can only represent 53-bit integers exactly, silently truncating larger values. Use `BigInt` on the JS side and `wasm-bindgen`'s `#[wasm_bindgen]` `i64` support.
- **[MEDIUM]** Pointer passed to JS becomes invalid after `memory.grow` detaches the underlying `ArrayBuffer` → stale typed array views cause silent reads of zeroed memory. Re-create JS views of WASM memory after every `memory.grow` operation.
- **[MEDIUM]** WASM function table not large enough for indirect function pointer calls → trap at runtime during `call_indirect`. Set `--table-base` / initial table size to cover all function pointer targets.
- **[LOW]** `WebAssembly.instantiateStreaming()` `await`ed incorrectly → race conditions accessing exports before the module is ready. Always `await` the full `instantiateStreaming()` promise before accessing `instance.exports`.
