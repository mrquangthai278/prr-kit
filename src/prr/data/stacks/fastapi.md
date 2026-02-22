# FastAPI — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from fastapi`, `@app.get`, `@app.post`, `@router.`, `Depends(`, `BaseModel` (pydantic), `uvicorn`, `@asynccontextmanager`, `lifespan`

---

## Security

- **[CRITICAL]** Route missing `Depends(get_current_user)` on protected endpoints → unauthenticated access.
- **[CRITICAL]** SQL built with f-string/`.format()` with user data → injection. Use parameterized queries.
- **[CRITICAL]** `eval()` / `exec()` with user-controlled input in any route or utility.
- **[HIGH]** ORM model returned directly instead of Pydantic response schema → exposes passwords, internal IDs.
- **[HIGH]** Missing `response_model` on endpoints → no output filtering, arbitrary data returned.
- **[HIGH]** `allow_origins=["*"]` in production CORS config → any website makes credentialed requests.
- **[HIGH]** Secrets loaded with `os.getenv("SECRET")` returning `None` silently → app runs without secrets.
- **[HIGH]** File upload missing MIME type + size validation → arbitrary file upload.
- **[HIGH]** Missing `HTTPSRedirectMiddleware` in production → tokens/cookies sent over HTTP.
- **[HIGH]** JWT token not validated for expiry/signature in `get_current_user` dependency.
- **[HIGH]** User-supplied `redirect_uri` in OAuth flow not validated → open redirect.
- **[MEDIUM]** Missing rate limiting on auth endpoints → brute force on login.
- **[MEDIUM]** `background_tasks.add_task()` running with request-scoped DB session that closes → session closed before task runs.
- **[LOW]** OpenAPI docs (`/docs`, `/redoc`) accessible in production without auth → schema exposed.

---

## Performance

- **[HIGH]** Synchronous I/O (`requests.get()`, blocking DB calls) inside `async def` route → blocks event loop. Use `httpx.AsyncClient`, async ORM.
- **[HIGH]** N+1 ORM queries — loading relationships in loop. Use `selectinload`/`joinedload` with SQLAlchemy async.
- **[HIGH]** Missing `async` on database session operations with async SQLAlchemy → sync in async context.
- **[HIGH]** `await` inside `for` loop → sequential DB calls; batch with `asyncio.gather()`.
- **[HIGH]** Missing pagination on list endpoints → unbounded query.
- **[HIGH]** Sync function passed to `run_in_executor` without proper thread pool → blocking thread pool worker.
- **[MEDIUM]** `background_tasks` used for critical path work → fires and forgets, no error handling.
- **[MEDIUM]** Pydantic v1 `orm_mode` / v2 `from_attributes` missing → ORM objects not serializable.
- **[MEDIUM]** DB connection not pooled → new connection per request.
- **[MEDIUM]** Not using `ORJSONResponse` for large JSON payloads → default `JSONResponse` slower.
- **[LOW]** Multiple middleware layers running on every request including static assets.
- **[LOW]** `@lru_cache` on dependency returning DB session → sessions shared across requests.

---

## Architecture

- **[HIGH]** Business logic inside route function → delegate to service/repository layer.
- **[HIGH]** DB session directly in route (`db: Session = Depends(get_db)`) without proper lifecycle.
- **[HIGH]** Not using `APIRouter` per domain → everything in `main.py` → unmaintainable.
- **[HIGH]** No dependency injection for services → hardcoded globals, not testable.
- **[MEDIUM]** Missing `lifespan` context manager → using deprecated `@app.on_event("startup")`.
- **[MEDIUM]** Pydantic validators with side effects (DB queries in validators) → validators should be pure.
- **[MEDIUM]** Not using `@asynccontextmanager` for resource management in dependencies.
- **[MEDIUM]** Error handling missing global `@app.exception_handler` → default 500 for all errors.
- **[MEDIUM]** Not using `HTTPException` with proper status codes → all errors return 200 or 500.
- **[LOW]** Missing `tags`, `summary`, `description` on routers → poor OpenAPI docs.
- **[LOW]** Schema inheritance >2 levels deep → confusing field origins.

---

## Code Quality

- **[HIGH]** Missing type annotations on route parameters → FastAPI cannot parse/validate.
- **[HIGH]** `except Exception` swallowing errors in route handlers.
- **[HIGH]** Pydantic `field_validator` (v2) not raising `ValueError` → validation silently ignored.
- **[MEDIUM]** `Optional[str]` vs `str | None` inconsistency (pick one per Python version).
- **[MEDIUM]** `Query(None)` for optional params not using `Annotated` style (modern FastAPI).
- **[MEDIUM]** Not using `Annotated[str, Query(min_length=1)]` for reusable param validation.
- **[MEDIUM]** Status codes not semantically correct (201 for create, 204 for delete, etc.).
- **[MEDIUM]** Missing `response_description` on endpoints → OpenAPI shows no response info.
- **[LOW]** `Path()` / `Query()` missing `description` → undocumented parameters.
- **[LOW]** Not using `model_config = ConfigDict(str_strip_whitespace=True)` on input models.

---

## Common Bugs & Pitfalls

- **[HIGH]** Mutable default in Pydantic model (`field: list = []`) → shared across all instances.
- **[HIGH]** Async generator dependency not properly closed on exception → DB session leak.
- **[HIGH]** `HTTPException` raised inside `background_tasks` → silently swallowed, client got 200 already.
- **[HIGH]** Route handler `async def` but calling sync-heavy function without `asyncio.to_thread()` → event loop blocked.
- **[HIGH]** Pydantic v1 and v2 mixed in same project → validation behavior differences cause bugs.
- **[MEDIUM]** `Form()` and `Body()` used together → FastAPI doesn't support mixing form + JSON.
- **[MEDIUM]** `status_code=200` on POST creating resource → should be 201.
- **[MEDIUM]** Dependency exception not propagating correctly when dependency raises inside generator after `yield`.
- **[MEDIUM]** `PATCH` handler using `PUT` semantics (replacing entire object instead of partial update).
- **[MEDIUM]** Not using `model.model_dump(exclude_unset=True)` for PATCH → overwriting unset fields with defaults.
- **[LOW]** Not pinning pydantic version → v1/v2 breaking changes.
- **[LOW]** `uvicorn --reload` used in production → file watcher overhead.
