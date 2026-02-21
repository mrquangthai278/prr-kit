---
name: collect-pr-context
description: "Collect fresh, PR-specific context from multiple sources after describing the PR"
main_config: "{project-root}/_prr/prr/config.yaml"
nextStep: "./steps/step-01-analyze-files.md"
output_file: "{review_output}/pr-{pr_number}-context.yaml"
---

# Collect PR-Specific Context Workflow

**Goal:** Dynamically collect context relevant to THIS specific PR from multiple sources. Context is always fresh and PR-specific, never cached.

## WHY THIS APPROACH

**Problems with static cached context:**
- ❌ Goes stale when rules change
- ❌ User must remember to refresh manually
- ❌ Includes irrelevant context for small PRs

**Benefits of dynamic PR-specific context:**
- ✅ Always latest (collected fresh each time)
- ✅ PR-specific (only rules/docs relevant to files changed)
- ✅ No manual refresh needed
- ✅ Can extract inline code annotations
- ✅ Supports multiple sources (docs, configs, code, external APIs)

## WHEN TO RUN

**Automatically** after [DP] Describe PR in the quick workflow.
Runs before any review workflows to provide fresh context.

## CONTEXT SOURCES

### 1. Primary Documentation
- `CLAUDE.md` - Project-wide instructions
- `AGENTS.md` - Agent-specific guidelines
- `.github/CLAUDE_CODE_RULES.md`

### 2. Config Files (based on file types changed)
- `.eslintrc*` - Linting rules
- `.prettierrc*` - Formatting rules
- `tsconfig.json` - TypeScript config
- `vite.config.*` / `webpack.config.*` - Build config

### 3. Standards Documents
- `CONTRIBUTING.md` - Coding standards
- `ARCHITECTURE.md` - Architecture patterns
- `docs/**/*.md` - Domain-specific docs

### 4. Inline Code Annotations
Extract from changed files:
- `@context:` - Contextual information
- `@security:` - Security requirements
- `@pattern:` - Required patterns
- `@rule:` - Specific rules

### 5. External Sources (optional)
- Company standards APIs
- Confluence/Wiki pages
- Remote documentation

### 6. MCP Tools (if available in session)
- **Knowledge base MCPs** (Confluence, Notion, Obsidian) → team standards, ADRs not in local docs
- **Project management MCPs** (Jira, Linear, GitHub Issues) → linked issue, acceptance criteria
- **Design MCPs** (Figma, Zeplin) → design specs for UI changes
- **Code intelligence MCPs** (Sourcegraph, GitHub) → similar patterns in codebase

### 7. RAG Systems (if configured)
- AWS Bedrock knowledge base
- GitHub Graph RAG
- Custom vector databases
- Query for: similar patterns, past decisions, architecture examples

## WORKFLOW ARCHITECTURE

3-step process:
1. Analyze files changed in PR
2. Collect context from all sources (local + external tools + RAG)
3. Build PR-specific knowledge base

## INITIALIZATION

Load config from `{main_config}`.

Check if PR number is available:
- If available: use `pr-{pr_number}-context.yaml`
- If not: use `pr-{branch_name}-context.yaml`

## EXECUTION

Read fully and follow: `{nextStep}`
