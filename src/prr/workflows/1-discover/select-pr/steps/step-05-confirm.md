---
name: "step-05-confirm"
description: "Show PR scope summary and confirm before proceeding to review"
contextOutputFile: "{review_output}/current-pr-context.yaml"
---

# Step 5: Confirm Scope

**Progress: Step 5 of 5** — Confirming review scope

## STEP GOAL

Show a clear summary of what will be reviewed, write PR context to file, and confirm the user wants to proceed.

## Sequence of Instructions

### 1. Display Scope Summary

Present a clear summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PR Review Scope
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Target:  {selected_branch}
  Base:    {base_branch}
  PR #:    {pr_number}  (if applicable)
  Title:   {pr_title}  (if available)

📊 Diff Statistics:
  Commits: {commit_count}
  Files:   {files_changed_count}
{diff_stats}

⚠️  Review Strategy: {diff_strategy}
  (chunked = reviews will process file by file for accuracy)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommended reviews for this PR:
  [DP] Describe PR — understand changes before reviewing
  [GR] General Review — always recommended
  [SR] Security Review — if auth/API/user data touched
  [PR] Performance Review — if DB/async/frontend affected
  [AR] Architecture Review — if new patterns/structure added
```

### 2. Write PR Context File

Write `{contextOutputFile}` with:

```yaml
pr:
  target_branch: "{selected_branch}"
  base_branch: "{base_branch}"
  pr_number: "{pr_number}"
  pr_title: "{pr_title}"
  diff_stats: |
    {diff_stats}
  commit_count: {commit_count}
  files_changed:
    {files_changed_list}
  diff_strategy: "{diff_strategy}"
  date: "{date}"
review:
  completed: []
  findings: []
```

### 3. Ask for Confirmation

```
✅ Ready to review. Which review would you like to run first?
   (Enter a command from the menu, or type 'DP' to start with Describe PR)
```

**HALT — wait for user response.** The workflow is complete. User returns to the agent menu.
