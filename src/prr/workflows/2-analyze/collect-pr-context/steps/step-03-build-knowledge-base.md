---
name: "step-03-build-knowledge-base"
description: "Build structured PR-specific knowledge base for reviewers"
---

# Step 3: Build PR-Specific Knowledge Base

## Goal
Transform collected data into structured knowledge base optimized for reviewers.

## Sequence of Instructions

### 1. Announce Knowledge Base Building

```
🧠 Building PR-specific knowledge base...
```

### 2. Create Knowledge Base Structure

Build YAML structure with all collected context:

```yaml
# PR-Specific Context
# Generated: {timestamp}
# For PR: {pr_number} / Branch: {branch_name}

pr_metadata:
  pr_number: {pr_number}
  branch: {branch_name}
  base_branch: {base_branch}
  files_changed: {n}
  collected_at: {ISO timestamp}

files_analysis:
  changed_files:
    - path: src/stores/todoStore.js
      extension: .js
      category: pinia-store
      domains: [state-management]

    - path: src/views/TodoListView.vue
      extension: .vue
      category: vue-view
      domains: [ui-components, state-management]

  domains_involved:
    - state-management
    - ui-components

  file_types:
    - .js (1 file)
    - .vue (1 file)

relevant_rules:
  # ESLint rules that apply to this PR
  eslint:
    vue/multi-word-component-names:
      severity: error
      applies_to: [TodoListView.vue]
      description: Component names must be multi-word

    vue/require-prop-types:
      severity: error
      applies_to: [*.vue]
      description: Props must have type definitions

    prefer-const:
      severity: error
      applies_to: [*.js, *.vue]
      description: Use const instead of let when variable is not reassigned

    no-var:
      severity: error
      applies_to: [*.js, *.vue]
      description: No var keyword allowed

  prettier:
    semi: false
    singleQuote: true
    tabWidth: 2
    printWidth: 100
    applies_to: all_files

relevant_guidelines:
  # From CLAUDE.md
  state_management:
    source: CLAUDE.md
    section: State Management
    content: |
      Use Pinia stores with setup function style.
      - State: use ref() and reactive()
      - Getters: use computed()
      - Actions: regular functions
      - No Options API allowed

    applies_to: [src/stores/todoStore.js]

  security:
    source: CLAUDE.md
    section: Security
    content: |
      Never use v-html with user input.
      All inputs must be validated and sanitized.

    applies_to: [src/views/TodoListView.vue]

  # From CONTRIBUTING.md
  component_standards:
    source: CONTRIBUTING.md
    section: Component Standards
    content: |
      - Use PascalCase for component names
      - Multi-word names required (enforced by ESLint)
      - Props must have types and defaults
      - Use Composition API with <script setup>

    applies_to: [src/views/TodoListView.vue]

  # From ARCHITECTURE.md
  container_presentational_pattern:
    source: ARCHITECTURE.md
    section: Component Architecture
    content: |
      Follow Container/Presentational pattern:
      - Container (views/): Connect to stores, handle logic
      - Presentational (components/): Receive props, emit events

    applies_to: [src/views/TodoListView.vue]

  pinia_patterns:
    source: ARCHITECTURE.md
    section: State Management
    adr: ADR-002
    content: |
      Use Pinia with setup function style.
      Rationale: Simpler API, better TypeScript support.
      Actions modify state directly (no mutations).

    applies_to: [src/stores/todoStore.js]

inline_context:
  annotations:
    - file: src/stores/todoStore.js
      line: 10
      type: "@pattern"
      content: "Use composition API only"
      priority: high

    - file: src/stores/todoStore.js
      line: 15
      type: "@security"
      content: "Validate all inputs before storage"
      priority: critical

stack_context:
  # Populated from data/stacks/{stack}.md files for each detected stack.
  # All reviewers (GR, SR, PR, AR, BR) MUST read and apply these rules
  # in addition to project-specific guidelines.
  detected_stacks: [vue3, typescript]

  rules:
    vue3:
      security:
        - severity: critical
          rule: "v-html with user-controlled data → XSS. Use {{ }} or DOMPurify."
        - severity: high
          rule: "Dynamic :is binding with user string → arbitrary component injection."
      performance:
        - severity: high
          rule: "watchEffect/watch with async ops without onCleanup → memory leak on unmount."
        - severity: medium
          rule: "v-for without :key or using index key → broken reconciliation on reorder."
      architecture:
        - severity: high
          rule: "Direct store state mutation outside action → bypasses Pinia devtools."
        - severity: high
          rule: "Props mutation instead of emit → violates one-way data flow."
      code_quality:
        - severity: high
          rule: "defineProps without TypeScript types → silent prop misuse."
        - severity: medium
          rule: "Options API mixed with Composition API in same component."
      common_bugs:
        - severity: high
          rule: "reactive() destructuring loses reactivity — use toRefs() to preserve it."
        - severity: medium
          rule: "watch missing immediate:true when logic should run on initial value."
    typescript:
      architecture:
        - severity: high
          rule: "'any' type defeats TypeScript purpose — use unknown + type narrowing."
        - severity: high
          rule: "strict:false or missing strict in tsconfig → implicit any, loose null checks."
      code_quality:
        - severity: high
          rule: "@ts-ignore without explanation hides real bugs."
        - severity: medium
          rule: "Missing return type annotation on exported functions."
    # ... additional detected stacks follow same pattern

external_context:
  # Populated only when external_sources.enabled: true and tools were available
  mcp_tools_used: []              # e.g. ["confluence", "jira"]

  knowledge_base:                 # From Confluence / Notion / etc.
    - source: Confluence
      page: "Engineering Standards"
      content: |
        All state mutations must be logged for audit purposes.
        JWT tokens must be validated server-side.

  issue_context:                  # From Jira / Linear / GitHub Issues
    key: ENG-123
    title: "Add user authentication"
    type: story
    acceptance_criteria:
      - "User can log in with email and password"
      - "Session expires after 24 hours"
      - "Failed login shows error message without leaking details"

  design_context:                 # From Figma / Zeplin (UI changes only)
    matched_components: []
    specs: []

  rag_patterns:                   # From AWS Bedrock / GitHub Graph RAG / etc.
    - pattern: "Auth store pattern"
      source: "Previous PR #88"
      content: "Use httpOnly cookies for token storage, not localStorage"

  url_sources:                    # From plain URL fetches
    - name: "Shared ESLint config"
      url: "https://raw.githubusercontent.com/org/standards/main/eslint.md"
      content: "..."

review_priorities:
  # Guide reviewers on what to focus on
  critical:
    - "Verify no v-html with user input (security requirement)"
    - "Check ESLint error-level rules compliance"
    - "Verify Pinia setup function style (ADR-002)"

  important:
    - "Check component naming (multi-word required)"
    - "Verify props have types and defaults"
    - "Check Container/Presentational pattern adherence"

  low_priority:
    - "Minor style preferences"
    - "Optional optimizations"

reviewer_guidance:
  general_review:
    - "Check for ESLint rule violations (no-var, prefer-const)"
    - "Verify component naming follows standards"
    - "Check inline annotations are followed"

  security_review:
    - "Flag ANY v-html usage (critical)"
    - "Check input validation per inline annotations"
    - "Verify no hardcoded secrets"

  performance_review:
    - "Check computed vs methods usage"
    - "Verify efficient filtering/searching"

  architecture_review:
    - "Verify Container/Presentational pattern"
    - "Check Pinia setup function style (not Options API)"
    - "Verify SRP adherence"

context_sources:
  # Track what sources were used
  primary_docs: [CLAUDE.md, AGENTS.md]
  config_files: [.eslintrc.js, .prettierrc]
  standards_docs: [CONTRIBUTING.md, ARCHITECTURE.md]
  inline_annotations: yes
  mcp_tools: []                   # list of MCP tools actually used
  rag_systems: []                 # list of RAG systems queried
  url_sources: []                 # list of plain URLs fetched
```

### 3. Determine Output Filename

```javascript
if (pr_number_available) {
  filename = `pr-${pr_number}-context.yaml`
} else {
  // Use sanitized branch name
  const safeBranchName = branch_name.replace(/[^a-zA-Z0-9-]/g, '-')
  filename = `pr-${safeBranchName}-context.yaml`
}
```

### 4. Write Knowledge Base to File

Write to: `{review_output}/{filename}`

Example: `_prr-output/pr-123-context.yaml`

### 5. Report Completion

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PR-Specific Context Ready

📄 File: {filename}
📊 Stats:
   • ESLint rules: {n}
   • Guidelines: {m}
   • Inline annotations: {k}
   • MCP tools used: {mcp_list or "none"}
   • RAG patterns: {rag_count}
   • Issue context: {issue_key or "none"}

🎯 Domains: {domains}
📚 Sources: {source_count} ({list})

✓ Context is fresh and PR-specific
✓ Ready for review workflows
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6. Store Context Path

Update PR context file to include knowledge base path:

```yaml
# {review_output}/current-pr-context.yaml
pr_knowledge_base: "{review_output}/{filename}"
```

This allows review workflows to find the knowledge base.

### 7. Workflow Complete

Mark workflow as complete. Context is ready for use by review workflows (GR, SR, PR, AR).
