# MongoDB / Mongoose — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `mongoose`, `MongoClient`, `Schema(`, `.find(`, `.aggregate(`, `from 'mongodb'`, `MONGO_URI`

---

## Security

- **[CRITICAL]** Query operator injection — user-controlled object used directly in query: `Model.find({ username: req.body.username })` where `req.body.username` could be `{ $gt: "" }` → returns all users. Sanitize with `mongo-sanitize` or validate type is string.
- **[HIGH]** `$where` operator with user input → JavaScript execution inside MongoDB, SSJI.
- **[HIGH]** Returning sensitive fields (password, token) in query result. Use `.select('-password')` or projection.
- **[MEDIUM]** Missing schema validation on Mongoose model → arbitrary fields stored.
- **[MEDIUM]** `findOne({ email })` without checking if email is `undefined` → returns first document when email is undefined.

---

## Performance

- **[HIGH]** Missing index on frequently queried fields — MongoDB does full collection scan without index.
- **[HIGH]** Aggregation pipeline missing `$match` at beginning → processes entire collection before filtering.
- **[HIGH]** `find().toArray()` on large collections without `limit()` → loads entire collection into memory.
- **[MEDIUM]** N+1 — using `populate()` in a loop. Batch with `populate` on the initial query or use `$lookup` in aggregation.
- **[MEDIUM]** Missing projection in queries — fetching all fields when only a subset needed.
- **[MEDIUM]** `$in` operator with very large array → performance degrades at ~1000+ items.
- **[LOW]** Not using bulk operations (`insertMany`, `bulkWrite`) for multiple writes → many round trips.

---

## Architecture

- **[HIGH]** Business logic in Mongoose middleware (pre/post hooks) for non-schema concerns → hard to trace.
- **[MEDIUM]** Schema without `timestamps: true` → no `createdAt`/`updatedAt` audit trail.
- **[MEDIUM]** Embedding vs referencing decision not justified — deeply nested arrays that grow unbounded → document size limit (16MB).
- **[LOW]** Missing `strict: true` (default) turned off → arbitrary fields accepted silently.

---

## Common Bugs & Pitfalls

- **[HIGH]** `findOneAndUpdate` returns old document by default — use `{ new: true }` to get updated document.
- **[HIGH]** `updateMany` without `$set` operator → replaces entire document with provided object.
- **[MEDIUM]** ObjectId comparison with string → `id === "abc"` always false. Use `.equals()` or `.toString()`.
- **[MEDIUM]** Missing `await` on Mongoose operations when using async/await → promise not resolved, silent failure.
- **[LOW]** `Schema.Types.Mixed` overused → loses schema validation benefits.
