---
name: describe-pr
description: "Auto-generate PR type classification, executive summary, and file-by-file walkthrough"
main_config: "{project-root}/_prr/prr/config.yaml"
nextStep: "./steps/step-01-load-context.md"
---

# Describe PR Workflow

**Goal:** Generate a structured PR description — type classification, executive summary, and file-by-file walkthrough — to give reviewers full context before diving into detailed review.

## WORKFLOW ARCHITECTURE

4-step sequential process:
1. Load PR context (from select-pr output)
2. Classify PR type (bugfix/feature/refactor/docs/test/chore)
3. Generate file-by-file walkthrough (what changed and why)
4. Output structured PR description to file

## INITIALIZATION

Load config from `{main_config}`.
Load PR context from `{review_output}/current-pr-context.yaml`.
If context file does not exist, instruct user to run [SP] Select PR first.

## EXECUTION

Read fully and follow: `{nextStep}`
