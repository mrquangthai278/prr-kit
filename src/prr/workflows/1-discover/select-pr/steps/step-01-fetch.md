---
name: "step-01-fetch"
description: "Detect platform and run git fetch to ensure latest remote state"
nextStepFile: "./step-02-list-branches.md"
---

# Step 1: Detect Platform and Fetch Latest

**Progress: Step 1 of 5** — Detecting platform and ensuring up-to-date remote state

## MANDATORY EXECUTION RULES

- 🛑 ALWAYS fetch before listing — stale branch info leads to wrong reviews
- 📖 Read this entire file before taking any action
- ✅ Communicate in `{communication_language}`

## Sequence of Instructions

### 1. Detect Platform

If `{platform}` is `auto` or empty, detect from the git remote URL:

```bash
git -C {target_repo} remote get-url origin
```

Map remote URL to platform:

| Remote URL pattern | Platform |
|-------------------|----------|
| `github.com` | `github` |
| `gitlab.com` or self-hosted GitLab | `gitlab` |
| `dev.azure.com` or `visualstudio.com` | `azure` |
| `bitbucket.org` | `bitbucket` |
| No remote / local only | `none` |

Set `{detected_platform}` = detected value.

Also extract `{detected_platform_repo}` from the URL if `{platform_repo}` is empty:
- GitHub/GitLab/Bitbucket: extract `owner/repo` (strip `.git` suffix)
- Azure DevOps: extract `org/project/repo` from `dev.azure.com/{org}/{project}/_git/{repo}`

Display:
```
🔍 Platform detected: {detected_platform}
   Remote: {platform_repo or detected_platform_repo}
```

If platform cannot be detected, set `{detected_platform}` = `none` and continue.

### 2. Fetch Latest from Remote

```bash
git -C {target_repo} fetch origin --prune
```

**If fetch succeeds:** Show `✓ Fetched latest from remote` and proceed.

**If fetch fails:**
- Show the error message
- Ask user: Retry / Continue with local state / Cancel
- Wait for response before proceeding

### 3. Update Frontmatter and Load Next Step

Add `step-01-fetch` to `stepsCompleted`. Store `detected_platform` and `detected_platform_repo` for use in subsequent steps.

Read fully and follow: `{nextStepFile}`
