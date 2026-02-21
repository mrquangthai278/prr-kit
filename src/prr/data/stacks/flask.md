# Flask — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from flask import`, `@app.route`, `Flask(__name__)`, `Blueprint`, `flask` in requirements.txt

---

## Security

- **[CRITICAL]** `render_template_string()` with user-controlled input → Server-Side Template Injection (SSTI). Never use with user data.
- **[CRITICAL]** SQL query with f-string / `.format()` of user input → SQL injection. Use parameterized queries.
- **[HIGH]** Missing `@login_required` / auth check on protected routes.
- **[HIGH]** `SECRET_KEY` hardcoded in app code → session forgery. Load from environment.
- **[HIGH]** `Markup()` used to mark user content as safe → XSS. Jinja2 escapes by default; don't bypass it.
- **[HIGH]** Debug mode enabled in production (`app.run(debug=True)`) → interactive debugger accessible to users, RCE risk.
- **[MEDIUM]** `send_file()` / `send_from_directory()` with user-controlled path → path traversal. Validate and sanitize paths.
- **[MEDIUM]** Missing CSRF protection (Flask-WTF or manual token) on state-changing forms.
- **[MEDIUM]** Allowing all origins in CORS configuration for APIs with auth.

---

## Performance

- **[HIGH]** Synchronous DB calls blocking Flask worker — use async frameworks (Quart) or offload to Celery.
- **[HIGH]** N+1 ORM queries in view function — load relations eagerly.
- **[MEDIUM]** `session` object used to store large data → stored in cookie, 4KB limit, sent on every request.
- **[MEDIUM]** No pagination on list endpoints.
- **[LOW]** Flask development server (`app.run()`) used in production instead of Gunicorn/uWSGI → single-threaded.

---

## Architecture

- **[HIGH]** All routes in single `app.py` → use Blueprints to organize by domain.
- **[MEDIUM]** Application factory pattern (`create_app()`) not used → hard to test with different configs.
- **[MEDIUM]** Business logic directly in route function → move to service/model layer.
- **[LOW]** `current_app` accessed outside application context → `RuntimeError`.

---

## Common Bugs & Pitfalls

- **[HIGH]** Mutable default in route function or SQLAlchemy model → shared state across requests.
- **[HIGH]** `g` object used to store request-scoped data but not cleaned up → leaks between requests in some WSGI setups.
- **[MEDIUM]** `redirect(request.referrer)` without validation → open redirect.
- **[MEDIUM]** `jsonify()` not used for JSON responses → missing Content-Type header.
