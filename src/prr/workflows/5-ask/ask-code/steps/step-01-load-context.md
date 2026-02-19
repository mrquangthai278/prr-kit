---
name: "step-01-load-context"
description: "Load PR context and ask for the user's question"
nextStepFile: "./step-02-answer.md"
---

# Step 1: Load Context and Get Question

## Sequence of Instructions

### 1. Load PR Context

Read `{review_output}/current-pr-context.yaml`.

If not found, prompt user to run [SP] Select PR first.

### 2. Load the Diff

Run `git diff {base_branch}...{target_branch}` in `{target_repo}`.

### 3. Ask the User's Question

```
🤔 What would you like to ask about the code changes in this PR?

You can ask about:
  • Specific files or functions (e.g., "explain authController.js:handleLogin")
  • Design decisions (e.g., "why was X approach used?")
  • Potential issues (e.g., "what could go wrong with this change?")
  • Interactions (e.g., "how does this affect the existing session handling?")
```

**HALT — wait for user's question before proceeding.**

### 4. Load Next Step

Add `step-01-load-context` to `stepsCompleted`. Load: `{nextStepFile}`
