---
name: collect-project-context
description: "Collect project coding standards, conventions, architecture rules, and business context — stored once and used by all review workflows"
main_config: "{project-root}/_prr/prr/config.yaml"
nextStep: "./steps/step-01-scan-configs.md"
output_file: "{review_output}/project-context.yaml"
---

# Collect Project Context Workflow

**Goal:** Build a reusable knowledge base about THIS project — its coding standards, architecture patterns, business domain, and team conventions. All review workflows load this context so findings are accurate and relevant to the project, not just generic best practices.

## WHY THIS MATTERS

Without project context, AI reviewers will:
- Flag code that intentionally follows project conventions
- Miss violations of domain-specific rules
- Suggest patterns that contradict what the team has established
- Not understand business logic to assess correctness

With project context, reviewers know:
- What rules are enforced (ESLint, Prettier, custom linting)
- What architecture patterns the team follows
- What the business domain is and key domain terms
- What to prioritize vs ignore for this specific codebase

## WHEN TO RUN

- **First time** before any review in a new project
- **Re-run** when project conventions change significantly
- Output is saved to `{review_output}/project-context.yaml` and reused across all PRs

## WORKFLOW ARCHITECTURE

4-step process:
1. Scan repo for config files and standards documents
2. Extract coding rules from linting/formatting configs
3. Ask user for domain and architecture context
4. Save complete project context to YAML file

## INITIALIZATION

Load config from `{main_config}`.
Check if `{review_output}/project-context.yaml` already exists.

If it exists, ask:
```
📋 Project context already exists (created: {existing_date}).
  [U] Update — re-scan and update context
  [K] Keep — use existing context, skip this workflow
  [R] Replace — start fresh
```

Halt and wait for user choice before proceeding.

## EXECUTION

Read fully and follow: `{nextStep}`
