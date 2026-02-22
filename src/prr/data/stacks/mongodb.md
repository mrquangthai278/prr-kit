# MongoDB — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: mongoose, mongodb npm package, MongoClient, Schema, Model, .find(), .aggregate(), .populate(), MONGO_URI, mongodb+srv://, .model(

---

## Security

- **[CRITICAL]** Query operator injection — user object passed directly into a query (e.g. `Model.find({ username: req.body.username })` where the value is `{ : "" }`) → all documents are returned, bypassing authentication. Sanitise with `express-mongo-sanitize` or validate that every user-supplied field is a primitive type before use.
- **[CRITICAL]** `` clause with user-controlled input → server-side JavaScript injection (SSJI) executes arbitrary code inside MongoDB. Disable JavaScript execution entirely with `security.javascriptEnabled: false` in `mongod.conf`.
- **[CRITICAL]** MongoDB connection string with credentials stored in source code or committed to version control → credential exposure; rotate immediately and use environment variables (`MONGO_URI`) loaded at runtime.
- **[HIGH]** Returning full documents including sensitive fields (`password`, `token`, `ssn`) from API routes → over-exposure of sensitive data. Always apply `.select("-password -token")` or a projection object to strip sensitive fields before sending the response.
- **[HIGH]** Missing authentication on the MongoDB connection in production → any host that can reach the MongoDB port can read and write all data. Enable auth, create a dedicated application user with least-privilege roles, and use TLS.
- **[HIGH]** Atlas network access rule set to `0.0.0.0/0` (Allow from Anywhere) → database is accessible from the entire internet. Restrict the IP allow-list to your application server IPs or VPC CIDR only.
- **[HIGH]** `` pipeline stage with a user-controlled `from` field (collection name) → arbitrary collection data can be exfiltrated. Validate and whitelist the collection name against a fixed set before constructing the pipeline.
- **[MEDIUM]** Missing Mongoose schema validation (no `type`, `required`, or `enum` constraints) → arbitrary fields are stored and type errors go undetected until runtime. Define strict schemas with proper validators for all fields.
- **[MEDIUM]** `findOne({ email })` without checking whether `email` is `undefined` → returns the first document in the collection when the field is undefined, granting access to the wrong user. Validate that query fields are defined and non-null before executing the query.
- **[MEDIUM]** Not using `.lean()` for read-only operations → Mongoose document objects expose prototype methods that can be a vector for prototype pollution if the result is spread into user-controlled structures. Use `.lean()` for read paths that do not need Mongoose methods.
- **[LOW]** Verbose MongoDB error messages forwarded to API responses → collection names, field names, and index names are revealed to the client, aiding enumeration. Catch all database errors and return sanitised, generic error messages.

---

## Performance

- **[CRITICAL]** Missing index on frequently queried fields → MongoDB performs a full collection scan O(n) on every query, causing response times that degrade linearly with data growth. Add indexes via `schema.index()` or the `@@index` decorator and verify with `.explain()`.
- **[CRITICAL]** `find().toArray()` (or `.find({})` without `.limit()`) on a large collection → the entire collection is loaded into application memory, causing OOM crashes. Always append `.limit(n)` and implement cursor-based or offset pagination.
- **[HIGH]** `` stage not placed at the beginning of an aggregation pipeline → MongoDB processes all documents through earlier stages before filtering, massively increasing work. Move `` as early as possible so indexes can be used.
- **[HIGH]** N+1 query pattern — `.populate()` called on each item in a loop or nested inside a `.map()` → one query fires per document. Call `.populate()` on the parent query directly or use a single `` aggregation stage.
- **[HIGH]** Missing compound index for multi-field queries (e.g. `{ userId: 1, createdAt: -1 }`) → MongoDB cannot use a single-field index for a combined filter-plus-sort, causing a full scan. Add compound indexes that match the query's equality fields followed by range/sort fields.
- **[HIGH]** Using `` with non-indexed fields → each branch of `` triggers a separate full-collection scan. Index every field used in `` clauses or restructure the query.
- **[MEDIUM]** Missing projection in queries → entire documents (including large nested arrays and binary fields) are transferred over the network even when only two fields are needed. Pass a projection as the second argument to `.find()` or use `.select()`.
- **[MEDIUM]** `` operator with a very large array (over 1000 items) → performance degrades as MongoDB evaluates each element; the array is also sent in full over the wire. Consider batching into smaller `` calls or restructuring with a ``.
- **[MEDIUM]** Not using bulk operations (`insertMany`, `bulkWrite`) for batch writes → N individual round-trips to MongoDB, each with network latency overhead. Replace loops of `save()` / `insertOne()` with a single `bulkWrite` call.
- **[MEDIUM]** Aggregation pipeline without an early `` stage → all intermediate pipeline stages process the entire dataset before results are trimmed downstream. Add `` immediately after `` (or as early as semantics allow) to reduce intermediate data volume.
- **[MEDIUM]** Deeply nested documents queried by inner fields → MongoDB must traverse the entire document path for each query; deep nesting also inflates document size. Denormalise hot-path query fields to the top level or use references.
- **[MEDIUM]** `` search used without a text index → throws an error or falls back to a full scan. Create a `{ field: "text" }` index on every field used in text-search queries.
- **[LOW]** Slow queries not monitored via MongoDB Atlas Performance Advisor or `.explain("executionStats")` → performance regressions go undetected until they cause user-facing timeouts. Set up Atlas alerts or run `explain()` in development for any query touching large collections.
- **[LOW]** Missing TTL index on expiring documents (sessions, password-reset tokens, cache entries) → stale documents accumulate indefinitely, requiring a manual cron job. Use `schema.index({ createdAt: 1 }, { expireAfterSeconds: n })` for automatic cleanup.

---

## Architecture

- **[HIGH]** Embedding unbounded arrays inside documents (e.g. appending to a `comments` or `events` array indefinitely) → documents grow beyond MongoDB's 16 MB limit, causing write failures. Use referencing with a separate collection when arrays can grow without bound.
- **[HIGH]** Using MongoDB as a relational database with many `` joins across multiple collections → defeats the purpose of a document store and produces poor performance. Revisit the schema to embed frequently co-read data and only reference data that is accessed independently.
- **[HIGH]** Multi-document writes without a transaction (`session.withTransaction`) → a failure midway leaves the database in an inconsistent state with no rollback. Wrap all multi-document operations in a session transaction.
- **[HIGH]** Mongoose connection created per request instead of reused via a module-level singleton → the connection pool is exhausted under load and each new connection adds latency. Establish one connection at application startup and export the client/model for reuse.
- **[MEDIUM]** Schema defined without `timestamps: true` option → no `createdAt` / `updatedAt` audit trail is available without manual tracking. Add `{ timestamps: true }` to every schema that stores user-created or mutable data.
- **[MEDIUM]** Embedding-vs-referencing decision not documented or consistently applied → developers silently add unbounded sub-documents over time without realising the 16 MB ceiling. Document the decision per collection and add a schema comment when embedding is bounded.
- **[MEDIUM]** Business logic placed in Mongoose pre/post hooks → hooks fire on `model.save()` but NOT on `findOneAndUpdate()`, `updateMany()`, etc., causing logic to be silently skipped. Centralise business rules in a service layer that is always called regardless of the update method used.
- **[MEDIUM]** `Schema.Types.Mixed` used as a catch-all for new fields → loses Mongoose validation, type coercion, and the ability to index sub-fields. Model every known field with a proper schema type; use `Mixed` only as a genuinely last resort.
- **[MEDIUM]** `mongoose.set("strictQuery", false)` (Mongoose 6 default) in use → querying on an unknown field silently returns wrong results instead of an error; Mongoose 7 changed the default to `true`. Explicitly set `strictQuery: true` and update any queries that rely on unknown fields.
- **[LOW]** Schema indexes not created with `{ background: true }` on large collections → foreground index creation blocks all reads and writes for the duration of the build. Always use `background: true` (MongoDB 4.2 and below) or the default non-blocking build in MongoDB 4.4+.
- **[LOW]** No soft-delete pattern for important records (users, orders, financial transactions) → accidental or malicious hard deletes are unrecoverable. Add a `deletedAt` timestamp field and filter it in queries instead of issuing `deleteOne`.

---

## Code Quality

- **[HIGH]** Missing `await` on Mongoose operations → the promise is returned but not resolved; the calling code proceeds with `undefined` data and no error is thrown, making this a silent bug. Every `.find()`, `.save()`, `.updateOne()`, etc. call must be `await`ed or chained with `.then()`.
- **[HIGH]** `updateMany` / `updateOne` called without a `` operator → the entire document is replaced with the provided object, destroying all other fields. Always wrap the update payload with `{ : { ... } }` unless a full replacement is intentional.
- **[HIGH]** `findOneAndUpdate` used without `{ new: true }` → returns the document state before the update by default, so the caller operates on stale data. Pass `{ new: true }` to receive the updated document.
- **[MEDIUM]** Comparing an ObjectId to a plain string with `===` → always `false` because they are different types; the comparison silently fails without an error. Use `.equals()` method on the ObjectId or convert both sides to strings before comparing.
- **[MEDIUM]** Mixing `.exec()` calls with direct query resolution (returning the query object without `.exec()`) → inconsistent coding style and subtle differences in error handling. Pick one approach and apply it consistently across the codebase.
- **[MEDIUM]** Duplicate key error (MongoDB error code 11000) not handled explicitly → a generic 500 Internal Server Error is returned for unique-constraint violations, giving the client no actionable information. Catch `MongoServerError` with code 11000 and return a 409 Conflict with a descriptive message.
- **[MEDIUM]** `Model.find()` result not checked before treating it as a non-empty set → an empty array `[]` is truthy in JavaScript, so `if (results)` passes even when no documents were found. Check `results.length` or use `findOne` and check for `null`.
- **[MEDIUM]** Not using `.lean()` for read-only query results → Mongoose document objects are 3–5x slower to create than plain JS objects and consume more memory due to internal tracking. Use `.lean()` for any query result that is only read and serialised, never mutated and saved.
- **[LOW]** Schema virtual fields not included in `toJSON` output because `toJSON: { virtuals: true }` is not set on the schema → virtuals are silently absent from API responses. Add `{ toJSON: { virtuals: true }, toObject: { virtuals: true } }` to every schema that defines virtuals.
- **[LOW]** Mongoose model defined without the `mongoose.models.X || mongoose.model()` guard in hot-reload environments (Next.js, Nuxt dev server) → `OverwriteModelError` is thrown on every hot reload. Use `export default mongoose.models.User || mongoose.model("User", schema)`.

---

## Common Bugs & Pitfalls

- **[HIGH]** Missing `await` on Mongoose operations → the promise is not resolved; downstream code receives `undefined` and no exception surfaces. This is the single most common Mongoose bug. Lint with `no-floating-promises` or `@typescript-eslint/no-floating-promises`.
- **[HIGH]** `` vs dot-notation confusion → `{ "items.qty": { : 5 } }` matches documents where any element's `qty` exceeds 5 across the array, while `{ items: { : { qty: { : 5 }, status: "A" } } }` requires both conditions on the same element. Choose the correct form based on whether multi-field element matching is needed.
- **[HIGH]** Mongoose session not passed to query operations inside a transaction → the query executes outside the transaction, so changes are immediately visible and not rolled back on error. Pass `{ session }` to every query and update call within the transaction callback.
- **[HIGH]** `Model.save()` called on a document returned by `.lean()` → `.lean()` returns a plain JavaScript object, not a Mongoose document; `.save()` does not exist on it and throws at runtime. Either omit `.lean()` when you need to save, or use `Model.updateOne` with the plain object data.
- **[MEDIUM]** ObjectId string not validated before being passed to a query → an invalid string causes a Mongoose `CastError` that propagates as a 500 error instead of a 400. Validate with `mongoose.isValidObjectId(id)` before querying and return 400 if invalid.
- **[MEDIUM]** Stale Mongoose connection in serverless environments (Lambda, Vercel, Netlify Functions) → cold starts create a new connection; warm re-invocations may reuse a closed connection. Use a cached connection pattern: check `mongoose.connection.readyState` before calling `mongoose.connect()`.
- **[MEDIUM]** Confusion between `findByIdAndDelete` and `deleteOne` → `findByIdAndDelete` triggers `pre/post` remove middleware; `deleteOne` does not. If middleware (audit logs, cascade deletes) depends on the hook, use `findByIdAndDelete`.
- **[MEDIUM]** `` filter misuse → `: { tags: "old" }` removes the primitive value from an array of primitives, while `: { items: { id: x } }` removes matching sub-documents. Using an object filter on a primitives array or vice versa silently removes nothing.
- **[LOW]** `Schema.Types.ObjectId` `ref` string must match the registered model name exactly (case-sensitive) → `ref: "user"` fails if the model was registered as `"User"`; `.populate()` throws a `MissingSchemaError`. Always match the exact string passed to `mongoose.model()`.
- **[LOW]** Aggregation `` with `_id: null` to compute totals returns an empty array when the collection is empty, not `[{ count: 0 }]` → accessing `result[0].count` throws. Check `result.length` before accessing the first element, or use `` in a subsequent `` stage.
