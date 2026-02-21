# GitHub Actions / CI-CD — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `.github/workflows/*.yml` · `.github/workflows/*.yaml` · `on:` trigger · `jobs:` · `steps:` · `uses:` · `runs-on:` · `actions/checkout`

---

## Security

- **[CRITICAL]** User-controlled data in `run:` step without env var indirection: `run: echo "${{ github.event.issue.title }}"` → script injection. Pass via env: `title: ${{ ... }}` and reference as `$title` in shell.
- **[CRITICAL]** `pull_request_target` trigger that checks out PR code and runs it → the event has write permissions; malicious PR can exfiltrate `GITHUB_TOKEN` or secrets. Never `actions/checkout` with the PR ref in `pull_request_target`.
- **[HIGH]** Action pinned by tag (`uses: actions/checkout@v4`) instead of full commit SHA → tag can be moved or deleted; supply chain attack. Use `actions/checkout@abc1234` (full SHA) + a comment with the tag.
- **[HIGH]** `permissions: write-all` or `permissions: contents: write` when read is sufficient → `GITHUB_TOKEN` with broad write access is a high-value target.
- **[MEDIUM]** Printing secrets in log steps: `run: echo ${{ secrets.API_KEY }}` → GitHub masks known secrets but patterns may leak through transformed values.
- **[MEDIUM]** Third-party action from unverified source without pinning → trust of the action's supply chain not established.

---

## Performance

- **[HIGH]** No dependency caching (`actions/cache` or built-in `setup-node` cache) for npm / pip / Maven / Gradle → full dependency install on every run, often 1-5 minutes avoidable.
- **[MEDIUM]** All steps in a single job → no parallelism possible; long serial bottleneck. Split into matrix or parallel jobs.
- **[MEDIUM]** Uploading large unused artifacts (`actions/upload-artifact`) → wastes storage quota and slows down workflow summary.
- **[LOW]** Missing `timeout-minutes` on long-running jobs → a hung job runs until GitHub's 6-hour (self-hosted: unlimited) limit, wasting runner minutes.

---

## Architecture

- **[HIGH]** Workflow triggered on `push` to `main` with no branch protection rules → direct pushes bypass PR review process and trigger deployment.
- **[MEDIUM]** All deployment logic in a single workflow file → no reusability. Extract to reusable workflows (`workflow_call` trigger) or composite actions.
- **[MEDIUM]** Hardcoded environment URLs, account IDs, or region in workflow YAML → use GitHub Environments with protection rules and environment-scoped secrets.
- **[LOW]** Missing `concurrency` group on deployment workflows → multiple simultaneous deployments from rapid pushes can create race conditions.

---

## Code Quality

- **[HIGH]** Using deprecated `set-output` command: `echo "::set-output name=foo::bar"` → use `$GITHUB_OUTPUT`: `echo "foo=bar" >> $GITHUB_OUTPUT`.
- **[MEDIUM]** `continue-on-error: true` on critical steps (build, deploy) → job shows green when underlying step failed. Only use for genuinely optional steps.
- **[MEDIUM]** Long inline shell scripts in `run:` blocks → hard to lint, test, or reuse. Extract to a script file in the repository.
- **[LOW]** No workflow-level `defaults.run.shell` set → shell behavior differs across `ubuntu-latest`, `windows-latest`, `macos-latest`. Be explicit about shell.

---

## Common Bugs & Pitfalls

- **[HIGH]** `if: github.ref == 'refs/heads/main'` on a job triggered by `pull_request` → `github.ref` is the merge commit ref for PRs, not the branch name; condition may never be true. Use `github.base_ref` or `github.event_name`.
- **[HIGH]** Secret not available in forked PR workflows → `pull_request` from forks has no access to parent repo secrets by design. Use `pull_request_target` carefully (see security rules) or handle gracefully.
- **[MEDIUM]** `actions/checkout` without `fetch-depth: 0` when workflow needs full git history (changelogs, version bumps) → shallow clone misses tags and history.
- **[MEDIUM]** Matrix job with `fail-fast: true` (default) → first failure cancels all other matrix jobs, losing parallel test results. Set `fail-fast: false` for test matrices.
- **[LOW]** `env.VARIABLE` set in one job accessed in another → env vars are job-scoped. Use `jobs.<job>.outputs` to pass values between jobs.
