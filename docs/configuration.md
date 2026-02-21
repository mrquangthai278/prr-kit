# Configuration Reference

`_prr/prr/config.yaml` is the main configuration file for prr-kit. It is created automatically during `npx prr-kit install`, but can be edited manually at any time.

A full template is available at [`src/prr/config-template.yaml`](../src/prr/config-template.yaml).

---

## Full Schema

```yaml
# ─── Identity ──────────────────────────────────────────────────────────────
user_name: YourName                  # How agents address you in responses
communication_language: English      # Language for all review output

# ─── Project ───────────────────────────────────────────────────────────────
project_name: my-project             # Display name (cosmetic only)
target_repo: .                       # Path to git repo (. = current directory)

# ─── Platform ──────────────────────────────────────────────────────────────
platform: auto                       # auto | github | gitlab | azure | bitbucket
platform_repo: "owner/repo"          # e.g. "acme/backend-api"
                                     # Required for: PR listing, inline comment posting
                                     # Leave blank for local-only mode (git diff only)

# ─── Output ────────────────────────────────────────────────────────────────
output_folder: _prr-output           # Relative output folder name
review_output: /abs/path/_prr-output/reviews  # Absolute path where reports are written

# ─── Context Collection ────────────────────────────────────────────────────
context_collection:
  enabled: true
  mode: pr-specific                  # Always fresh per PR — never cached

  primary_sources:                   # Read if file exists in target_repo
    - CLAUDE.md
    - AGENTS.md
    - .github/CLAUDE_CODE_RULES.md
    - .clauderules

  config_files:                      # Matched to file types changed in the PR
    - .eslintrc*
    - .prettierrc*
    - tsconfig.json
    - vite.config.*
    - webpack.config.*
    - pyproject.toml
    - .flake8

  standards_docs:                    # Read relevant sections based on PR domains
    - CONTRIBUTING.md
    - ARCHITECTURE.md
    - docs/**/*.md

  inline_annotations:                # Extracted from changed files in the diff
    enabled: true
    patterns:
      - "@context:"                  # General context hint
      - "@security:"                 # Security requirement
      - "@pattern:"                  # Required pattern to follow
      - "@rule:"                     # Specific rule reference

# ─── External Sources ──────────────────────────────────────────────────────
external_sources:
  enabled: false                     # Set true to activate MCP + RAG enrichment

  mcp:
    enabled: true
    # Declare what kinds of context you want from MCP tools.
    # Claude auto-discovers available tools in the session and maps them to intents.
    # Remove intents you don't need.
    intents:
      - knowledge_base               # Confluence, Notion → team standards, ADRs
      - project_management           # Jira, Linear → linked issue + acceptance criteria
      - design                       # Figma, Zeplin → design specs (UI PRs only)
      # - code_intelligence          # Sourcegraph → similar patterns (uncomment if needed)

    hints:
      branch_issue_pattern: "([A-Z]+-\\d+)"
      # Regex to extract issue key from branch name.
      # Examples:
      #   feature/ENG-123-auth    → ENG-123
      #   fix/PROJ-456-crash      → PROJ-456
      #
      # confluence_space: ENG      # Narrow Confluence searches to a space (optional)
      # jira_project: PROJ         # Narrow Jira searches to a project (optional)

  rag:
    enabled: false                   # Set true if you have RAG tools configured
    intents:
      - similar_patterns             # Find similar code patterns in codebase
      - past_decisions               # Previous review decisions for similar code
      # - architecture_examples      # Architecture docs embedded in vector store

  sources: []
  # Plain URL sources — fetched via WebFetch regardless of MCP availability.
  # Always active when external_sources.enabled: true.
  #
  # sources:
  #   - type: url
  #     name: Shared ESLint config
  #     url: https://raw.githubusercontent.com/org/standards/main/eslint.md
  #   - type: url
  #     name: Security guidelines
  #     url: https://wiki.company.com/public/security-standards
```

---

## Field Reference

### Identity

| Field | Default | Description |
|---|---|---|
| `user_name` | System username | How agents address you in review output |
| `communication_language` | `English` | Language for all review responses. Examples: `Vietnamese`, `Japanese`, `French` |

### Project

| Field | Default | Description |
|---|---|---|
| `project_name` | directory name | Display name used in reports (cosmetic) |
| `target_repo` | `.` | Path to the git repository to review. Use `.` if config is inside the repo, or an absolute/relative path to another repo |

### Platform

| Field | Default | Description |
|---|---|---|
| `platform` | `auto` | Platform to use for PR listing and inline comments. `auto` detects from git remote URL |
| `platform_repo` | — | `owner/repo` slug. Required for `gh pr list`, `gh pr view`, posting inline comments. Leave blank for local-only (git diff) mode |

### Output

| Field | Default | Description |
|---|---|---|
| `output_folder` | `_prr-output` | Relative folder name created in the project root |
| `review_output` | `{output_folder}/reviews` | Absolute path where all review reports and context files are written |

---

## Context Collection

Context is collected **automatically** after [DP] Describe PR — fresh per PR, never cached.

### How it works

1. **Analyze changed files** — detect file types, categories (`pinia-store`, `vue-component`, etc.) and domains (`authentication`, `state-management`, etc.)
2. **Collect from matching sources** — only sources relevant to the changed files and domains are read
3. **Build knowledge base** — written to `{review_output}/pr-{branch}-context.yaml`, loaded by all reviewers

### Inline Annotations

Add `@context:`, `@security:`, `@pattern:`, `@rule:` comments in your source code — they are automatically extracted during context collection and included in the knowledge base:

```js
// @context: This module handles user authentication
// @security: All inputs must be validated before storage
// @pattern: Use repository pattern for data access
// @rule: ESLint vue/multi-word-component-names must be followed
```

---

## External Sources

External sources enrich context with information that lives outside the repository. They are **optional** and **gracefully skipped** if tools are unavailable.

### MCP Tools

prr-kit does **not** require you to configure specific MCP tools — Claude auto-discovers whatever tools are available in the session and maps them to the `intents` you declare.

| Intent | Tool examples | What it provides |
|---|---|---|
| `knowledge_base` | Confluence MCP, Notion MCP | Team standards, ADRs, policies not in local docs |
| `project_management` | Jira MCP, Linear MCP, GitHub Issues MCP | Linked issue + acceptance criteria (extracted from branch name) |
| `design` | Figma MCP, Zeplin MCP | Design specs for UI-touching PRs |
| `code_intelligence` | Sourcegraph MCP | Similar code patterns in the codebase |

**Branch issue key extraction:** If `hints.branch_issue_pattern` is set, Claude extracts the issue key from the branch name and fetches it from the PM tool:

```
branch: feature/ENG-123-add-auth
pattern: ([A-Z]+-\d+)
→ fetches: ENG-123
→ extracts: title, description, acceptance criteria
→ used as review checklist
```

### RAG Systems

If a RAG tool (AWS Bedrock knowledge base, GitHub Graph RAG, custom vector DB) is available in the session:

| Intent | What it queries |
|---|---|
| `similar_patterns` | Similar implementations of the same domain in the codebase |
| `past_decisions` | Previous review decisions for similar code — avoids repeating findings |
| `architecture_examples` | Architecture docs embedded in the vector store |

### URL Sources

Plain URLs fetched via WebFetch — always active when `external_sources.enabled: true`:

```yaml
sources:
  - type: url
    name: Shared ESLint config
    url: https://raw.githubusercontent.com/org/standards/main/eslint.md
```

### Graceful degradation

All external sources fail silently — if a tool is unavailable or returns empty results, the review continues with local context only. **The review workflow never fails because of an external tool.**

---

## Minimal Config (local-only mode)

```yaml
user_name: Alice
communication_language: English
target_repo: .
review_output: ./_prr-output/reviews

context_collection:
  enabled: true
  mode: pr-specific
  config_files: [.eslintrc*, .prettierrc*, tsconfig.json]
  standards_docs: [CONTRIBUTING.md, ARCHITECTURE.md]
  inline_annotations:
    enabled: true
    patterns: ["@context:", "@security:", "@pattern:", "@rule:"]

external_sources:
  enabled: false
```

## Full Config (with MCP + GitHub)

```yaml
user_name: Alice
communication_language: English
project_name: acme-backend
target_repo: .
platform: github
platform_repo: "acme/backend-api"
review_output: /home/alice/projects/acme/_prr-output/reviews

context_collection:
  enabled: true
  mode: pr-specific
  primary_sources: [CLAUDE.md, AGENTS.md, .github/CLAUDE_CODE_RULES.md]
  config_files: [.eslintrc*, .prettierrc*, tsconfig.json, vite.config.*]
  standards_docs: [CONTRIBUTING.md, ARCHITECTURE.md, docs/**/*.md]
  inline_annotations:
    enabled: true
    patterns: ["@context:", "@security:", "@pattern:", "@rule:"]

external_sources:
  enabled: true
  mcp:
    enabled: true
    intents: [knowledge_base, project_management, design]
    hints:
      branch_issue_pattern: "([A-Z]+-\\d+)"
      confluence_space: ENG
  rag:
    enabled: false
    intents: [similar_patterns, past_decisions]
  sources:
    - type: url
      name: Shared ESLint standards
      url: https://raw.githubusercontent.com/acme/standards/main/eslint.md
```

---

## Output Files

All output is written to `review_output`:

| File | Description |
|---|---|
| `current-pr-context.yaml` | Active session state — which PR is selected, reviews completed |
| `pr-{branch}-context.yaml` | Per-PR knowledge base built during context collection |
| `review-{branch}-{date}.md` | Final review report |

Use `[CL] Clear` from the agent menu to remove these files when starting fresh.
