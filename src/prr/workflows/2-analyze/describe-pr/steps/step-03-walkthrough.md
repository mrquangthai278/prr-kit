---
name: "step-03-walkthrough"
description: "Generate file-by-file walkthrough explaining what changed and why"
nextStepFile: "./step-04-output.md"
---

# Step 3: File-by-File Walkthrough

## STEP GOAL

Generate a concise walkthrough of each changed file — what changed, why it changed (based on diff + commit context), and what reviewers should pay attention to.

## Sequence of Instructions

### 1. Group Files by Purpose

Group changed files logically:
- **Backend** (controllers, services, models, routes, middleware)
- **Frontend** (components, views, stores, utils)
- **Config/Infrastructure** (docker, env, CI, package.json)
- **Tests**
- **Docs**

### 2. For Each Changed File, Generate Summary

For each file (or group of related files), describe:
- **What changed**: 1-2 sentences on the actual change
- **Why** (inferred from commit messages and context): 1 sentence
- **Review focus**: what should reviewers specifically look at

Format:
```
📄 backend/controllers/authController.js (+45 -12)
   What: Added JWT refresh token endpoint and token blacklisting logic
   Why:  Fixes security issue where expired tokens could still be used
   Focus: Check token validation logic and blacklist cleanup mechanism
```

### 3. Load Next Step

Add `step-03-walkthrough` to `stepsCompleted`. Load: `{nextStepFile}`
