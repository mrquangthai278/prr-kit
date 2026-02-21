# Laravel — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.php` files, `artisan`, `Eloquent`, `routes/web.php`, `app/Http/Controllers`, `composer.json` with laravel/framework

---

## Security

- **[CRITICAL]** Raw DB query with user input: `DB::select("SELECT * WHERE id = $id")` → SQL injection. Use Eloquent or query builder with bindings.
- **[CRITICAL]** Missing CSRF token on POST/PUT/DELETE forms (`@csrf` blade directive) → CSRF attack.
- **[HIGH]** Missing `Auth::check()` / `auth()` middleware on protected routes → unauthenticated access.
- **[HIGH]** `{!! $variable !!}` in Blade with user-controlled content → XSS. Use `{{ }}` which auto-escapes.
- **[HIGH]** Mass assignment without `$fillable` or `$guarded` → attacker sets arbitrary model fields (e.g., `is_admin`).
- **[HIGH]** Secrets in `.env` committed or hardcoded in config → use `.env` + `.gitignore`.
- **[MEDIUM]** Authorization policy missing — `Gate::allows()` / Policy not checked before sensitive operation.
- **[MEDIUM]** `Storage::disk('public')` used for private files → files directly accessible via URL.

---

## Performance

- **[HIGH]** N+1 Eloquent queries — accessing relationship in loop without eager loading (`with()`).
- **[HIGH]** `Model::all()` on large tables without pagination → loads entire table.
- **[MEDIUM]** Missing database indexes on columns used in `where()`, `orderBy()`, `join()`.
- **[MEDIUM]** `count()` on Eloquent collection (`$collection->count()`) after loading vs `Model::count()` DB query.
- **[MEDIUM]** Missing `chunk()` for large dataset operations → memory exhaustion.
- **[LOW]** No query result caching for expensive, stable reads (Laravel Cache).

---

## Architecture

- **[HIGH]** Business logic in Controller → move to Service classes or Action classes.
- **[HIGH]** Direct Eloquent queries in Controller bypassing Repository/Service layer.
- **[MEDIUM]** Fat Eloquent models (>500 lines) violating SRP → extract traits or services.
- **[MEDIUM]** Event/Listener used for critical synchronous business logic → timing and error handling become opaque.
- **[LOW]** Missing Form Request classes for complex validation → validation logic inline in controller.

---

## Code Quality

- **[HIGH]** Missing validation before using `$request->input()` → unvalidated data in business logic.
- **[MEDIUM]** `dd()` / `dump()` left in code → debugging output in production.
- **[MEDIUM]** Hardcoded strings for status/type values instead of Enums (PHP 8.1+) or constants.
- **[LOW]** Missing resource classes for API responses → inconsistent JSON structure.

---

## Common Bugs & Pitfalls

- **[HIGH]** `firstOrCreate` / `updateOrCreate` not atomic → race condition in high-concurrency scenarios.
- **[HIGH]** Queue job not idempotent → retried jobs cause duplicate side effects.
- **[MEDIUM]** `Carbon` timezone not set → date comparison bugs in non-UTC deployments.
- **[MEDIUM]** Relationship `->get()` called instead of `->first()` → returns Collection when single model expected.
