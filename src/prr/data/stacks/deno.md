# Deno — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `deno.json` / `deno.jsonc` · `deno.lock` · `Deno.` namespace usage · `import_map.json` · `jsr:` / `npm:` / `https://` import specifiers · `deno run` scripts

---

## Security

- **[CRITICAL]** Running with `--allow-all` (or `-A`) flag → defeats Deno's permission model entirely. Grant only the minimum required permissions (`--allow-net=api.example.com`, `--allow-read=./data`).
- **[HIGH]** `--allow-run` without specifying allowed commands → grants permission to execute any process. Restrict with `--allow-run=git,node` allowlist.
- **[HIGH]** Dynamic `import()` from a user-controlled URL or string → arbitrary code execution. Never construct import URLs from external input.
- **[MEDIUM]** `--allow-net` without domain restriction → can connect to any host. Restrict to required domains.
- **[MEDIUM]** `--allow-env` without variable allowlist → exposes all environment variables including secrets to the script. Use `--allow-env=SPECIFIC_VAR`.

---

## Performance

- **[HIGH]** `Deno.readFileSync` / `Deno.writeFileSync` on large files in an async context → blocks the event loop. Use async `await Deno.readFile()` / `Deno.writeFile()`.
- **[MEDIUM]** `for await ... of` on `Deno.readDir` without early exit → iterates entire directory. Break early when target is found.
- **[LOW]** Not using Deno's native `Deno.serve()` (Deno 1.35+) → older `serve()` from `std/http` has more overhead. Prefer the native API for new code.

---

## Architecture

- **[HIGH]** Node.js `require()` used without `npm:` specifier → `require` is not available in Deno by default. Use `import` with `npm:package-name` or `jsr:@scope/package`.
- **[HIGH]** Dependencies imported from raw `https://` URLs without version pinning → non-reproducible builds; upstream URL changes silently break code. Use `jsr:` or `npm:` specifiers with versions.
- **[MEDIUM]** `deno.lock` file not committed to version control → dependency versions not reproducible across environments. Commit the lockfile.
- **[MEDIUM]** Permissions requested at CLI level too broadly for a library → libraries should not prescribe permissions; they should document what permissions callers must grant.

---

## Code Quality

- **[HIGH]** `// @ts-nocheck` or `any` type used extensively → Deno enforces strict TypeScript by default; suppressing type checking defeats the safety guarantee.
- **[MEDIUM]** `Deno.env.get("VAR")` result used without null check → returns `undefined` for missing variables. Always validate or use a default: `Deno.env.get("PORT") ?? "8000"`.
- **[LOW]** `import * as foo from "module"` when only one or two exports are needed → increases bundle size in compiled output. Use named imports.

---

## Common Bugs & Pitfalls

- **[HIGH]** Network request attempted without `--allow-net` → `Deno.errors.PermissionDenied` thrown at runtime, not at startup. Test with the exact set of permissions you intend to deploy with.
- **[HIGH]** Top-level `await` in a module imported by many others → delays the entire import chain. Use `await` inside functions or limit top-level `await` to entry points.
- **[MEDIUM]** `import 'https://deno.land/...'` from the Deno third-party module registry → `deno.land/x` is no longer receiving new modules; prefer `jsr:` for new dependencies.
- **[MEDIUM]** `Deno.cwd()` used to construct file paths → returns the working directory at runtime, which may differ from the script's location. Use `import.meta.url` + `new URL('./file', import.meta.url).pathname` for script-relative paths.
- **[LOW]** `Deno.exit()` called in a library function → terminates the entire process; callers cannot handle the error. Throw an error instead.
