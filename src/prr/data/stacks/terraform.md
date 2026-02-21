# Terraform — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.tf` files · `terraform {` block · `resource "` · `provider "` · `variable "` · `module "` · `terraform.tfvars` · `.terraform/` directory

---

## Security

- **[CRITICAL]** Sensitive values (passwords, private keys, connection strings) hardcoded in `.tf` files → committed to version control. Use `sensitive = true` variables + secrets manager or environment variable injection.
- **[HIGH]** `sensitive = false` on variables containing passwords or keys → value printed in `terraform plan` output and stored in state file in plaintext. Mark as `sensitive = true`.
- **[HIGH]** State file in unencrypted S3 bucket or stored locally → Terraform state contains all resource attributes including secrets. Enable server-side encryption and restrict bucket access.
- **[HIGH]** Overly permissive IAM policies: `"Action": "*"` or `"Resource": "*"` → violates least-privilege. Grant only the specific actions and resources needed.
- **[MEDIUM]** `terraform.tfvars` or `*.auto.tfvars` with secrets committed to version control → add to `.gitignore`, use environment variables or vault integration.
- **[MEDIUM]** Publicly accessible S3 bucket, RDS instance, or security group with `0.0.0.0/0` ingress on sensitive ports → review each resource for unintended exposure.

---

## Performance

- **[HIGH]** `count` used for resource iteration when `for_each` is more appropriate → with `count`, inserting at index N causes destroy/recreate of all resources after N. Use `for_each` with a map or set for stable addressing.
- **[MEDIUM]** Monolithic root module with hundreds of resources → slow `terraform plan` (all providers refreshed) and hard to review. Split into composable child modules.
- **[MEDIUM]** Missing `depends_on` for resources with implicit ordering requirements not expressible through attribute references → apply may fail on first run, succeed on retry.
- **[LOW]** Unused `data` sources or `local` values → increases plan time. Remove unused blocks.

---

## Architecture

- **[HIGH]** No remote backend configured → state is local, not shared with team, no state locking. Configure `backend "s3"`, `backend "azurerm"`, or Terraform Cloud.
- **[HIGH]** Applying directly to production without reviewing `terraform plan` output first → risk of unintended `destroy` or `replace` operations.
- **[MEDIUM]** Hardcoded region, account ID, or environment name in module → module not reusable. Parameterize with variables.
- **[MEDIUM]** Resources without tags for environment, owner, and cost-center → no governance, no cost attribution in billing dashboards.
- **[LOW]** Circular module dependencies → Terraform cannot resolve the dependency graph. Restructure modules or use data sources.

---

## Code Quality

- **[HIGH]** Variable declared without a `type` constraint → implicit `any` type; type errors surface at `apply` time, not `validate` or `plan` time.
- **[MEDIUM]** `lifecycle { prevent_destroy = true }` missing on critical resources (RDS, S3, load balancers) → accidental `terraform destroy` or resource replacement deletes data.
- **[MEDIUM]** Large inline `user_data` or `metadata_startup_script` → hard to review, can't be linted. Extract to a `templatefile()` call referencing an external `.sh` / `.tpl` file.
- **[LOW]** No `description` field on `variable` or `output` blocks → other team members can't understand the module interface without reading all `.tf` files.

---

## Common Bugs & Pitfalls

- **[CRITICAL]** Running `terraform destroy` without `-target` on a shared environment → destroys ALL resources in the state, including shared infrastructure.
- **[HIGH]** `terraform plan` shows "forces replacement" on a critical resource (RDS, EKS cluster) but change is applied anyway → downtime or data loss. Understand the cause before applying.
- **[MEDIUM]** Forgetting `terraform init` after adding a new provider or module source → `provider not installed` error at plan/apply time.
- **[MEDIUM]** `output { sensitive = false }` on an output that references a `sensitive` variable → Terraform 0.15+ will error. Mark output as `sensitive = true`.
- **[LOW]** `.terraform.lock.hcl` not committed to version control → non-reproducible provider versions across team members and CI.
