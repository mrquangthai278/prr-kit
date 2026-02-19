---
name: "step-01-load-context"
description: "Load PR context and diff for analysis"
nextStepFile: "./step-02-classify.md"
---

# Step 1: Load PR Context

## STEP GOAL

Load the PR context file and the actual code diff for analysis.

## Sequence of Instructions

### 1. Load PR Context

Read `{review_output}/current-pr-context.yaml`.

If file not found:
```
❌ No PR selected yet. Please run [SP] Select PR first.
```
Stop workflow.

### 2. Load the Diff

Run `git diff {base_branch}...{target_branch}` in `{target_repo}`.

Also run `git log --oneline {base_branch}...{target_branch}` for commit messages.

### 3. Load Commit Messages

Commit messages often reveal the intent of the PR — critical for understanding why changes were made.

### 4. Update and Load Next Step

Add `step-01-load-context` to `stepsCompleted`. Load: `{nextStepFile}`
