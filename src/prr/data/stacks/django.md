# Django — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from django`, `models.Model`, `views.py`, `urls.py`, `settings.py`, `manage.py`, `INSTALLED_APPS`

---

## Security

- **[CRITICAL]** Raw SQL via `raw()` or `cursor.execute()` with string formatting of user input → SQL injection. Use `%s` parameterized or ORM.
- **[CRITICAL]** `mark_safe()` used on user-controlled content → XSS. Only use on strings you fully control.
- **[HIGH]** Missing `@login_required` or permission check on views → unauthenticated access.
- **[HIGH]** Missing CSRF protection — `@csrf_exempt` used without justification on state-changing endpoints.
- **[HIGH]** `DEBUG = True` in production settings or settings not split by environment.
- **[HIGH]** `SECRET_KEY` hardcoded in `settings.py` → exposed in version control. Use `os.environ`.
- **[HIGH]** `ALLOWED_HOSTS = ['*']` in production → HTTP Host header attack.
- **[MEDIUM]** Missing `HttpOnly` / `Secure` / `SameSite` flags on session cookie settings.
- **[MEDIUM]** User-uploaded files served from `MEDIA_ROOT` without content-type validation → stored malicious files.
- **[MEDIUM]** Object-level permission not checked — `get_object_or_404` used but no ownership verification → IDOR.

---

## Performance

- **[CRITICAL]** N+1 ORM queries — accessing related objects in a loop without `select_related()` or `prefetch_related()`.
- **[HIGH]** `QuerySet.all()` used when a filtered queryset is needed → loads entire table.
- **[HIGH]** Missing database indexes on frequently filtered fields (`db_index=True` or `Meta: indexes`).
- **[HIGH]** Counting with `len(queryset)` instead of `queryset.count()` → loads all records into memory.
- **[MEDIUM]** Missing pagination on list views (ListView or DRF ListAPIView without `pagination_class`).
- **[MEDIUM]** Synchronous external API calls in view → blocks Django worker. Use Celery for async tasks.
- **[MEDIUM]** Missing `only()` / `defer()` on queries that don't need all fields → unnecessary data transfer.
- **[LOW]** Not using `values()` / `values_list()` when ORM model instance overhead is unnecessary.

---

## Architecture

- **[HIGH]** Business logic in views or templates → move to model methods, managers, or service layer.
- **[HIGH]** Fat models with >500 lines → split domain logic into separate service classes or managers.
- **[MEDIUM]** Missing `related_name` on ForeignKey/ManyToMany → reverse accessor is `<model>_set`, confusing.
- **[MEDIUM]** Signals used for critical business logic → hard to trace, test, debug. Prefer explicit calls.
- **[MEDIUM]** Direct `settings` import in reusable apps → use `AppConfig` or django-appconf instead.
- **[MEDIUM]** Missing migration for model change → `makemigrations` not run, production schema drift.
- **[LOW]** Not using Django's `AbstractBaseUser` when customizing auth → migration headaches later.

---

## Code Quality

- **[HIGH]** Missing `__str__` on Model → `<Model object (1)>` in admin and logs.
- **[MEDIUM]** Using `get_or_create` without checking `created` flag → ignores whether object was newly created.
- **[MEDIUM]** `filter().get()` instead of `get()` → unnecessary extra query.
- **[MEDIUM]** Hardcoded URLs in templates/views instead of `{% url %}` tag or `reverse()`.
- **[LOW]** Missing `verbose_name` / `verbose_name_plural` on models → ugly admin interface.
- **[LOW]** Missing `app_name` in `urls.py` → namespace conflicts in `{% url %}` tags.

---

## Common Bugs & Pitfalls

- **[HIGH]** Queryset used as default argument (`def fn(qs=Model.objects.all())`) → evaluated once at definition time, stale data.
- **[HIGH]** Transaction not used around multiple related DB writes → partial failure leaves inconsistent state.
- **[MEDIUM]** `update()` bypasses model `save()` and signals → hooks not triggered.
- **[MEDIUM]** `delete()` on queryset bypasses model `delete()` and `post_delete` signals.
- **[MEDIUM]** Timezone-naive `datetime.now()` instead of `timezone.now()` → bugs in non-UTC deployments.
- **[LOW]** `null=True` on CharField/TextField → two "empty" values (empty string + NULL), use `blank=True` only.
