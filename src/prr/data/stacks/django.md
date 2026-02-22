# Django — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from django`, `models.Model`, `views.py`, `urls.py`, `settings.py`, `manage.py`, `INSTALLED_APPS`, DRF `serializers.py`, `djangorestframework`

---

## Security

- **[CRITICAL]** Raw SQL via `raw()` or `cursor.execute()` with string formatting → SQL injection. Use `%s` parameterized or ORM.
- **[CRITICAL]** `mark_safe()` on user-controlled content → XSS. Only use on strings you fully control.
- **[CRITICAL]** `DEBUG = True` in production → detailed error pages with source code exposed.
- **[CRITICAL]** `SECRET_KEY` hardcoded in `settings.py` → version control exposure. Use `os.environ.get()` or `django-environ`.
- **[HIGH]** Missing `@login_required` or DRF `permission_classes` → unauthenticated access.
- **[HIGH]** `@csrf_exempt` without justification on state-changing endpoints.
- **[HIGH]** `ALLOWED_HOSTS = ['*']` in production → HTTP Host header injection.
- **[HIGH]** Object-level permission not checked → `get_object_or_404` without ownership verification → IDOR.
- **[HIGH]** Missing `is_staff`/`is_superuser` check on admin-equivalent views.
- **[HIGH]** File upload without content-type validation → execute malicious file via misconfigured server.
- **[HIGH]** Open redirect via unvalidated `next` parameter in login views.
- **[MEDIUM]** Missing `HttpOnly`/`Secure`/`SameSite` flags on session cookie (`SESSION_COOKIE_*` settings).
- **[MEDIUM]** `MEDIA_ROOT` served by Django in production → should be served by Nginx/CDN with correct content-type.
- **[MEDIUM]** DRF `TokenAuthentication` over HTTP → tokens transmitted in plaintext. Enforce HTTPS.
- **[LOW]** Django admin accessible at default `/admin/` path in production → known attack target; change with custom URL.

---

## Performance

- **[CRITICAL]** N+1 ORM queries — accessing related objects in loop without `select_related()` or `prefetch_related()`.
- **[HIGH]** `QuerySet.all()` without filtering → loads entire table.
- **[HIGH]** Missing database indexes on frequently filtered/ordered fields (`db_index=True` or `Meta.indexes`).
- **[HIGH]** `len(queryset)` instead of `queryset.count()` → loads all records into memory.
- **[HIGH]** Synchronous external API calls in view → blocks Django worker. Use Celery for async work.
- **[HIGH]** DRF serializer with `many=True` on unfiltered QuerySet → serializing entire table.
- **[HIGH]** Missing Celery/task queue for email sending, image processing in request-response cycle.
- **[MEDIUM]** Missing pagination on list views (ListView or DRF `pagination_class`).
- **[MEDIUM]** Missing `only()` / `defer()` on queries that don't need all fields → SELECT *.
- **[MEDIUM]** `values()` / `values_list()` not used for read-only aggregation → full ORM overhead.
- **[MEDIUM]** QuerySet not cached via `django.core.cache` for expensive repeated reads.
- **[MEDIUM]** Database queries in template rendering (lazy ORM evaluation).
- **[LOW]** `annotate()` not used for counting related objects → N+1 Python-side counting.
- **[LOW]** Not using `bulk_create()` / `bulk_update()` for batch DB operations.

---

## Architecture

- **[HIGH]** Business logic in views or templates → move to model methods, managers, or service layer.
- **[HIGH]** Fat models >500 lines → split into service classes or managers.
- **[HIGH]** Django signals used for critical business logic → hard to trace, test. Prefer explicit service calls.
- **[HIGH]** Not using `AbstractBaseUser` for custom auth → `AUTH_USER_MODEL` migration headaches later.
- **[HIGH]** `settings.py` not split by environment (base/dev/prod) → debug settings leaked to production.
- **[MEDIUM]** Missing `related_name` on FK/M2M → reverse accessor is `<model>_set`, confusing.
- **[MEDIUM]** Direct `settings` import in reusable apps → use `AppConfig`.
- **[MEDIUM]** Missing migration for model change → `makemigrations` not run, production schema drift.
- **[MEDIUM]** DRF `ModelSerializer` used with `fields = '__all__'` → over-exposing fields.
- **[MEDIUM]** DRF view doing too much (validation + business logic + serialization) → extract to service.
- **[LOW]** Not using Django's `AbstractModel` for common fields (created_at, updated_at).
- **[LOW]** App-level URLs not included in project `urls.py` via `include()`.

---

## Code Quality

- **[HIGH]** Missing `__str__` on Model → `<Model object (1)>` in admin and logs.
- **[HIGH]** Missing `Meta.ordering` on models used in list views → non-deterministic order.
- **[HIGH]** DRF serializer `validate_<field>` not raising `serializers.ValidationError` → validation silently ignored.
- **[MEDIUM]** `get_or_create` without checking `created` flag → unaware if object was newly created.
- **[MEDIUM]** `filter().get()` instead of `get()` → extra unnecessary query.
- **[MEDIUM]** Hardcoded URLs in templates/views instead of `{% url %}` or `reverse()`.
- **[MEDIUM]** Not using `get_object_or_404` in views → raw `Model.objects.get()` raises 500 on miss.
- **[MEDIUM]** `null=True` on `CharField`/`TextField` → two empty values (empty string + NULL). Use `blank=True` only.
- **[MEDIUM]** DRF not using `@action` decorator for custom actions → awkward URL patterns.
- **[LOW]** Missing `verbose_name`/`verbose_name_plural` on models → ugly admin.
- **[LOW]** Missing `app_name` in `urls.py` → namespace conflicts.

---

## Common Bugs & Pitfalls

- **[HIGH]** QuerySet as default argument (`def fn(qs=Model.objects.all())`) → evaluated once at definition, stale data.
- **[HIGH]** Transaction not used around multiple related DB writes → partial failure leaves inconsistent state.
- **[HIGH]** `update()` on QuerySet bypasses `save()` and signals → `pre_save`/`post_save` not triggered.
- **[HIGH]** `delete()` on QuerySet bypasses model `delete()` and `post_delete` signals.
- **[HIGH]** `request.user` accessed in model or service layer → breaking separation of concerns and testability.
- **[MEDIUM]** Timezone-naive `datetime.now()` instead of `timezone.now()` → bugs in non-UTC deployments.
- **[MEDIUM]** `get_or_create` in concurrent requests → race condition, unique constraint violations.
- **[MEDIUM]** Signal `sender` not specified → signal fires for all models of that event.
- **[MEDIUM]** Migration squashing not done → extremely slow migration history.
- **[LOW]** `on_delete=models.CASCADE` default assumed without considering orphan behavior.
- **[LOW]** `choices` on CharField not enforced at DB level → only validated in forms/serializers.
