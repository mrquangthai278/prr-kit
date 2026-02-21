# Elixir / Phoenix — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.ex` / `*.exs` files · `mix.exs` · `defmodule` · `use Phoenix.` · `Repo.` · `Ecto.` · `defp` · `%{}` struct patterns

---

## Security

- **[HIGH]** Raw SQL in Ecto: `Repo.query("SELECT * FROM users WHERE id = #{id}")` → SQL injection. Use `Ecto.Query` DSL or parameterized queries: `from(u in User, where: u.id == ^id)`.
- **[HIGH]** `Phoenix.Token.verify` called without `max_age` option → tokens never expire. Always pass `max_age:` (e.g., 86400 seconds = 1 day).
- **[HIGH]** `String.to_atom(user_input)` → atoms are never garbage collected; exhausting the atom table crashes the BEAM VM (DoS). Use `String.to_existing_atom/1` or keep as a string.
- **[MEDIUM]** Missing CSRF protection on non-GET, non-API endpoints → Phoenix includes `Plug.CSRFProtection` by default; ensure it's not removed from the pipeline.
- **[MEDIUM]** Mass assignment: `User.changeset(user, params)` without a field allowlist in the changeset → any client-supplied field (e.g., `role`, `admin`) gets set. Always use `cast/3` with explicit allowed fields.

---

## Performance

- **[HIGH]** N+1 query in Ecto: loading associations inside an `Enum.map` loop → generates N additional queries. Use `Repo.preload/2` or add `:preload` to the initial query.
- **[HIGH]** `Enum` functions on a large `Stream` that could be composed → `Enum.filter |> Enum.map` creates an intermediate list. Chain `Stream.filter |> Stream.map |> Enum.to_list` for lazy evaluation.
- **[MEDIUM]** `GenServer` using synchronous `call` for all operations including fire-and-forget mutations → serializes all operations through one process. Use `cast` for operations that don't need a return value.
- **[MEDIUM]** `Repo.all` without pagination on a potentially large table → memory spike and slow response. Use `Repo.paginate` or `limit/offset` in the query.
- **[LOW]** Pattern matching on entire map `%{field: val} = large_map` when only one field is needed → still works but is misleading; be explicit about what you're matching.

---

## Architecture

- **[HIGH]** Business logic in Phoenix controller action → extract to a Context module (boundary pattern). Controllers should only translate HTTP ↔ context function calls.
- **[HIGH]** Process state stored in `Agent` or `GenServer` without a persistence strategy → state is lost on process crash or node restart. Persist critical state to the database.
- **[MEDIUM]** `Task.async` without a supervisor → unlinked task crash is not propagated to the caller; use `Task.Supervisor` for resilient async work.
- **[MEDIUM]** Long-lived `GenServer` that receives unbounded messages without backpressure → mailbox grows indefinitely under load. Use `GenStage` or rate limiting.
- **[LOW]** `use GenServer` for simple key-value storage → consider `ETS` (Erlang Term Storage) for concurrent read-heavy in-memory state.

---

## Code Quality

- **[HIGH]** `with` expression without an `else` clause → if any clause returns a non-`{:ok, _}` value, it falls through as the return value of the `with` block. Always add `else` to handle errors explicitly.
- **[MEDIUM]** Large `case` expression where pattern-matched function clauses would be idiomatic → Elixir's pattern matching on function heads is cleaner than `case` for multiple conditions.
- **[MEDIUM]** `IO.inspect` / `IO.puts` debug statements left in production code → remove before merge. Use `Logger` for structured logging.
- **[LOW]** Not using `@spec` on public functions → poor documentation, no Dialyzer type checking benefit.

---

## Common Bugs & Pitfalls

- **[HIGH]** `Repo` operations outside a transaction when multiple operations must be atomic → partial write on failure leaves data inconsistent. Use `Repo.transaction/1` or `Ecto.Multi`.
- **[HIGH]** Calling `Repo.update_all` / `Repo.delete_all` without a `where` clause → modifies or deletes all rows in the table. Always include a `where` condition.
- **[MEDIUM]** `Map.get(map, key)` returns `nil` for missing keys, not an error → if the key is required, use `Map.fetch!(map, key)` which raises `KeyError` on missing key.
- **[MEDIUM]** Atom comparison vs string comparison: `"active" == :active` is always `false` → be consistent with atom vs string types for status/enum fields. Ecto enums use atoms; JSON payloads use strings.
- **[LOW]** `Enum.first(list)` returning `nil` for empty list treated as a valid value → check for `nil` or use pattern matching on the result.
