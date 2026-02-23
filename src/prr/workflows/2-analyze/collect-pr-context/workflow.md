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

### 5. Stack-Specific Rules (automatic)
Loaded from `_prr/prr/data/stacks/{stack}.md` based on detected technology. Detection is automatic from file extensions, imports, and config files — see `step-01-analyze-files.md` for full detection logic.

**Frontend Frameworks:** vue3, react, angular, svelte, nextjs, nuxtjs, astro, solidjs, htmx, qwik
**Styling:** typescript, tailwindcss, css, sass, styled-components
**State Management:** redux, mobx, zustand
**Backend — Node.js:** nestjs, expressjs, fastify, hono
**Backend — Python:** fastapi, django, flask, python
**Backend — Java:** spring-boot, java
**Backend — JVM:** kotlin, scala
**Backend — .NET:** csharp
**Backend — Systems:** cpp, rust, zig
**Backend — Functional:** elixir, phoenix, haskell
**Backend — Scripting:** go, gin, fiber, actix, axum, lua, bash, php, laravel, rails
**Database / ORM:** sql, postgresql, mysql, sqlite, mongodb, redis, dynamodb, prisma, typeorm, sequelize, drizzle
**BaaS / Cloud:** firebase, supabase, aws-cdk
**Testing — Unit/Integration:** jest-vitest, pytest, junit, playwright, cypress
**Infrastructure:** docker, kubernetes, helm, terraform, github-actions, ansible, nginx
**API Layer:** graphql, grpc, trpc, apollo, socket-io
**Mobile:** react-native, flutter, expo, android, swift
**Desktop:** electron, tauri
**Runtime:** deno, bun, node
**Game Dev:** unity, unreal, godot, phaser, bevy, babylonjs, opengl, vulkan, libgdx, love2d, monogame, pygame
**AI/ML:** langchain, openai-api, pytorch, scikit-learn
**Web Components:** lit, htmx
**Blockchain:** solidity
**Systems/WASM:** wasm

Each stack file contains Security / Performance / Architecture / Code Quality / Common Bugs rules organized by severity (CRITICAL / HIGH / MEDIUM / LOW). Rules are injected into the knowledge base and applied by all reviewers (GR, SR, PR, AR, BR).

If a stack has no matching data file, skip it silently and proceed with general rules only.

### 6. External Sources (optional)
- Company standards APIs
- Confluence/Wiki pages
- Remote documentation

### 7. MCP Tools (if available in session)
- **Knowledge base MCPs** (Confluence, Notion, Obsidian) → team standards, ADRs not in local docs
- **Project management MCPs** (Jira, Linear, GitHub Issues) → linked issue, acceptance criteria
- **Design MCPs** (Figma, Zeplin) → design specs for UI changes
- **Code intelligence MCPs** (Sourcegraph, GitHub) → similar patterns in codebase

### 8. RAG Systems (if configured)
- AWS Bedrock knowledge base
- GitHub Graph RAG
- Custom vector databases
- Query for: similar patterns, past decisions, architecture examples

## WORKFLOW ARCHITECTURE

4-step process:
1. **Analyze files** changed in PR — extract metadata, domains, and **detect technology stacks**
2. **Collect context** from all sources: primary docs, config files, standards docs, inline annotations, **stack-specific rules**, MCP tools, RAG systems
3. **Manual context input** — prompt the user for any additional context (business rationale, focus areas, known trade-offs). Skip automatically if `context_collection.skip_manual_input_context: true` in config. If the user provides input, it is marked **⚠️ IMPORTANT** and reviewers treat it as highest-priority context
4. **Build PR-specific knowledge base** — structured YAML with all context, stack rules, manual context, and reviewer guidance

## INITIALIZATION

Load config from `{main_config}`.

Check if PR number is available:
- If available: use `pr-{pr_number}-context.yaml`
- If not: use `pr-{branch_name}-context.yaml`

## EXECUTION

Read fully and follow: `{nextStep}`
