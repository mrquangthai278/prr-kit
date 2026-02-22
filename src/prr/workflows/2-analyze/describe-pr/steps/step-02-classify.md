---
name: "step-02-classify"
description: "Classify PR type and determine review recommendations"
nextStepFile: "./step-03-walkthrough.md"
---

# Step 2: Classify PR

## STEP GOAL

Analyze the diff and commit messages to classify the PR type and generate review recommendations.

## Sequence of Instructions

### 1. Classify PR Type

Analyze the diff to determine the PRIMARY type (pick the best match):

| Type | Indicators |
|------|-----------|
| `bugfix` | Fix in logic, error handling, condition fix |
| `feature` | New files, new functions, new UI components |
| `refactor` | Same behavior, restructured code, renamed variables |
| `performance` | Caching, query optimization, async improvements |
| `security` | Auth changes, input validation, dependency security updates |
| `hotfix` | Urgent production fix, usually a targeted single change |
| `test` | Only test file changes |
| `docs` | Only documentation/comment changes |
| `config` | Config files, env, CI/CD changes |
| `chore` | Dependency updates, tooling, build changes |

### 2. Assess Risk Level

Based on PR type and what was changed:
- **🔴 High Risk**: Auth changes, payment logic, user data handling, security-critical paths
- **🟡 Medium Risk**: Core business logic, API changes, database schema
- **🟢 Low Risk**: UI tweaks, docs, test additions, minor refactors

### 3. Generate Review Recommendations

Based on classification, recommend specific reviews:
- bugfix → GR + SR (if security-related) + BR (if user-facing)
- feature → GR + AR + PR (if DB/async) + BR (user impact + feature completeness)
- security → SR (mandatory) + GR + BR (business/compliance risk)
- performance → PR + GR + BR (if user-facing slowness)
- refactor → AR + GR
- hotfix → GR + SR + BR (high deployment risk — assess before shipping)
- test → GR (light)
- docs → (skip or GR light)
- config → GR
- chore → GR (light)
- All high-risk PRs → SR mandatory + BR mandatory

### 4. Load Next Step

Add `step-02-classify` to `stepsCompleted`. Load: `{nextStepFile}`
