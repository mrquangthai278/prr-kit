---
name: "step-02-collect-sources"
description: "Collect context from all identified sources"
nextStepFile: "./step-03-build-knowledge-base.md"
---

# Step 2: Collect Context from Sources

## Goal
Gather context from all relevant sources identified in Step 1.

## Sequence of Instructions

### 1. Announce Collection

```
📚 Collecting context from sources...
```

### 2. Collect from Primary Documentation

Check and read these files (if they exist):

**Priority 1:**
```bash
CLAUDE.md
AGENTS.md
.github/CLAUDE_CODE_RULES.md
.clauderules
```

**What to extract:**
- Project-wide coding standards
- Agent-specific instructions
- Domain-specific guidelines (if PR touches that domain)
- Security requirements
- Architecture patterns

**Example extraction:**
```markdown
# From CLAUDE.md

## State Management
Use Pinia stores with setup function style...
→ Extract this section if PR touches stores/

## Security
Never use v-html with user input...
→ Extract this if PR touches Vue components
```

### 3. Collect from Config Files

Based on file types from Step 1, read relevant configs:

#### For .vue or .js files:

**Read .eslintrc* files:**
```javascript
// Extract ALL rules, especially enforced ones (error/2)
{
  "vue/multi-word-component-names": "error",
  "vue/require-prop-types": "error",
  "prefer-const": "error",
  "no-var": "error"
}
```

**Read .prettierrc* files:**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2
}
```

**Read vite.config.* or webpack.config.*:**
- Extract alias configurations
- Extract plugin settings
- Note build optimizations

#### For .ts files:

**Read tsconfig.json:**
- Extract compiler options
- Note strict mode settings
- Extract path mappings

### 4. Collect from Standards Documents

**Read CONTRIBUTING.md:**
- If exists, extract sections relevant to domains from Step 1
- Example: If PR touches components → extract "Component Standards" section
- Example: If PR touches security code → extract "Security Guidelines"

**Read ARCHITECTURE.md:**
- Extract architectural patterns relevant to changed files
- Example: If PR touches stores → extract "State Management" section
- Extract ADR (Architecture Decision Records) if mentioned

**Read domain-specific docs:**
```bash
docs/components.md       # if PR touches components
docs/state-management.md # if PR touches stores
docs/api-guidelines.md   # if PR touches API code
docs/security.md         # if PR touches auth/security
```

### 5. Extract Inline Annotations

From changed files (identified in Step 1), extract annotations:

```javascript
// Scan changed lines for these patterns:

// @context: {...}
// @security: {...}
// @pattern: {...}
// @rule: {...}
// @important: {...}

// Also extract JSDoc if present:
/**
 * @pattern Use repository pattern for all data access
 * @security Input validation required
 */
```

**Store with context:**
```javascript
{
  "file": "src/stores/todoStore.js",
  "line": 10,
  "type": "@pattern",
  "content": "Use composition API only"
}
```

### 6. Collect from External Tools (MCP + RAG)

**Only run if `external_sources.enabled: true` in config.**

---

#### 6a. Tool Discovery

Inspect what tools you currently have available in this session.
Categorize discovered tools by capability:

| Category | Examples |
|---|---|
| `knowledge_base` | Confluence MCP, Notion MCP, Obsidian MCP |
| `project_management` | Jira MCP, Linear MCP, GitHub Issues MCP |
| `design` | Figma MCP, Zeplin MCP |
| `code_intelligence` | Sourcegraph MCP, GitHub MCP |
| `rag` | AWS Bedrock, GitHub Graph RAG, custom vector DBs |

Announce discovery:
```
🔌 External tools discovered: {list or "none"}
```

If no tools found → skip to Section 7.

Compare discovered tools against `external_sources.mcp.intents` in config.
Only use tools whose category matches a declared intent.

---

#### 6b. Knowledge Base Tools (Confluence, Notion, etc.)

**If a knowledge base MCP is available AND `knowledge_base` in configured intents:**

Query for content relevant to the PR's domains (identified in Step 1).
Use the tool's own search — do NOT hardcode page IDs.

Suggested queries by domain:
- `authentication` / `security` → "authentication standards", "security guidelines", "JWT policy"
- `ui-components` → "component standards", "design system rules", "frontend conventions"
- `state-management` → "state management patterns", "store conventions"
- `api` → "API design guidelines", "REST conventions", "endpoint standards"
- `database` → "database patterns", "query optimization", "migration guidelines"

Extract: coding standards, ADRs, security policies, team conventions not in local docs.

```
✓ Knowledge base: {n} relevant pages found → {page titles}
```

---

#### 6c. Project Management Tools (Jira, Linear, GitHub Issues)

**If a PM MCP is available AND `project_management` in configured intents:**

**Step 1 — Extract issue key from branch name:**
```
Branch: feature/ENG-123-user-authentication
Pattern (from config hints.branch_issue_pattern): ([A-Z]+-\d+)
→ Issue key: ENG-123
```

If no pattern configured, try common formats: `[A-Z]+-\d+`, `#\d+`.

**Step 2 — Fetch issue context:**
Use the MCP tool to retrieve:
- Issue title + description → understand WHAT was supposed to be built
- Acceptance criteria → use as review checklist (compare against implementation)
- Issue type (story, bug, task) → informs review focus
- Linked design/spec documents

**This is high-value context**: reviewers can verify if implementation matches requirements.

```
✓ Issue: {issue_key} — {title}
  Acceptance criteria: {n} items extracted
```

If no issue key found in branch name → skip silently.

---

#### 6d. Design Tools (Figma, Zeplin)

**If a design MCP is available AND `design` in configured intents:**
**Only run if PR changes UI files** (`.vue`, `.tsx`, `.jsx`, `.css`, `.scss`).

Use the tool to:
- Search for designs matching changed component names
- Get design tokens, spacing, color specs
- Get design annotations or open comments

Helps architecture/general review catch design-vs-implementation drift.

```
✓ Design context: {component names matched}
```

---

#### 6e. RAG Systems (AWS Bedrock, GitHub Graph RAG, custom)

**If a RAG tool is available AND `rag.enabled: true` in config:**

Query with PR context:
- "Similar {domain} implementations in this codebase"
- "Previous review decisions for {category} code"
- "Established patterns for {file_category} in this project"

Extract:
- Approved patterns to compare against PR code
- Past review decisions → avoid repeating same findings on well-known patterns
- Architecture examples the team has already accepted

```
✓ RAG: {n} relevant patterns retrieved
```

---

#### 6f. Plain URL Sources

**If `url` type sources configured under `external_sources.sources`:**

```yaml
external_sources:
  sources:
    - type: url
      name: Shared ESLint config
      url: https://raw.githubusercontent.com/org/standards/main/eslint.md
```

Use WebFetch to retrieve content. Extract relevant rules/guidelines.

---

#### 6g. Graceful Degradation

For EVERY external tool (6b–6f):
- Tool not available in session → skip silently
- Tool call fails or times out → skip silently, do not retry
- Tool returns empty results → skip silently
- Tool returns irrelevant content → discard, do not force-include

**The review workflow must never fail because an external tool is unavailable.**
Internal context (Steps 1–5) is always sufficient on its own.

---

#### 6h. Report Collection Summary

```
✓ External tools:
   🔌 MCP tools used: {list or "none available"}
   📄 Knowledge base pages: {n}
   🎫 Issue context: {key — title} or "not found"
   🎨 Design context: {matched} or "n/a"
   🧠 RAG patterns: {n}
   🌐 URL sources: {n}
```

### 7. Build Collected Data Structure

Aggregate all collected context:

```yaml
collected_data:
  primary_docs:
    claude_md:
      state_management: |
        Use Pinia stores with setup function style.
        No Options API allowed.

      security: |
        Never use v-html with user input.
        All inputs must be sanitized.

  config_rules:
    eslint:
      vue/multi-word-component-names: error
      vue/require-prop-types: error
      vue/require-default-prop: error
      prefer-const: error
      no-var: error
      eqeqeq: [error, always]

    prettier:
      semi: false
      singleQuote: true
      tabWidth: 2
      printWidth: 100

  standards_docs:
    contributing:
      component_standards: |
        - Use PascalCase for component names
        - Multi-word names required
        - Props must have types and defaults

      security_guidelines: |
        - No v-html with user input
        - Sanitize all user inputs

    architecture:
      state_management_pattern: |
        Container/Presentational pattern.
        Stores use setup function style.

      adr_002: |
        Decision: Use Pinia over Vuex
        Rationale: Simpler API, better TypeScript support

  inline_annotations:
    - file: src/stores/todoStore.js
      line: 10
      type: "@pattern"
      content: "Use composition API only"

    - file: src/stores/todoStore.js
      line: 15
      type: "@security"
      content: "Validate all inputs before storage"

  # External tools context (populated if tools were available)
  external_tools:
    mcp_used: []                  # list of MCP tool names actually used
    knowledge_base:
      pages_found: 0
      content: []                 # extracted relevant content
    issue_context:
      key: null                   # e.g. ENG-123
      title: null
      acceptance_criteria: []
    design_context:
      matched_components: []
      specs: []
    rag_patterns:
      count: 0
      patterns: []
    url_sources: []               # content from plain URL fetches
```

### 8. Report Collection Summary

```
✓ Context collection complete:
   📘 CLAUDE.md: {n} sections
   ⚙️  ESLint: {m} rules
   🎨 Prettier: {k} rules
   📚 CONTRIBUTING.md: {x} sections
   🏗️  ARCHITECTURE.md: {y} sections
   💬 Inline annotations: {z}
   🔌 MCP tools: {list or "none"}
   🧠 RAG patterns: {w}
```

### 9. Load Next Step

Add `step-02-collect-sources` to `stepsCompleted`. Load: `{nextStepFile}`
