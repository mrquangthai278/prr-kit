---
name: "step-03-select"
description: "User selects PR/MR by number (primary) or branch names (fallback)"
nextStepFile: "./step-04-load-diff.md"
---

# Step 3: Select PR / MR

**Progress: Step 3 of 5** — Selecting review target

## STEP GOAL

User picks a PR/MR by number — base and head are resolved automatically from the platform.
Fall back to explicit head + base branch selection if no platform is configured.

## Sequence of Instructions

### 1. Present Selection Prompt

**If `pr_list_available = true`** (platform PR/MR list was shown):

```
🎯 Select a PR/MR to review:

  Enter PR/MR number (e.g., 44)
  Or type a branch name directly (e.g., feature/my-feature)
```

**HALT — wait for user to respond.**

**If `pr_list_available = false`** (no platform / branch list only):

Display EXACTLY:
```
🎯 Head branch (the branch to review)?

   You can:
     • Enter a number from the list  (e.g., 1)
     • Type the branch name directly  (e.g., feature/my-feature)
```

**HALT — wait for head branch response.**

Then display EXACTLY:
```
🎯 Base branch (what to diff against)?

   You can:
     • Press Enter to use the default  [main]
     • Type the branch name directly   (e.g., develop)
```

**HALT — wait for base branch response.**
If user presses Enter without typing, detect `origin/main` or `origin/master`.

Set `selected_branch` = head input, `base_branch` = base input, `pr_number` = empty.
Set `diff_range` = `{base_branch}...{selected_branch}`.
Skip directly to step 4.

### 2. Parse Input and Resolve Base/Head (Platform flow only)

*Applies only when `pr_list_available = true`.*

#### Case A: User enters a PR/MR number (e.g., `44` or `#44`)

Run the appropriate command to fetch metadata:

**GitHub:**
```bash
gh pr view {number} --repo {platform_repo} \
  --json number,title,headRefName,baseRefName,author,body,headRefOid
```
Extract: `headRefName` → `selected_branch`, `baseRefName` → `base_branch`, `headRefOid` → `pr_head_sha`.

**GitLab:**
```bash
glab mr view {number} --repo {platform_repo} --output json
```
Extract: `source_branch` → `selected_branch`, `target_branch` → `base_branch`.
Get head SHA: `git -C {target_repo} rev-parse origin/{selected_branch}` → `pr_head_sha`.

**Azure DevOps:**
```bash
az repos pr show --id {number} --output json
```
Extract: `sourceRefName` (strip `refs/heads/`) → `selected_branch`, `targetRefName` → `base_branch`.

**Bitbucket:**
```bash
curl https://api.bitbucket.org/2.0/repositories/{platform_repo}/pullrequests/{number}
```
Extract: `source.branch.name` → `selected_branch`, `destination.branch.name` → `base_branch`.

Set: `pr_number` = number, `pr_title` = title, `pr_author` = author.

Display confirmation:
```
✓ PR #{pr_number} selected
  Title:  {pr_title}
  Head:   {selected_branch}
  Base:   {base_branch}  ← from platform definition
```

#### Case B: User enters a number from the branch list (e.g., `2`)

Map to branch at that position from step 2.
Set `selected_branch` = that branch. Set `pr_number` = empty.
Detect `base_branch`: check `origin/main` → `origin/master` → ask user.

#### Case C: User enters a branch name directly (e.g., `feature/my-feature`)

Set `selected_branch` = provided name (add `origin/` if missing). Set `pr_number` = empty.
Try to find a matching PR/MR on the platform and use its base branch. If not found, detect base same as Case B.

### 3. Store Selection

Store for subsequent steps:
- `selected_branch`, `base_branch`, `diff_range` = `{base_branch}...{selected_branch}`
- `pr_number`, `pr_title`, `pr_author`, `pr_body`
- `pr_head_sha` (or `git -C {target_repo} rev-parse origin/{selected_branch}` if not set)
- `active_platform` = `{platform}` or `{detected_platform}`

### 4. Update Frontmatter and Load Next Step

Add `step-03-select` to `stepsCompleted`.

Read fully and follow: `{nextStepFile}`
