# GitHub Actions Stack Rules

Detection signals: `.github/workflows/*.yml`, `.github/workflows/*.yaml`, `on:` trigger, `jobs:`, `steps:`, `uses:`, `runs-on:`, `actions/checkout`

---

## Security

- **[CRITICAL]** User-controlled data interpolated directly in a `run:` step via expressions like `github.event.issue.title` passed as shell arguments → script injection allows an attacker to execute arbitrary commands with the runner's permissions. Always pass untrusted input via an env var and reference as `$VAR` in shell, never inline the expression.
- **[CRITICAL]** `pull_request_target` trigger checking out and running code from the PR branch → this event runs with write permissions and access to secrets; a malicious PR can exfiltrate the `GITHUB_TOKEN` or deploy credentials. Never checkout the PR ref in `pull_request_target` without strict branch restrictions and required approvals.
- **[CRITICAL]** Secrets echoed or logged in run steps → GitHub masks known secret values but transformed or encoded forms may still leak. Never echo, log, or interpolate secrets into shell output; pass them only as environment variables to commands that need them.
- **[HIGH]** Actions pinned by mutable tag (e.g. `uses: actions/checkout@v4`) rather than a full commit SHA → the tag can be moved or deleted, enabling a supply-chain attack that substitutes malicious code. Pin to full SHA with a tag comment: `uses: actions/checkout@11bd71901... # v4`.
- **[HIGH]** `permissions: write-all` or omitting the `permissions` key entirely (defaults to write on some repos) → the `GITHUB_TOKEN` is over-privileged, increasing the blast radius of any compromised step. Always declare minimal permissions per job.
- **[HIGH]** Self-hosted runner on shared infrastructure with no job isolation between runs → one workflow can read another job's secrets, artifacts, or working directory state. Use ephemeral self-hosted runners or GitHub-hosted runners for sensitive jobs.
- **[HIGH]** Workflow triggered on `pull_request` with write permissions and no approval requirement for fork PRs → fork PR can trigger a privileged workflow and leak secrets. Use environment protection rules with required reviewers for any job that accesses secrets.
- **[MEDIUM]** Third-party action from an unverified publisher without SHA pinning → the action could be compromised at any future point without warning. Fork the action into your own org, or pin to a specific commit SHA and audit the source.
- **[MEDIUM]** Secrets stored in repo-level env blocks visible in verbose runner logs → even masked secrets may appear in transformed form. Use step-level env blocks and minimize secret scope to the step that needs it.
- **[MEDIUM]** `GITHUB_TOKEN` used beyond its intended repository scope without explicit permission grant → scoping errors cause unexpected access or unexpected failures. Declare permissions explicitly; use fine-grained PATs for cross-repository operations.
- **[LOW]** Workflow files in public repositories not reviewed by a security-aware maintainer → any maintainer can introduce a step that exfiltrates secrets. Require CODEOWNERS review for all changes to `.github/workflows/`.
- **[LOW]** `continue-on-error: true` on security-sensitive steps such as secret rotation or audit submission → failure is silently ignored, leaving the system in an insecure state. Only use this on genuinely optional steps.

---

## Performance

- **[CRITICAL]** No dependency caching (`actions/cache` or setup action built-in cache) for package managers → npm/pip/maven/gradle install runs from scratch on every job, wasting 1-5 minutes. Cache with a key based on the lockfile hash using hashFiles.
- **[HIGH]** All steps in a single monolithic job with no parallelism → serial bottleneck; the job is as slow as the sum of all steps. Split into parallel jobs using the `needs:` dependency graph to run independent work concurrently.
- **[HIGH]** Uploading and downloading artifacts in every job when only specific jobs need them → unnecessary I/O and artifact storage costs. Upload once in the producing job; download only in jobs that explicitly need it.
- **[HIGH]** Matrix strategy not used for multi-platform or multi-version testing → sequential test runs instead of parallel. Use `strategy: matrix: { os: [...], node: [...] }` to test all combinations concurrently.
- **[MEDIUM]** Uploading large unused artifacts (full build directories, node_modules) → wastes storage quota and slows down the workflow summary. Filter artifacts to only the files needed by downstream jobs or for debugging.
- **[MEDIUM]** Missing `timeout-minutes` on jobs → a hung job (deadlocked process, waiting for user input) runs until the 6-hour GitHub default limit, burning paid minutes. Set an explicit timeout appropriate for each job.
- **[MEDIUM]** No concurrency cancellation for PR branch workflows → every push to a PR branch queues a new run while old runs are still active, wasting minutes. Add a concurrency group with cancel-in-progress: true for pull_request triggers.
- **[MEDIUM]** Running the full test suite on every push to every branch without path filtering → a docs-only change triggers a full 10-minute test run. Use `on: push: paths:` or `paths-ignore:` filters to skip irrelevant runs.
- **[LOW]** Tool installation repeated in every job because the runner environment is not cached → installing Node.js, Python, or other runtimes adds 30-60 seconds per job. Use setup actions (`actions/setup-node`) with their built-in caching options.
- **[LOW]** Not using composite actions or reusable workflows for repeated step sequences → the same 5-step build setup copy-pasted across 8 workflows drifts over time. Extract to a composite action or reusable workflow called via `uses:`.
- **[LOW]** Not gating expensive steps on PR draft status or fork conditions → expensive deployments and integration tests run on every commit including work-in-progress. Check `github.event.pull_request.draft` before expensive steps.
- **[LOW]** Not using `fetch-depth: 1` for jobs that do not need git history → full clone adds seconds on large repos. Add `fetch-depth: 1` to the checkout step for pure build/test jobs.

---

## Architecture

- **[HIGH]** All deployment and CI logic in a single monolithic workflow file → no reusability; every project duplicates the same steps. Extract shared logic to reusable workflows (`workflow_call`) or composite actions and call them from individual workflow files.
- **[HIGH]** Workflow triggered on push to main with no branch protection rules → direct pushes bypass PR review and immediately trigger production deployment. Enforce branch protection: require PR, status checks, and at least one review before merge.
- **[HIGH]** No environment protection rules on production deployment jobs → any branch or actor can trigger a production deploy. Use GitHub Environments with required reviewers and deployment wait timers for production.
- **[HIGH]** Repository-level secrets used across all workflows regardless of need → any workflow can read any repo secret, increasing blast radius of a compromised workflow. Use environment-scoped secrets that are only available to jobs targeting that environment.
- **[MEDIUM]** Environment URLs, account IDs, or regions hardcoded in workflow YAML → changing environments requires searching and editing all workflow files. Use GitHub Environments, the `vars` context, or repository variables for environment-specific values.
- **[MEDIUM]** No concurrency group on deployment workflows → parallel deployments to the same environment create race conditions and partial rollouts. Add a concurrency group per environment and cancel-in-progress or queue-based strategy.
- **[MEDIUM]** Reusable workflow not versioned with a release tag → callers get breaking changes automatically when the reusable workflow is updated. Tag reusable workflows with semver releases and have callers pin to a tag.
- **[MEDIUM]** Complex job dependency graph (needs:) not documented → multi-job DAGs are impossible to understand without a visual aid. Add a Mermaid diagram or ASCII art of the workflow DAG to the README or workflow file header.
- **[LOW]** No branch naming convention enforced on wildcard triggers → wildcard branch patterns in triggers match unintended branches. Document and enforce a branch naming convention (`feature/*`, `fix/*`) and use it in trigger patterns.
- **[LOW]** `workflow_dispatch` inputs not validated before use → integer or enum inputs arrive as strings; invalid values cause obscure errors in later steps. Validate all inputs in the first step and fail fast with a clear error message.
- **[LOW]** No staging environment between CI and production → code goes directly from CI green to production without a pre-production validation step. Add a staging environment job with a smoke test gate before the production deployment job.
- **[LOW]** Secrets shared between staging and production environments → a staging breach exposes production credentials. Use separate secret sets per environment; rotate independently.

---

## Code Quality

- **[HIGH]** Deprecated `set-output` command: `echo "::set-output name=foo::bar"` → command was removed; workflows using it silently fail or produce warnings. Replace with the environment file approach: `echo "foo=bar" >> 'GITHUB_OUTPUT var'`.
- **[HIGH]** Deprecated `set-env` command: `echo "::set-env name=VAR::val"` → command was disabled due to security vulnerabilities. Replace with: `echo "VAR=val" >> 'GITHUB_ENV var'`.
- **[HIGH]** Deprecated `add-path` command: `echo "::add-path::..."` → command was disabled. Replace with: `echo "/my/path" >> 'GITHUB_PATH var'`.
- **[HIGH]** `continue-on-error: true` on critical steps (build, test, security scan, deploy) → the job shows green even when a critical step fails, hiding real failures. Only use `continue-on-error` for genuinely optional steps; always check step outcome.
- **[MEDIUM]** Long inline shell scripts in `run:` blocks → inline scripts are untestable, unlintable, and hard to review. Extract scripts to files in the repository (`.github/scripts/`), test them locally, and call them from the workflow.
- **[MEDIUM]** Missing `defaults.run.shell` at workflow or job level → shell behavior differs across ubuntu, windows, and macos runners. Be explicit: set `defaults: run: shell: bash` to ensure consistent behavior.
- **[MEDIUM]** Hardcoded runner labels using specific OS versions (`ubuntu-20.04`) → end-of-life runners cause silent workflow failures when GitHub removes them. Use `ubuntu-latest` or document the pinned version and set a calendar reminder to update.
- **[MEDIUM]** Not using `fromJSON()` for complex expressions involving JSON manipulation → string operations on JSON in expression context are fragile and hard to debug. Use `fromJSON(steps.id.outputs.value)` to parse JSON outputs properly.
- **[MEDIUM]** YAML anchors not used for repeated step configurations (env vars, options) → the same environment variable block copy-pasted across 12 steps drifts when values change. Use YAML anchors and aliases to define once and reference many times.
- **[LOW]** Missing `if: always()` on cleanup or notification steps → these steps are skipped when a previous step fails, leaving cleanup undone and stakeholders uninformed. Add `if: always()` to steps that must run regardless of prior step outcome.
- **[LOW]** Workflow files not linted with `actionlint` or a similar tool → YAML syntax errors, unknown context references, and deprecated commands are only caught at runtime. Add `rhysd/actionlint` to a pre-commit hook or a dedicated lint workflow.
- **[LOW]** No comments explaining non-obvious workflow logic or permission grants → future maintainers cannot understand why a permission is needed or why a step exists. Add inline comments for all non-obvious decisions.
