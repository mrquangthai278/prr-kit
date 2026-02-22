# AWS CDK — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `aws-cdk-lib`, `from 'aws-cdk-lib'`, `new Stack(`, `cdk.App()`, `cdk synth`, `cdk deploy`, `*.ts` with CDK constructs

---

## Security
- **[CRITICAL]** IAM inline policies or managed policies with `actions: ['*']` → any principal with this role can perform every AWS action. Enumerate the exact actions required and nothing more.
- **[CRITICAL]** S3 bucket with `blockPublicAccess` not explicitly enforced → accidental ACL or policy change exposes data publicly. Always set `blockPublicAccess: BlockPublicAccess.BLOCK_ALL`.
- **[HIGH]** Lambda function granted `AdministratorAccess` or an overly broad managed policy → full blast radius on function compromise. Apply least-privilege inline policies scoped to the specific resources the function accesses.
- **[HIGH]** Security group with `peer: Peer.anyIpv4()` on sensitive ports (22, 3306, 5432, etc.) → service exposed to the internet. Restrict ingress to known CIDR ranges or security group references.
- **[HIGH]** Secrets, API keys, or database passwords hardcoded as CDK string literals → credentials committed to version control. Use `secretsmanager.Secret` or `ssm.StringParameter.fromSecureStringParameterAttributes`.
- **[HIGH]** RDS instance with `publiclyAccessible: true` and no VPC isolation → database reachable from the internet. Set `publiclyAccessible: false` and place instances in private subnets.
- **[MEDIUM]** CloudWatch log groups without `retention` set → logs stored indefinitely, increasing cost and privacy exposure. Set `retention: RetentionDays.ONE_MONTH` or an appropriate value per log group.

---

## Performance
- **[HIGH]** Lambda `memorySize` set to 128MB for CPU-bound functions → Lambda CPU allocation scales linearly with memory; low memory means slow execution. Profile with AWS Lambda Power Tuning and increase memory.
- **[HIGH]** NAT Gateway deployed in one AZ serving traffic from others → cross-AZ data transfer costs accumulate. Deploy a NAT Gateway per AZ or use NAT Instances/VPC endpoints to reduce cost.
- **[MEDIUM]** RDS instance class not sized for actual workload → either over-provisioned (cost) or under-provisioned (latency). Use Performance Insights to right-size the instance class.
- **[MEDIUM]** CloudFront distribution not used for static assets or API → all requests traverse to the origin. Add a CloudFront distribution in front of S3 and API Gateway for latency reduction.
- **[MEDIUM]** VPC endpoints not configured for S3, DynamoDB, or other frequently called AWS services → traffic routes through the NAT Gateway incurring cost and latency. Add `InterfaceVpcEndpoint` or `GatewayVpcEndpoint` for high-traffic services.
- **[LOW]** Lambda cold starts not mitigated for latency-sensitive functions → provisioned concurrency not set. Consider `lambda.Function` with `addAlias` and `provisionedConcurrentExecutions`.

---

## Architecture
- **[HIGH]** All resources defined in a single CDK stack → one deployment unit for the entire application with no separation of lifecycle, permissions, or failure domains. Split into stacks by layer (network, data, compute, application).
- **[HIGH]** Lambda source code bundled without `bundling` options → entire `node_modules` included in deployment package, inflating size and cold start time. Use `NodejsFunction` with esbuild bundling or `lambda.Code.fromAsset` with bundling hooks.
- **[MEDIUM]** Account IDs and region strings hardcoded in CDK constructs → stack not portable across environments. Use `cdk.Aws.ACCOUNT_ID`, `cdk.Aws.REGION`, or environment-specific context values.
- **[MEDIUM]** CDK Aspects not used for organization-wide policy enforcement → security and tagging policies not consistently applied. Use `cdk.Aspects.of(app).add()` for cross-cutting concerns like encryption checks.
- **[MEDIUM]** Infrastructure not deployed via CDK Pipelines → manual `cdk deploy` runs are untracked and error-prone. Implement a `CodePipeline` construct for automated, gated deployments.
- **[LOW]** Constructs not organized into reusable `Construct` subclasses → copy-paste CDK code across stacks. Extract repeated patterns into custom constructs with configuration parameters.

---

## Code Quality
- **[HIGH]** `cdk.RemovalPolicy.DESTROY` set on stateful resources (RDS, DynamoDB, S3) in a production stack → data deleted permanently on stack destruction. Use `RETAIN` for production and `SNAPSHOT` for databases.
- **[HIGH]** Cross-stack references implemented with string literals instead of `CfnOutput` + `Fn.importValue` → brittle coupling that breaks on stack rename. Use CDK's native cross-stack reference mechanism via exported outputs.
- **[MEDIUM]** Logical IDs changed by refactoring construct paths → CloudFormation treats the change as delete-and-recreate, potentially causing data loss. Use `overrideLogicalId` to preserve logical IDs when refactoring.
- **[MEDIUM]** Cost allocation tags not applied to stacks or resources → spending not attributable to teams or services. Use `Tags.of(stack).add('Team', 'platform')` at the app or stack level.
- **[MEDIUM]** Lambda functions and stacks missing `description` property → CloudFormation console and Lambda list are unreadable. Add descriptions to all named resources.
- **[LOW]** `cdk.context.json` not committed to version control → `cdk synth` produces different output across machines. Commit `cdk.context.json` to ensure deterministic synthesis.

---

## Common Bugs & Pitfalls
- **[HIGH]** Construct path refactored, changing the CloudFormation logical ID of a resource → CloudFormation deletes the old resource and creates a new one, causing data loss for stateful resources. Check `cdk diff` for unexpected resource replacements before deploying.
- **[HIGH]** CDK `Token` (e.g., `bucket.bucketName`) used in a context that stringifies it (e.g., `JSON.stringify`) → produces `[object Object]` or an unresolved token string. Use CDK-aware methods and avoid premature string conversion of lazy tokens.
- **[MEDIUM]** Cross-stack `Fn.importValue` reference creating an implicit deployment ordering dependency → deployments of the consumer stack fail if the producer stack has not been deployed first. Document and enforce the deployment order, or use SSM Parameter Store for decoupled sharing.
- **[MEDIUM]** CDK CLI version mismatched with `aws-cdk-lib` library version → construct APIs or synthesis behaviour differs. Pin both the CLI and library to the same version in `package.json` and CI tooling.
- **[MEDIUM]** `aws_lambda_nodejs.NodejsFunction` used without specifying `entry` explicitly → CDK infers entry from the calling file path, which breaks in monorepos or after refactoring. Always specify `entry` and `handler` explicitly.
- **[LOW]** `cdk diff` not run before `cdk deploy` in automation → surprising destructive changes applied without review. Always run `cdk diff` as a prior step and gate on human approval for replacements.
