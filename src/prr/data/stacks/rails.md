# Ruby on Rails — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.rb` files, `Gemfile` with rails, `ApplicationController`, `config/routes.rb`, `ActiveRecord`, `db/schema.rb`

---

## Security

- **[CRITICAL]** `raw()` / `html_safe` used on user-controlled content in ERB → XSS. Rails escapes by default; don't bypass.
- **[CRITICAL]** `ActiveRecord::Base.where("name = '#{params[:name]}'")` → SQL injection. Always use parameterized `where(name: params[:name])`.
- **[HIGH]** Missing `before_action :authenticate_user!` on protected controllers/actions.
- **[HIGH]** Mass assignment without `permit()`: `User.new(params[:user])` → attribute injection. Always use `params.require().permit()`.
- **[HIGH]** `send(params[:method])` — dynamic method dispatch with user input → arbitrary method invocation.
- **[MEDIUM]** Missing authorization check (Pundit/CanCanCan policy) — authentication ≠ authorization.
- **[MEDIUM]** `eval()` or `constantize` with user-controlled string → remote code execution.
- **[MEDIUM]** IDOR — `current_user.orders` not scoped: `Order.find(params[:id])` vs `current_user.orders.find(params[:id])`.

---

## Performance

- **[HIGH]** N+1 ActiveRecord queries — accessing association in loop without `includes()`, `preload()`, or `eager_load()`.
- **[HIGH]** `Model.all` without `.find_each` (batch) for large datasets → loads all records into memory.
- **[MEDIUM]** Missing database index on frequently queried columns.
- **[MEDIUM]** Synchronous external API calls in controller/model → blocks Puma thread. Use ActiveJob.
- **[MEDIUM]** Missing `counter_cache` for association counts accessed frequently.
- **[LOW]** `select('*')` when only specific columns needed → unnecessary data transfer.

---

## Architecture

- **[HIGH]** Business logic in controller → move to service objects, model methods, or concerns.
- **[HIGH]** Fat model (>500 lines) → extract concerns, service objects, or value objects.
- **[MEDIUM]** ActiveRecord callback (`after_create`, `after_save`) for critical business logic → hard to test, unpredictable execution.
- **[MEDIUM]** Direct model access in view → move to presenter/decorator pattern.
- **[LOW]** Missing namespaced routes for API versioning.

---

## Common Bugs & Pitfalls

- **[HIGH]** `save` vs `save!` — `save` silently returns false on validation failure. Use `save!` or check return value.
- **[HIGH]** ActiveRecord callback not running because `update_column` bypasses callbacks and validations.
- **[MEDIUM]** `Time.now` instead of `Time.zone.now` in Rails → timezone bugs.
- **[MEDIUM]** `destroy_all` in migration without background job for large tables → table lock, downtime.
- **[LOW]** Missing `dependent: :destroy` on `has_many` → orphaned records accumulate.
