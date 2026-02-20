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

### 6. Collect from External Sources (Optional)

**If configured in config.yaml:**

```yaml
external_context_sources:
  - type: api
    url: https://api.company.com/standards
    auth_env: CONTEXT_API_KEY
```

**Make API calls:**
```javascript
// GET {url}/standards?files=src/stores/todoStore.js
// Expected response:
{
  "rules": {
    "state-management": "All state must be in Pinia stores..."
  }
}
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

  external_context:
    company_standards:
      state_mutations: "All state mutations must be logged for audit"
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
   🌐 External sources: {w}
```

### 9. Load Next Step

Add `step-02-collect-sources` to `stepsCompleted`. Load: `{nextStepFile}`
