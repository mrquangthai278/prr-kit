# DynamoDB — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `@aws-sdk/client-dynamodb`, `dynamoose`, `from 'dynamodb'`, `DynamoDB.DocumentClient`, `aws-sdk` with DynamoDB, `PK`/`SK` table design

---

## Security
- **[CRITICAL]** IAM role or user has `dynamodb:*` on `*` (all tables) → compromise grants full read/write/delete access to every table. Scope IAM policies to specific table ARNs and only the required actions (e.g., `dynamodb:GetItem`, `dynamodb:PutItem`).
- **[HIGH]** User-controlled input in `FilterExpression` or `KeyConditionExpression` without validation → logical injection allows querying unintended data. Validate all filter values against an allowlist; use `ExpressionAttributeValues` for all values.
- **[HIGH]** DynamoDB table name constructed from user input → attacker can target arbitrary tables. Hardcode all table names; read them from environment variables set at deployment time.
- **[HIGH]** No VPC endpoint for DynamoDB → traffic traverses the public internet. Create a VPC gateway endpoint and restrict outbound security group rules accordingly.
- **[MEDIUM]** Sensitive attributes (PII, tokens) not encrypted at the attribute level → storage-layer encryption alone is insufficient. Use AWS Encryption SDK to encrypt sensitive values before writing to DynamoDB.
- **[MEDIUM]** CloudTrail not enabled or DynamoDB data events not logged → no audit trail of who read or wrote which items. Enable CloudTrail with DynamoDB data event logging for tables with sensitive data.

---

## Performance
- **[CRITICAL]** `Scan` used instead of `Query` for data retrieval → reads every item in the table, consuming full provisioned read capacity proportional to table size. Use `Query` with a partition key; reserve `Scan` for one-off administrative operations.
- **[HIGH]** Hot partition key routing all traffic to a single partition (e.g., current date, fixed status string, or single tenant ID) → partitions cap at 3,000 RCU / 1,000 WCU; throttling occurs. Add a random suffix or shard number to distribute load.
- **[HIGH]** Missing GSI for access patterns not served by the primary key → every such query falls back to a full `Scan`. Define GSIs for all known access patterns before table creation.
- **[HIGH]** `FilterExpression` applied to `Scan` or `Query` results → filter runs after reading; full RCU cost charged for all items scanned. Encode filter criteria into the partition or sort key design.
- **[MEDIUM]** Item size consistently above 10 KB → RCU/WCU rounds up per 4 KB read / 1 KB write. Store large payloads in S3; keep only a reference key in DynamoDB.
- **[MEDIUM]** `ProjectionExpression` not specified → `GetItem` and `Query` return all attributes, wasting bandwidth and read capacity. Specify only the attributes the application needs.
- **[LOW]** On-demand capacity used for predictable steady traffic → on-demand costs more per request than provisioned at stable load. Switch to provisioned capacity with auto-scaling.

---

## Architecture
- **[CRITICAL]** Table designed relationally with one table per entity type (Users, Orders, Products) → DynamoDB has no cross-table JOINs; relational queries require multiple round trips. Use single-table design with overloaded PK/SK values.
- **[HIGH]** Access patterns not defined before table schema is finalized → retrofitting requires expensive table rebuilds. Document all query patterns (PK=X, SK starts-with Y) before writing any table creation code.
- **[HIGH]** Single-table design not used when entity types share access patterns (e.g., fetch user plus orders in one request) → requires two separate calls. Collapse entities into one table; use `Query` with `PK=userId` to retrieve all related items.
- **[MEDIUM]** TTL attribute not set on ephemeral items (sessions, OTP tokens, locks) → items accumulate indefinitely, increasing storage cost and scan time. Define a Unix-epoch numeric TTL attribute and enable DynamoDB TTL.
- **[MEDIUM]** DynamoDB Streams not used for event-driven side effects (cache invalidation, notifications) → polling or synchronous calls used instead. Enable Streams and attach a Lambda trigger.
- **[LOW]** No CloudWatch capacity alarms configured → throttling goes undetected until user-visible errors occur. Set alarms at 80% of provisioned `ConsumedWriteCapacityUnits` / `ConsumedReadCapacityUnits`.

---

## Code Quality
- **[HIGH]** Table names hardcoded as string literals throughout the codebase → renaming requires a grep-and-replace across all files. Centralize in a constants module or read from `process.env.TABLE_NAME`.
- **[HIGH]** No error handling for `ProvisionedThroughputExceededException` → throttled requests fail permanently. Use the AWS SDK `maxAttempts` retry config and add exponential backoff for throttling errors.
- **[MEDIUM]** `TransactWriteItems` not used for multi-item atomic operations (e.g., decrement inventory and create order) → partial success possible if one write fails. Use `TransactWriteItems` (up to 100 items) for all-or-nothing mutations.
- **[MEDIUM]** Raw `DynamoDB.DocumentClient` used without an abstraction layer → marshall/unmarshall logic scattered throughout. Use DynamoDB Toolbox, Dynamoose, or a thin repository class.
- **[MEDIUM]** Attribute names conflicting with DynamoDB reserved words (`name`, `status`, `date`, `key`) → queries without `ExpressionAttributeNames` throw `ValidationException`. Map reserved-word attributes using ExpressionAttributeNames.
- **[LOW]** No integration tests against a local DynamoDB (DynamoDB Local or LocalStack) → key condition expression bugs only caught in production. Add DynamoDB Local to the test environment.

---

## Common Bugs & Pitfalls
- **[HIGH]** `BatchWriteItem` response not checked for `UnprocessedItems` → DynamoDB may partially fail a batch silently. Always check `response.UnprocessedItems` and retry unprocessed items with exponential backoff.
- **[HIGH]** Optimistic locking via `ConditionExpression` not used for concurrent updates → two concurrent requests read the same version, both write the incremented version, and one silently overwrites the other. Use `ConditionExpression: "version = :expected"` and increment version on every write.
- **[MEDIUM]** `ConsistentRead: true` not used when strong consistency is needed after a write → eventual consistency may return stale data within the roughly 1-second replication window. Set `ConsistentRead: true` for reads that must reflect a preceding write.
- **[MEDIUM]** Global table replication lag not accounted for in cross-region reads → a write in us-east-1 may not be visible in eu-west-1 for several seconds. Route post-write reads to the write region.
- **[MEDIUM]** `UpdateItem` with `SET attr = :val` replacing a list attribute instead of appending → entire list overwritten when intent is to add one element. Use `SET listAttr = list_append(listAttr, :newItems)` to append.
- **[LOW]** Sort key not planned at design time → adding a sort key later requires creating a new table and migrating all data. Decide on composite vs. simple key before the first deployment.
