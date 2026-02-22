# Redis — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `ioredis` / `redis` in deps · `createClient()` · `HSET` / `GET` / `SET` · `redis://` connection strings · `RedisTemplate` (Spring) · `EXPIRE` · `SCAN`

---

## Security

- **[CRITICAL]** Redis bound to `0.0.0.0` without `requirepass` or firewall → anyone on network reads/writes/deletes all data and runs `CONFIG SET`.
- **[CRITICAL]** `EVAL` with user-controlled Lua script content → arbitrary code execution on Redis server.
- **[HIGH]** Sensitive data (session tokens, PII, payment info) stored without encryption → plaintext in memory, RDB snapshots, AOF logs.
- **[HIGH]** Redis connection without TLS (`rediss://`) on non-loopback → data in transit unencrypted.
- **[HIGH]** Default `nopass` ACL user in production → any client with network access has full access.
- **[HIGH]** `CONFIG SET` / `DEBUG` commands not disabled → attacker can reconfigure Redis, write to disk.
- **[MEDIUM]** Overly permissive ACLs → use Redis ACLs to restrict commands per application role.
- **[MEDIUM]** Redis used as session store without secure session ID generation → session fixation.
- **[LOW]** Redis admin port accessible from application servers that don't need admin access.

---

## Performance

- **[CRITICAL]** `KEYS pattern` in production → O(n) over all keys, blocks single-threaded server. Use `SCAN` with cursor.
- **[HIGH]** No TTL on cache/session keys → unbounded memory growth, hot data evicted by `maxmemory` policy.
- **[HIGH]** Sequential commands where pipelining / `MULTI/EXEC` works → N round-trips instead of 1.
- **[HIGH]** New connection per request → connection overhead. Use connection pool (`maxRetriesPerRequest`, `enableOfflineQueue`).
- **[HIGH]** Storing large JSON blobs as string → entire object deserialized for partial read. Use `HSET` for field access.
- **[MEDIUM]** `HGETALL` on very large hashes → loads entire hash. Use `HSCAN` or separate keys.
- **[MEDIUM]** `LRANGE 0 -1` on large list → full list loaded into memory.
- **[MEDIUM]** Not using Redis Cluster for large datasets → single node bottleneck.
- **[MEDIUM]** `SUBSCRIBE` / `PSUBSCRIBE` on same connection handling requests → blocking subscriber connection.
- **[LOW]** `DEL` on many keys in loop → use `UNLINK` (async) for large deletes.
- **[LOW]** Not using `OBJECT ENCODING` to verify compact encoding used for small hashes/sets.

---

## Architecture

- **[HIGH]** Redis as primary durable database without proper persistence config → data loss on crash. Use PostgreSQL for source of truth.
- **[HIGH]** Check-then-set race condition without `WATCH` + `MULTI/EXEC` or Lua → lost update under concurrency.
- **[HIGH]** Cache invalidation not implemented → stale data served indefinitely after DB update.
- **[HIGH]** Pub/Sub used for guaranteed message delivery → Redis Pub/Sub is fire-and-forget. Use Redis Streams or a proper message queue.
- **[MEDIUM]** No namespace/key prefix → collisions between services sharing Redis instance. Use `service:entity:id` pattern.
- **[MEDIUM]** TTL not refreshed on cache hit (sliding expiration) when needed → cache expires despite active use.
- **[MEDIUM]** Redis Cluster not configured for multi-key operations → `MGET`/`MSET` across slots fails.
- **[MEDIUM]** Not using Redis Streams for event sourcing/audit log → losing ordered event history.
- **[LOW]** Using `SORT` on large sets without LIMIT → expensive full sort.
- **[LOW]** Not using `OBJECT FREQ` with `allkeys-lfu` eviction for smart caching.

---

## Code Quality

- **[HIGH]** Error handling missing on Redis commands → connection failure crashes entire request.
- **[HIGH]** `SET key value` then `EXPIRE key n` → not atomic; crash between commands = no TTL. Use `SET key value EX n`.
- **[MEDIUM]** `nil` return from `GET` treated as empty string → key doesn't exist vs empty string confusion.
- **[MEDIUM]** Hardcoded key strings scattered across codebase → create key builder functions.
- **[MEDIUM]** Not using `MULTI/EXEC` transaction for related operations → partial state on failure.
- **[LOW]** `DEL` return value not checked → 0 means key didn't exist, may indicate logic error.
- **[LOW]** Not using `DEBUG OBJECT` / `MEMORY USAGE` for memory profiling large keys.

---

## Common Bugs & Pitfalls

- **[HIGH]** `nil` from `GET` used without null check → NullPointerException / undefined behavior.
- **[HIGH]** `INCR` on non-existent key → creates with 0 and increments to 1 (by design, but surprising).
- **[HIGH]** `EXPIRE` with negative TTL → immediately deletes key. Validate TTL before calling.
- **[HIGH]** Lua script error mid-execution → Lua is atomic but partial state changes before error persist.
- **[MEDIUM]** `WATCH` not retried on `MULTI/EXEC` nil response → optimistic lock failed, operation silently skipped.
- **[MEDIUM]** Connection lost mid-pipeline → partial commands sent, partial responses received → state corruption.
- **[MEDIUM]** `EXPIRE` called on non-existent key → returns 0 (no error), silently fails.
- **[MEDIUM]** Key type mismatch (`LPUSH` on string key) → `WRONGTYPE` error at runtime.
- **[LOW]** `KEYS *` used in development → habits carry to production.
- **[LOW]** Not monitoring `redis-cli --latency` → latency spikes from blocking operations undetected.
