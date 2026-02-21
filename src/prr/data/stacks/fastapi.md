# FastAPI — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from fastapi`, `@app.get`, `@app.post`, `@router.`, `Depends(`, `BaseModel` (pydantic), `uvicorn`

---

## Security

- **[CRITICAL]** Route missing authentication dependency (`Depends(get_current_user)`) → unauthenticated access to protected resources.
- **[CRITICAL]** SQL query built with f-string or `.format()` with user data → SQL injection. Use parameterized queries with SQLAlchemy or asyncpg.
- **[HIGH]** Returning ORM model directly (SQLAlchemy model as response) instead of Pydantic response schema → exposes all fields including sensitive ones (hashed passwords, internal IDs).
- **[HIGH]** Missing `response_model` on endpoints → arbitrary data can be returned, no output filtering.
- **[HIGH]** CORS configured with `allow_origins=["*"]` in production → any website can make credentialed requests.
- **[HIGH]** Secrets loaded from environment without validation (`os.getenv("SECRET")` returning None silently).
- **[MEDIUM]** Missing rate limiting on auth endpoints → brute force on login.
- **[MEDIUM]** File upload endpoint missing file type/size validation → arbitrary file upload.
- **[MEDIUM]** Missing `HTTPSRedirectMiddleware` in production → credentials sent over HTTP.

---

## Performance

- **[HIGH]** Synchronous I/O operations (`requests.get()`, blocking DB calls) inside async route handler → blocks the event loop, cancels FastAPI's concurrency benefit. Use `asyncio`, `httpx.AsyncClient`, async ORM.
- **[HIGH]** N+1 ORM queries — loading relationships in a loop. Use `selectinload` / `joinedload` with SQLAlchemy async.
- **[HIGH]** Missing `async` on database session operations when using async SQLAlchemy.
- **[MEDIUM]** No pagination on list endpoints (missing `skip`/`limit` or cursor) → unbounded query.
- **[MEDIUM]** Missing `background_tasks` for non-critical work (sending emails, logging) → inflates response time.
- **[MEDIUM]** Pydantic model with `orm_mode = True` (v1) or `model_config = ConfigDict(from_attributes=True)` (v2) missing → ORM objects not serializable.
- **[LOW]** Not using `response_class=ORJSONResponse` for large JSON responses → slower serialization with default JSON.

---

## Architecture

- **[HIGH]** Business logic inside route function → routes should delegate to service/repository layer. Hard to test and reuse.
- **[HIGH]** Direct database session (`db: Session`) in route without dependency injection → no session lifecycle management.
- **[MEDIUM]** All routes in single `main.py` → organize into routers per domain (`APIRouter`).
- **[MEDIUM]** Missing `lifespan` context manager for startup/shutdown (DB init, connection pools) → using deprecated `@app.on_event`.
- **[MEDIUM]** Pydantic validators doing side effects (DB queries in validators) → validators should be pure.
- **[LOW]** Missing `tags` and `summary` on route decorators → poor auto-generated OpenAPI docs.
- **[LOW]** Schema inheritance overused → Pydantic model hierarchy more than 2 levels deep, confusing field origins.

---

## Code Quality

- **[HIGH]** Missing type annotations on route parameters → FastAPI cannot parse/validate automatically.
- **[HIGH]** Exception handler not returning `JSONResponse` with proper status code → default 500 for all errors.
- **[MEDIUM]** `Optional[str]` instead of `str | None` (Python 3.10+) → older style but functionally equivalent; pick one convention.
- **[MEDIUM]** Pydantic `validator` (v1) or `field_validator` (v2) not raising `ValueError` → validation silently ignored.
- **[LOW]** Missing `description` on `Query()` / `Path()` / `Body()` parameters → undocumented API.
- **[LOW]** Not using `Annotated` style for dependency injection (modern FastAPI style).

---

## Common Bugs & Pitfalls

- **[HIGH]** Mutable default argument in Pydantic model or function (`field: list = []`) → shared across all instances/calls.
- **[HIGH]** Async generator dependency not properly closed → DB session leak on exception.
- **[MEDIUM]** `HTTPException` raised inside background task → silently swallowed, client already received 200.
- **[MEDIUM]** `status_code=200` on `POST` endpoint that creates a resource → should be `201`.
- **[MEDIUM]** `Form()` and `Body()` used together → FastAPI doesn't support mixing form data and JSON body.
- **[LOW]** Not pinning `pydantic` version (v1 vs v2 breaking changes) in `requirements.txt`.
