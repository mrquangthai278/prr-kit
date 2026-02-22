# Sequelize — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `sequelize`, `from 'sequelize'`, `new Sequelize(`, `Model.findAll`, `Model.create`, `DataTypes.`, `sequelize.define`

---

## Security
- **[CRITICAL]** Raw queries via `sequelize.query(userInput)` or `sequelize.query(\`SELECT * WHERE id = ${userInput}\`)` without `replacements` or `bind` → SQL injection. Always use `replacements: [value]` (positional `?`) or `bind: { key: value }` (named `:key`) with `sequelize.query()`.
- **[HIGH]** Mass assignment via `Model.create(req.body)` or `Model.update(req.body, ...)` without a `fields` whitelist → attacker sets any column including `isAdmin`, `role`, or `createdAt`. Always pass `{ fields: ['allowedField1', 'allowedField2'] }` to limit which columns are written.
- **[HIGH]** `include` associations built from user-controlled strings → unintended related models loaded, exposing data beyond the intended query scope. Hardcode all `include` association references; never derive them from request input.
- **[MEDIUM]** Database connection string with credentials hardcoded in `config/database.js` or `config/config.json` → credentials committed to version control. Load all credentials from environment variables; add `config.json` with real values to `.gitignore`.
- **[MEDIUM]** `paranoid: false` override on queries that return soft-deleted records containing sensitive data → deleted records (e.g., removed users, cancelled orders) exposed to callers. Apply `paranoid: false` only in explicit admin/audit queries; document the intent clearly.

---

## Performance
- **[HIGH]** N+1 pattern — calling `findAll()` then `instance.getAssociation()` per row in a loop → one DB round-trip per row. Use `include: [{ model: Association }]` in the parent `findAll()` to eager-load in a single JOIN query.
- **[HIGH]** Missing `attributes: ['id', 'name']` on `findAll`/`findOne` calls → `SELECT *` fetches all columns, preventing covering-index use and sending unnecessary data. Always specify the minimal column list in `attributes`.
- **[HIGH]** `findAll()` called without `limit` on tables that may grow large → entire table loaded into Node.js heap, causing OOM on large datasets. Always include `limit` and `offset` (or cursor-based pagination) on list queries.
- **[MEDIUM]** `raw: true` not used for read-only reporting queries → Sequelize builds full Model instances with prototype methods, adding unnecessary overhead. Add `{ raw: true }` to queries that only read data and do not need Model instance methods.
- **[MEDIUM]** Multiple sequential model mutations not wrapped in a managed transaction → partial failure leaves DB in inconsistent state; no rollback occurs. Use `sequelize.transaction(async (t) => { ... })` for all multi-step write operations.
- **[MEDIUM]** `Op.in` not used for multi-value filters → individual queries fired in a loop instead of a single `WHERE id IN (...)`. Replace looped `findByPk` calls with a single `findAll({ where: { id: { [Op.in]: ids } } })`.
- **[LOW]** Not using `findAndCountAll` for paginated endpoints that also need a total count → two separate queries (findAll + count) issued when one suffices. Use `findAndCountAll({ limit, offset })` to get `rows` and `count` in one call.

---

## Architecture
- **[HIGH]** Business logic (calculations, validations, side effects) placed in Model class static or instance methods → logic is tightly coupled to the ORM and untestable without a DB. Move business logic to a service layer; keep Model methods as thin DB-access wrappers.
- **[HIGH]** Model associations (belongsTo, hasMany, etc.) not defined in model files → Sequelize JOIN/include queries fail at runtime with "association does not exist". Define all associations in model files and call them in a central `models/index.js` setup function.
- **[MEDIUM]** Sequelize migrations not used → schema managed with `sync({ alter: true })` or manual SQL, causing environment drift. Use `sequelize-cli` to generate and apply versioned migration files; commit them to the repository.
- **[MEDIUM]** Singleton Sequelize instance created inside a test helper that does not tear down after tests → connection pool keeps test process alive or bleeds state between test suites. Export the Sequelize instance and call `sequelize.close()` in an `afterAll` hook.
- **[MEDIUM]** Models defined inline in route files rather than in dedicated model files → model definitions scattered across the codebase, causing duplicate definitions and association conflicts. Define each model in `models/{ModelName}.js` and export from `models/index.js`.
- **[LOW]** Model files not organized by domain or feature → flat `models/` directory with 50+ files becomes hard to navigate. Group related models into subdirectories (`models/auth/`, `models/billing/`) with an index barrel.

---

## Code Quality
- **[HIGH]** Model `validate` option not defined on columns with domain constraints → invalid data (empty strings, out-of-range numbers) persists to DB without error. Add Sequelize validators (`isEmail`, `notEmpty`, `min`, `max`) on all columns with domain rules.
- **[MEDIUM]** Model hooks (`beforeCreate`, `afterUpdate`) performing external API calls or complex business logic → hooks are hard to trace, cannot be disabled for testing, and cause hidden side effects. Move side effects to the service layer; use hooks only for data transformations (e.g., hashing a password).
- **[MEDIUM]** `sequelize.sync({ force: true })` present in non-development code paths → drops and recreates all tables, destroying production data on restart. Remove `force: true` from all environments; use `{ alter: true }` only in development, and migrations in production.
- **[MEDIUM]** `Model.find()` (Sequelize v3 API) used in a v6 codebase → method does not exist in v6, causing a runtime `TypeError`. Replace with `Model.findOne()` and audit for other deprecated v3 APIs (`Model.findById` → `Model.findByPk`).
- **[LOW]** No TypeScript types via `sequelize-typescript` or manual attribute interfaces → `model.get('fieldName')` returns `any`, eliminating compile-time safety. Use `sequelize-typescript` decorators or define `ModelAttributes` interfaces and use typed getters.

---

## Common Bugs & Pitfalls
- **[HIGH]** `Model.create(req.body)` with no field filtering → mass assignment sets any column the attacker names in the request body. Always destructure and allowlist fields before passing to `create()` or use the `fields` option.
- **[HIGH]** Missing `await` on Sequelize promise-returning methods (`findAll`, `create`, `update`, `destroy`) → method returns a pending Promise; subsequent code operates on the Promise object, not the result. Add `await` to every Sequelize call inside an `async` function.
- **[MEDIUM]** Multiple associations of the same model without an `as` alias → Sequelize cannot distinguish them in `include`, producing "ambiguous alias" errors. Always provide `as: 'aliasName'` when the same model is associated more than once.
- **[MEDIUM]** `upsert()` return value interpreted inconsistently across databases → PostgreSQL returns `[instance, created]`; MySQL and SQLite may differ. Destructure `const [instance, created] = await Model.upsert(...)` and test behavior per DB dialect.
- **[MEDIUM]** `DATE` column stored in UTC but rendered in server's local timezone without explicit conversion → timestamps shift based on where the server runs. Use `DATEONLY` for dates without time, `DATE` for UTC datetimes, and always convert to user timezone in the presentation layer.
- **[LOW]** `findOrCreate` used in concurrent requests without a unique constraint → race condition causes duplicate rows when two requests reach `find` before either creates the record. Add a unique DB-level constraint so the second insert fails and is retried safely.

