# Redis — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `ioredis` / `redis` in deps · `createClient()` · `HSET` / `GET` / `SET` · `redis://` connection strings · `RedisTemplate` (Spring)

---

## Security

- **[CRITICAL]** Redis instance bound to `0.0.0.0` without `requirepass` or a firewall rule → anyone on the network can read, write, or delete all data and execute `CONFIG SET` commands.
- **[HIGH]** Sensitive data (session tokens, PII, payment info) stored in Redis without encryption → plaintext in memory, RDB snapshots, and AOF logs. Encrypt at application layer before storing.
- **[HIGH]** `EVAL` with user-controlled Lua script content → arbitrary code execution on the Redis server. Never pass user input into Lua scripts.
- **[MEDIUM]** Redis connection without TLS (`rediss://` vs `redis://`) on non-loopback network → data in transit unencrypted.
- **[MEDIUM]** Overly permissive ACL (default user with `nopass` + full command access) → use Redis ACLs to restrict commands per client.

---

## Performance

- **[HIGH]** `KEYS pattern` in production → O(n) over all keys, blocks the single-threaded server for all other clients. Use `SCAN` with cursor for non-blocking iteration.
- **[HIGH]** No TTL set on cache / session keys → unbounded memory growth, eventual eviction of hot data under `maxmemory` policy.
- **[HIGH]** Multiple sequential commands where pipelining or `MULTI/EXEC` would work → N network round-trips instead of 1. Use pipeline or Lua for batched operations.
- **[MEDIUM]** `HGETALL` on very large hashes → loads entire hash into memory at once. Use `HSCAN` or store as separate keys for large datasets.
- **[MEDIUM]** Storing large JSON blobs as a single string key → entire object must be deserialized for a partial read. Use `HSET` for field-level access.
- **[LOW]** Opening a new Redis connection per request → connection overhead. Use a connection pool (`maxRetriesPerRequest`, `enableOfflineQueue`).

---

## Architecture

- **[HIGH]** Using Redis as a primary durable database → Redis is optimized for ephemeral / cache data. Without `appendfsync always` and proper persistence config, data loss is possible on crash.
- **[HIGH]** Check-then-set race condition without `WATCH` / Lua transaction → two concurrent requests can both pass the check and both write (lost update). Use `WATCH` + `MULTI/EXEC` or a Lua script.
- **[MEDIUM]** No namespace / key prefix → key collisions between different services or data types sharing the same Redis instance. Use `service:entity:id` pattern.
- **[LOW]** Storing complex nested objects as JSON strings → consider Redis data structures (Hash, List, Set, Sorted Set) for queryable / updatable fields.

---

## Common Bugs & Pitfalls

- **[HIGH]** Treating `nil` return from `GET` as empty string → `nil` means the key does not exist; treating it as `""` causes logic errors. Always check for `nil` / `null` before using the value.
- **[HIGH]** TTL set with `SET key value` then `EXPIRE key n` in two commands → not atomic; if the process crashes between them, the key has no TTL. Use `SET key value EX n` (single atomic command).
- **[MEDIUM]** `INCR` / `DECR` on a key that doesn't exist → Redis creates it with value 0 and increments to 1. This is by design but can be surprising if you expected a pre-existing value.
- **[MEDIUM]** `DEL` returns the number of deleted keys (0 if key didn't exist) not a boolean → check return value if deletion confirmation is needed.
- **[LOW]** `EXPIRE` with negative TTL → immediately deletes the key. Validate TTL value before calling.
