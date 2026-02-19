---
name: "step-02-list-prs"
description: "List open PRs/MRs via platform CLI (primary) and recent branches (secondary)"
nextStepFile: "./step-03-select.md"
---

# Step 2: List Open PRs and Branches

**Progress: Step 2 of 5** — Listing available PRs/MRs and branches

## STEP GOAL

Show open PRs/MRs from the configured platform as the **primary** selection list.
Always show recent branches as secondary. Fall back to branch-only if no platform configured.

Use `{platform}` (or `{detected_platform}` from step 1 if platform = auto).

## Sequence of Instructions

### 1. List Open PRs/MRs (Primary)

Run the appropriate command based on platform:

**GitHub** (`platform = github`, requires `gh` CLI):
```bash
gh pr list --repo {platform_repo} --state open \
  --json number,title,headRefName,baseRefName,author,createdAt,isDraft \
  --limit 20
```

**GitLab** (`platform = gitlab`, requires `glab` CLI):
```bash
glab mr list --repo {platform_repo} --state opened \
  --output json
```
Fields to use: `iid` (MR number), `title`, `source_branch`, `target_branch`, `author.username`, `created_at`, `draft`.

**Azure DevOps** (`platform = azure`, requires `az` CLI with `azure-devops` extension):
```bash
az repos pr list --repository {repo} --project {project} --org {org_url} \
  --status active --output json
```
Where `{platform_repo}` format is `org/project/repo` → extract accordingly.
Fields: `pullRequestId`, `title`, `sourceRefName`, `targetRefName`, `createdBy.displayName`, `creationDate`.

**Bitbucket** (`platform = bitbucket`, requires `bb` CLI or `curl`):
```bash
bb prs list --repo {platform_repo} --state OPEN
```
Or via API: `curl https://api.bitbucket.org/2.0/repositories/{platform_repo}/pullrequests?state=OPEN`
Fields: `id`, `title`, `source.branch.name`, `destination.branch.name`, `author.display_name`.

**None / local** (`platform = none` or no platform configured): skip to step 2.

If the command **succeeds and returns PRs/MRs**, display them as the main list:

```
🔗 Open PRs on {platform_repo}:  ({platform})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  #45  [DRAFT] "Add OAuth2 login"           feature/oauth    → main     @alice  3h ago
  #44  "Fix memory leak in dashboard"       fix/memory-leak  → main     @bob    1d ago
  #43  "Refactor API layer"                 refactor/api     → develop  @carol  2d ago
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Set `pr_list_available = true`. Store the PR/MR list for step 3.

If the command **fails or returns empty**, set `pr_list_available = false`.

### 2. List Recent Branches (Always shown as secondary / fallback)

```bash
git -C {target_repo} branch -r --sort=-committerdate \
  --format="%(refname:short) | %(objectname:short) | %(committerdate:relative) | %(contents:subject)" \
  | head -15
```

Display as secondary reference (or primary if `pr_list_available = false`):
```
🌿 Recent branches (newest first):
  1. origin/feature/oauth       (abc1234) — 3 hours ago — "Add OAuth2 login"
  2. origin/fix/memory-leak     (def5678) — 1 day ago  — "Fix memory leak"
  ...
```

If `pr_list_available = false`, add note:
```
⚠️  Platform PR list unavailable — select by branch name instead.
```

### 3. Update Frontmatter and Load Next Step

Add `step-02-list-prs` to `stepsCompleted`.

Read fully and follow: `{nextStepFile}`
