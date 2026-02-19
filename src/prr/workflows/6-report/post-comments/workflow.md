---
name: post-comments
description: "Post review findings as inline comments on the PR/MR via platform CLI"
main_config: "{project-root}/_prr/prr/config.yaml"
nextStep: "./steps/step-01-format.md"
---

# Post Comments Workflow

**Goal:** Post review findings as **inline comments on the exact code lines** of the PR/MR, plus a formal summary — using the appropriate platform CLI.

## SUPPORTED PLATFORMS

| Platform | Tool | Inline Comments | Summary Review |
|----------|------|----------------|----------------|
| GitHub | `gh api` | ✅ GitHub Reviews API | ✅ |
| GitLab | `glab` / GitLab API | ✅ MR note threads | ✅ |
| Azure DevOps | `az devops` | ✅ PR thread comments | ✅ |
| Bitbucket | Bitbucket REST API | ✅ inline comments | ✅ |
| None / local | — | ❌ not available | saves to file |

## WORKFLOW ARCHITECTURE

2-step process:
1. Parse findings → extract file/line → build platform-specific payload
2. Post via platform CLI/API → verify → clean up

## PREREQUISITES

Depends on `{active_platform}`:
- **GitHub**: `gh` CLI authenticated — `gh auth status`
- **GitLab**: `glab` CLI authenticated — `glab auth status`
- **Azure DevOps**: `az` CLI with `azure-devops` extension — `az devops configure`
- **Bitbucket**: Bitbucket App Password set in `~/.config/bb` or env vars
- **None**: no prerequisites — saves report only

## INITIALIZATION

Load config from `{main_config}`.
Load PR context from `{review_output}/current-pr-context.yaml`.
Use `{active_platform}` (or detect from `{platform}` config).

## EXECUTION

Read fully and follow: `{nextStep}`
