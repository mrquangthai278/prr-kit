# Configuration Reference

`_prr/prr/config.yaml` is the main configuration file for prr-kit. It is created automatically during `npx prr-kit install`, but can be edited manually at any time.

A full template is available at [`src/prr/config-template.yaml`](src/prr/config-template.yaml).

> **Quick start:** After installing, open your IDE and run `/prr-quick` for the full pipeline in one command, or `/prr-master` for the full menu.

---

## 1. config.yaml overview

```yaml
user_name: YourName
communication_language: English
project_name: my-project
target_repo: .
platform: auto
platform_repo: "owner/repo"
review_output: /abs/path/_prr-output/reviews
auto_post_comment: false

context_collection:
  enabled: true
  skip_manual_input_context: false
  mode: pr-specific

external_sources:
  enabled: false
```

---

## 2. Core options

| Field | Default | Example | Description |
|---|---|---|---|
| `user_name` | set during install | `Alice` | Your name, used in review reports and comments |
| `communication_language` | `English` | `Vietnamese` | Language for all reviewer agent responses. Any natural language works: `English`, `Vietnamese`, `Japanese`, `French`, etc. |
| `project_name` | directory name | `acme-backend` | Display name used in reports (cosmetic only) |
| `target_repo` | `.` | `../my-app` | Path to the repository being reviewed. Use `.` if config is inside the repo, or a relative/absolute path to review a different repo |
| `platform` | `auto` | `github` | Git platform. `auto` detects from the git remote URL automatically. Options: `auto`, `github`, `gitlab`, `azure`, `bitbucket`, `none` |
| `platform_repo` | — | `acme/backend-api` | Repository slug in `owner/repo` format. Required for PR listing and inline comment posting. Leave blank for local-only mode (git diff only) |
| `review_output` | set during install | `./_prr-output/reviews` | Path where Markdown review reports and context files are saved |
| `auto_post_comment` | `false` | `true` | Set to `true` to auto-post findings after every review — skips the PC prompt in quick workflow |

---

## 3. Context collection

After describing the PR, the agent automatically collects fresh context relevant to the changed files. This context is loaded by all reviewer agents. Collection happens in four steps:

1. **Analyze changed files** — detect file types, categories (`vue-component`, `pinia-store`, etc.) and domains (`authentication`, `state-management`, etc.)
2. **Collect from matching sources** — only sources relevant to the changed files and domains are read
3. **Manual context input** — the agent pauses and asks the user for any additional context (business rationale, focus areas, known trade-offs). If the user provides input, it is marked **⚠️ IMPORTANT** and all reviewers treat it as the highest-priority context. Set `skip_manual_input_context: true` to skip this prompt
4. **Build knowledge base** — written to `pr-{branch}-context.yaml`, loaded by all reviewers

```yaml
context_collection:
  enabled: true
  skip_manual_input_context: false
  mode: pr-specific
```

| Option | Example | Description |
|---|---|---|
| `enabled` | `true` | Set to `false` to disable automatic context collection entirely |
| `skip_manual_input_context` | `false` | Set to `true` to skip the manual context input prompt. Default `false` — the agent will pause and ask the user for additional context before building the knowledge base |
| `mode` | `pr-specific` | Only supported value: `pr-specific` — always fresh context per PR, never cached |

### 3.0 Manual context input

After auto-collection, the agent pauses and asks:

```
💬 Do you have any additional context for the reviewers?

You can share:
  • Business context or requirements behind this PR
  • Known trade-offs or constraints you accepted
  • Specific areas you'd like reviewers to focus on
  • Known issues or technical debt to be aware of
  • Links to related tickets, designs, or decisions
```

If you provide a response, it is stored in the knowledge base under `manual_context` and flagged as **⚠️ IMPORTANT**. All reviewer agents read this section before starting their analysis and align their findings against it. Type `skip` or press Enter without input to continue without adding context.

Set `skip_manual_input_context: true` in your config to bypass this prompt entirely (useful for fully automated pipelines).

### 3.1 What the agent collects

The following sources are read automatically — no configuration needed. They are listed here so you know what to include in your project:

| Source | What the agent reads |
|---|---|
| **Primary docs** | `CLAUDE.md`, `AGENTS.md`, `.github/CLAUDE_CODE_RULES.md`, `.clauderules` — project-wide coding standards and agent instructions |
| **Config files** | Matched to changed file types: `.eslintrc*`, `.prettierrc*`, `tsconfig.json`, `vite.config.*`, `webpack.config.*`, `pyproject.toml`, `.flake8` |
| **Standards docs** | `CONTRIBUTING.md`, `ARCHITECTURE.md`, domain-specific docs under `docs/` |
| **Inline annotations** | `@context:`, `@security:`, `@pattern:`, `@rule:` comments extracted from changed files |

### 3.2 Inline annotation example

Add these tags anywhere in your source code — the agent extracts them automatically during context collection:

```js
// @context: This module handles user authentication
// @security: All inputs must be validated before storage
// @pattern: Use repository pattern for data access
// @rule: ESLint vue/multi-word-component-names must be followed
```

---

## 4. External sources

When enabled, the agent queries external tools for additional context — such as related tickets, design specs, or internal documentation. All external sources fail silently if unavailable.

```yaml
external_sources:
  enabled: false               # set true to activate MCP + RAG enrichment

  mcp:
    enabled: true
    intents:
      - knowledge_base         # Confluence, Notion → team standards, ADRs
      - project_management     # Jira, Linear → linked issue + acceptance criteria
      - design                 # Figma, Zeplin → design specs (UI PRs only)
      # - code_intelligence    # Sourcegraph → similar patterns
    hints:
      branch_issue_pattern: "([A-Z]+-\\d+)"

  rag:
    enabled: false
    intents:
      - similar_patterns       # find similar code patterns in codebase
      - past_decisions         # previous review decisions for similar code
      # - architecture_examples

  sources: []
  # sources:
  #   - type: url
  #     name: Shared ESLint config
  #     url: https://raw.githubusercontent.com/org/standards/main/eslint.md
```

| Option | Example | Description |
|---|---|---|
| `enabled` | `true` | Master toggle. Set to `true` to activate MCP + RAG enrichment |
| `mcp.enabled` | `true` | Enable or disable MCP tool usage independently of the master toggle |
| `mcp.intents` | `[knowledge_base, project_management]` | Declare what kinds of external context you want. The agent discovers available MCP tools in the session and only uses those matching a declared intent |
| `hints` | see below | Open-ended key-value map passed as context to the agent when querying MCP tools. Add any hints that help narrow tool queries for your project. `branch_issue_pattern` is the one hint with built-in handling — all others are read as free-form context |
| `hints.branch_issue_pattern` | `([A-Z]+-\d+)` | Regex applied to the branch name to extract a PM issue key. e.g. `feature/ENG-123-auth` → `ENG-123`, which is then fetched via the PM tool. This is the only hint with explicit built-in handling |
| `rag.enabled` | `true` | Set to `true` if you have a RAG tool available in the session. When enabled, the agent queries the RAG system for all declared intents automatically |
| `rag.intents` | `[similar_patterns, past_decisions]` | Hints telling the agent what to retrieve from the RAG system. Unlike `mcp.intents` (which filters tool usage), these are guidance — remove intents you don't want queried. Values: `similar_patterns`, `past_decisions`, `architecture_examples` |
| `sources[].type` | `url` | Only supported value: `url` — fetched directly via WebFetch, no MCP tool required. Always active when `enabled: true` |

### 4.1 MCP intents

The agent auto-discovers whatever tools are available in the session and only uses those whose category matches a declared intent.

| Intent | Tool examples | What it provides |
|---|---|---|
| `knowledge_base` | Confluence MCP, Notion MCP | Team standards, ADRs, policies not in local docs |
| `project_management` | Jira MCP, Linear MCP, GitHub Issues MCP | Linked issue + acceptance criteria (extracted from branch name via `branch_issue_pattern`) |
| `design` | Figma MCP, Zeplin MCP | Design specs for UI-touching PRs |
| `code_intelligence` | Sourcegraph MCP | Similar code patterns in the codebase |

### 4.2 hints — open-ended context for MCP tools

`hints` is an open-ended key-value map. The agent reads the entire map as context when querying MCP tools, so you can add any key-value pairs that help narrow tool queries for your project. Only `branch_issue_pattern` has explicit built-in handling — all other hints are free-form context the agent uses at its discretion.

```yaml
hints:
  branch_issue_pattern: "([A-Z]+-\\d+)"  # built-in: extract issue key from branch name
  confluence_space: ENG                   # free-form: agent uses this to narrow Confluence searches
  jira_project: PROJ                      # free-form: agent uses this to narrow Jira searches
  figma_team: acme-design                 # free-form: agent uses this to scope Figma queries
  # any other key-value pair your tools need
```

### 4.3 Branch issue key extraction

When `project_management` is in your intents and `hints.branch_issue_pattern` is set, the agent extracts the issue key from the branch name and fetches the full ticket:

```
branch:   feature/ENG-123-add-auth
pattern:  ([A-Z]+-\d+)
→ fetches: ENG-123
→ extracts: title, description, acceptance criteria
→ used as review checklist
```

### 4.4 RAG intents

If a RAG tool (AWS Bedrock knowledge base, GitHub Graph RAG, custom vector DB) is available and `rag.enabled: true`, the agent queries it using the declared intents as guidance. Unlike MCP intents, RAG intents are hints — the agent queries for all of them automatically when RAG is enabled.

| Intent | What it queries |
|---|---|
| `similar_patterns` | Similar implementations of the same domain in the codebase |
| `past_decisions` | Previous review decisions for similar code — avoids repeating findings |
| `architecture_examples` | Architecture docs embedded in the vector store |

### 4.5 URL sources

```yaml
sources:
  - type: url
    name: Shared ESLint standards
    url: https://raw.githubusercontent.com/acme/standards/main/eslint.md
  - type: url
    name: Security guidelines
    url: https://wiki.company.com/public/security-standards
```

> **Graceful degradation:** All external sources fail silently — if a tool is unavailable or returns empty results, the review continues with local context only. The workflow never fails because of an external source.

---

## 5. Review output

All output is written to the path specified in `review_output`.

| File | Description |
|---|---|
| `current-pr-context.yaml` | Active session state — which PR is selected, reviews completed |
| `pr-{branch}-context.yaml` | Per-PR knowledge base built during context collection |
| `review-{branch}-{date}.md` | Final review report with all findings sorted by severity |

> **Tip:** Add `_prr-output/` to your `.gitignore` to keep generated review reports out of version control. Use `[CL] Clear` from the agent menu to remove context files when starting fresh.

---

## 6. Examples

### 6.1 Minimal config (local-only)

```yaml
user_name: Alice
communication_language: English
target_repo: .
review_output: ./_prr-output/reviews

context_collection:
  enabled: true
  mode: pr-specific

external_sources:
  enabled: false
```

### 6.2 Full config (with MCP + GitHub)

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

external_sources:
  enabled: true
  mcp:
    enabled: true
    intents: [knowledge_base, project_management, design]
    hints:
      branch_issue_pattern: "([A-Z]+-\\d+)"
  rag:
    enabled: false
    intents: [similar_patterns, past_decisions]
  sources:
    - type: url
      name: Shared ESLint standards
      url: https://raw.githubusercontent.com/acme/standards/main/eslint.md
```

---

## 7. FAQs

### How do I get review output in my language instead of English?

Set `communication_language` to any natural language:

```yaml
communication_language: Vietnamese   # or Japanese, French, Korean, etc.
```

---

### I want the agent to fetch the Jira ticket before reviewing. What do I need?

Three things: a Jira MCP server installed in your IDE, `project_management` in `mcp.intents`, and `branch_issue_pattern` if your branch names include the ticket key:

```yaml
external_sources:
  enabled: true
  mcp:
    enabled: true
    intents:
      - project_management
    hints:
      branch_issue_pattern: "([A-Z]+-\\d+)"  # e.g. feature/ENG-123-auth → ENG-123
```

---

### My team uses Linear (or GitHub Issues), not Jira. Does it still work?

Yes. prr-kit does not hardcode any specific tool. As long as a tool matching the `project_management` category is available in your session (Linear MCP, GitHub Issues MCP, etc.), the agent will use it. No extra config needed.

---

### I want the agent to read Figma design specs when reviewing UI PRs. How?

Install a Figma MCP server in your IDE, then add `design` to `mcp.intents`:

```yaml
external_sources:
  enabled: true
  mcp:
    enabled: true
    intents:
      - design
```

The agent automatically searches Figma only when the PR touches UI files (`.vue`, `.tsx`, `.css`, etc.) — it skips design lookup for backend-only PRs.

---

### What exactly does `branch_issue_pattern` do?

It's a regex applied to your branch name to extract a ticket key, which is then fetched from your PM tool to get the ticket title, description, and acceptance criteria. The agent uses the acceptance criteria as a review checklist — verifying that the implementation matches what was actually requested.

```
# Branch: feature/ENG-123-add-auth
# Pattern: ([A-Z]+-\d+)
# → fetches ticket ENG-123 → uses acceptance criteria as review checklist
```

If your branch names don't include a ticket key (e.g. `feature/add-auth`), omit this field — the agent will skip ticket lookup silently.

---

### What's the difference between `mcp.intents` and `rag.intents`?

| | `mcp.intents` | `rag.intents` |
|---|---|---|
| **Role** | Hard filter — agent only uses MCP tools whose category matches a declared intent | Guidance — agent queries the RAG system for all declared intents when `rag.enabled: true` |
| **Remove an intent** | That tool category will not be called at all | Agent will not query for that type of information |

---

### What is RAG and when do I need it?

RAG (Retrieval-Augmented Generation) lets the agent search a vector database — pre-loaded with your codebase, past review decisions, and architecture docs — before reviewing. This gives it memory of past decisions so it doesn't repeat findings the team has already accepted, and it can compare new code against established patterns.

You need it if: your team is large, your codebase has years of history, or you want the agent to be aware of past architectural decisions. If you haven't set up a vector database (AWS Bedrock, GitHub Graph RAG, Pinecone, etc.), keep `rag.enabled: false`.

---

### I've set up an AWS Bedrock Knowledge Base. How do I connect it?

Install the AWS Bedrock MCP server in your IDE and configure your AWS credentials, then enable RAG in prr-kit config:

```yaml
external_sources:
  enabled: true
  rag:
    enabled: true
    intents:
      - similar_patterns
      - past_decisions
      - architecture_examples
```

The agent auto-discovers the Bedrock MCP tool in the session and queries your Knowledge Base before each review.

---

### Can I add my own custom hints beyond `branch_issue_pattern`?

Yes. `hints` is an open-ended map — add any key-value pairs and the agent will read them as context when querying MCP tools:

```yaml
hints:
  branch_issue_pattern: "([A-Z]+-\\d+)"
  confluence_space: ENG        # agent uses this to narrow Confluence searches
  jira_project: PROJ           # agent uses this to narrow Jira searches
  figma_team: acme-design      # agent uses this to scope Figma queries
```

Only `branch_issue_pattern` has explicit built-in handling. All other hints are free-form context the agent uses at its discretion.

---

### What if no MCP tools are available in my session?

Nothing breaks. All external sources fail silently — the review continues with local context only (diff, config files, standards docs, inline annotations). The workflow never fails because of a missing tool.

---

### I want to review a repo in a different folder than my config. How?

Set `target_repo` to a relative or absolute path pointing to the other repo:

```yaml
# config lives in: /home/alice/tools/_prr/prr/config.yaml
# repo to review:  /home/alice/projects/my-app

target_repo: /home/alice/projects/my-app
# or relative:
target_repo: ../../projects/my-app
```

---

### Should I enable `auto_post_comment`?

Only if you trust the output enough to post without reviewing it first. With `false` (default), you see the findings first and decide whether to post. With `true`, findings are posted to the PR automatically — no confirmation prompt.

Recommendation: start with `false`, switch to `true` once you're comfortable with the quality of reviews.
