---
name: "step-04-load-diff"
description: "Load the full diff using platform CLI or git"
nextStepFile: "./step-05-confirm.md"
---

# Step 4: Load PR Diff

**Progress: Step 4 of 5** — Loading diff and commit history

## STEP GOAL

Load the complete diff. Use the platform's native diff command when available
(matches exactly what reviewers see on the platform). Fall back to `git diff` otherwise.

## Sequence of Instructions

### 1. Load Commit Log

```bash
git -C {target_repo} log --oneline {diff_range}
```

Store as `commit_log`. Count → `commit_count`.

### 2. Load Diff

Use the first available method:

**GitHub** (if `active_platform = github` and `pr_number` is set):
```bash
gh pr diff {pr_number} --repo {platform_repo}
```

**GitLab** (if `active_platform = gitlab` and `pr_number` is set):
```bash
glab mr diff {pr_number} --repo {platform_repo}
```

**Azure DevOps** (if `active_platform = azure` and `pr_number` is set):
```bash
az repos pr show --id {pr_number} --output json
# then use git diff with the extracted base/head SHAs
git -C {target_repo} diff {base_branch}...{selected_branch}
```

**Bitbucket / None / fallback** (any other case):
```bash
git -C {target_repo} diff {diff_range}
```

### 3. Load File Change Summary

```bash
git -C {target_repo} diff --stat {diff_range}
```

Store as `diff_stats`. Extract `files_changed_count`, `files_changed` list, `lines_added`, `lines_removed`.

### 4. Assess Size and Set Strategy

- **< 300 lines**: `diff_strategy = 'full'` ✅
- **300–1000 lines**: `diff_strategy = 'chunked'` 📋
- **> 1000 lines**: `diff_strategy = 'chunked'` ⚠️ warn user

```
📊 Diff loaded:
  Platform: {active_platform}
  Commits:  {commit_count}
  Files:    {files_changed_count}
  Lines:    +{lines_added} / -{lines_removed}
  Strategy: {diff_strategy}
```

### 5. Update Frontmatter and Load Next Step

Add `step-04-load-diff` to `stepsCompleted`.

Read fully and follow: `{nextStepFile}`
