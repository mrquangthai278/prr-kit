---
name: "step-01-format"
description: "Parse findings and build platform-specific comment payload"
nextStepFile: "./step-02-post.md"
---

# Step 1: Build Comment Payload

## Sequence of Instructions

### 1. Check Prerequisites

Verify `{review_output}/current-pr-context.yaml` exists and contains:
- `pr_number` — if missing, show: `❌ No PR number found. Run [SP] Select PR first.`
- `target_branch`, `base_branch`

Verify platform CLI is available:

| Platform | Check command | Error message |
|----------|--------------|---------------|
| github | `gh auth status` | `❌ Run: gh auth login` |
| gitlab | `glab auth status` | `❌ Run: glab auth login` |
| azure | `az account show` | `❌ Run: az login && az devops configure` |
| bitbucket | check env `BB_TOKEN` or `~/.config/bb` | `❌ Set Bitbucket credentials` |
| none | — | show: `ℹ️ No platform configured — findings saved to report only.` then stop |

### 2. Get Head Commit SHA

**GitHub / GitLab / Bitbucket:**
```bash
git -C {target_repo} rev-parse origin/{selected_branch}
```
Or use `{pr_head_sha}` if already stored from select-pr step.

**Azure DevOps:**
```bash
az repos pr show --id {pr_number} --query lastMergeSourceCommit.commitId -o tsv
```

Store as `{commit_sha}`.

### 3. Load Review Report

Find the latest report in `{review_output}/review-*.md`.
Sort by modification time, take the most recent.

### 4. Parse All Findings

Scan the report and extract every finding:
- `severity`: 🔴 Blocker / 🟡 Warning / 🟢 Suggestion / 📌 Question
- `category`: security / performance / architecture / general
- `file_path`: relative path (e.g. `src/auth/login.js`) — null if not specified
- `line_number`: integer — null if not specified
- `description`: the issue text
- `suggested_fix`: fix/suggestion text

**Classify:**
- **Inline candidates**: `file_path` and `line_number` both present
- **Fallback findings**: no file or line reference

Limit inline comments to 30 max: include all 🔴 Blockers first, then 🟡 Warnings, then 🟢 Suggestions. Move overflow to fallback.

### 5. Format Comment Bodies

**🔴 Blocker:**
```
🔴 **[BLOCKER]** {emoji} {description}
**Risk:** {what could go wrong}
**Fix:** {suggested_fix}
```

**🟡 Warning:**
```
🟡 **[WARNING]** {emoji} {description}
**Why it matters:** {explanation}
**Suggestion:** {suggested_fix}
```

**🟢 Suggestion:**
```
🟢 **[SUGGESTION]** {description}
{suggested_fix}
```

Category emojis: 🔒 security · ⚡ performance · 🏗️ architecture · 👁️ general

### 6. Build Summary Body

```markdown
## 🔍 AI Code Review

**PR:** `{selected_branch}` → `{base_branch}` | **Date:** {date} | **Reviewer:** {user_name}

**Verdict:** {verdict}

| Category | 🔴 | 🟡 | 🟢 |
|----------|----|----|----|
| 🔒 Security | {n} | {n} | {n} |
| ⚡ Performance | {n} | {n} | {n} |
| 🏗️ Architecture | {n} | {n} | {n} |
| 👁️ General | {n} | {n} | {n} |

### Executive Summary
{bullets}

{fallback_findings_section}

---
*{inline_count} inline comments on code lines*
```

Verdict logic: any 🔴 → `REQUEST_CHANGES` / only 🟡 → `COMMENT` / none → `APPROVE`

### 7. Build Platform Payload

**GitHub** — single JSON file for Reviews API:
```json
{
  "commit_id": "{commit_sha}",
  "body": "{summary_body}",
  "event": "REQUEST_CHANGES|COMMENT|APPROVE",
  "comments": [
    { "path": "{file_path}", "line": {line_number}, "side": "RIGHT", "body": "{body}" }
  ]
}
```
Write to `{review_output}/.prr-payload.json`.

**GitLab** — separate JSON per inline comment:
```json
{ "body": "{body}", "position": { "base_sha": "{base_sha}", "head_sha": "{commit_sha}",
  "start_sha": "{base_sha}", "position_type": "text",
  "new_path": "{file_path}", "new_line": {line_number} } }
```
Write each as `{review_output}/.prr-payload-{n}.json`. Write summary as `.prr-summary.md`.

**Azure DevOps** — thread per inline comment:
```json
{ "comments": [{ "parentCommentId": 0, "content": "{body}", "commentType": 1 }],
  "threadContext": { "filePath": "{file_path}",
    "rightFileStart": { "line": {line_number}, "offset": 1 },
    "rightFileEnd": { "line": {line_number}, "offset": 1 } },
  "status": "active" }
```
Write each as `{review_output}/.prr-thread-{n}.json`.

**Bitbucket** — inline comment per finding:
```json
{ "content": { "raw": "{body}" },
  "inline": { "to": {line_number}, "path": "{file_path}" } }
```
Write each as `{review_output}/.prr-bb-{n}.json`.

### 8. Display Preview

```
📋 Payload ready:
  Platform:          {active_platform}
  Inline comments:   {inline_count}
  Fallback comments: {fallback_count}
  Verdict:           {event}
```

### 9. Load Next Step

Add `step-01-format` to `stepsCompleted`. Load: `{nextStepFile}`
