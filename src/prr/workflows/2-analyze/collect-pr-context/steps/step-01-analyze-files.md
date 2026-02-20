---
name: "step-01-analyze-files"
description: "Analyze files changed in PR to determine context needs"
nextStepFile: "./step-02-collect-sources.md"
---

# Step 1: Analyze Changed Files

## Goal
Determine what context is needed based on files changed in the PR.

## Sequence of Instructions

### 1. Announce Analysis

```
🔍 Analyzing PR changes to determine context needs...
   Files changed: {n}
```

### 2. Extract File Information

For each file in the PR diff, extract:

**File metadata:**
- Full path (e.g., `src/stores/todoStore.js`)
- File extension (`.js`, `.vue`, `.ts`, `.py`, etc.)
- Directory path segments (e.g., `src`, `stores`)

**File categories:**
```javascript
const fileCategories = {
  'src/components/*.vue': 'vue-component',
  'src/views/*.vue': 'vue-view',
  'src/stores/*.js': 'pinia-store',
  'src/router/*.js': 'vue-router',
  'src/composables/*.js': 'composable',
  '*.test.js|*.spec.js': 'test',
  'src/utils/*.js': 'utility',
  '*.css|*.scss': 'stylesheet'
}
```

### 3. Detect Domains

Based on file paths and content, identify domains:

**Domain detection patterns:**
```javascript
const domainPatterns = {
  'authentication': ['auth', 'login', 'jwt', 'token', 'session'],
  'state-management': ['store', 'pinia', 'vuex', 'state'],
  'routing': ['router', 'route', 'navigation'],
  'ui-components': ['component', 'button', 'input', 'form'],
  'api': ['api', 'fetch', 'axios', 'http', 'endpoint'],
  'database': ['db', 'query', 'model', 'schema'],
  'security': ['auth', 'permission', 'validate', 'sanitize']
}
```

### 4. Scan for Inline Annotations

In changed lines, look for special comments:

```javascript
// @context: This module handles user authentication
// @security: All inputs must be validated before storage
// @pattern: Use repository pattern for data access
// @rule: ESLint vue/multi-word-component-names must be followed
```

Extract these annotations with:
- File path
- Line number
- Annotation type
- Content

### 5. Identify Config Files Needed

Based on file types changed:

```javascript
const configMapping = {
  '.vue': ['.eslintrc*', '.prettierrc*', 'vite.config.*'],
  '.js|.ts': ['.eslintrc*', '.prettierrc*', 'tsconfig.json'],
  '.py': ['pyproject.toml', '.flake8', 'mypy.ini'],
  '.css|.scss': ['.stylelintrc*']
}
```

### 6. Identify Docs Needed

Based on domains and categories:

```javascript
const docsMapping = {
  'vue-component': ['CONTRIBUTING.md → Component section', 'docs/components.md'],
  'pinia-store': ['ARCHITECTURE.md → State management', 'docs/state-management.md'],
  'security': ['CONTRIBUTING.md → Security section', 'docs/security.md'],
  'api': ['docs/api-guidelines.md', 'ARCHITECTURE.md → API section']
}
```

### 7. Build Analysis Summary

```javascript
{
  "files_changed": [
    {
      "path": "src/stores/todoStore.js",
      "extension": ".js",
      "category": "pinia-store",
      "domains": ["state-management"],
      "annotations": [
        {
          "line": 10,
          "type": "@pattern",
          "content": "Use composition API only"
        }
      ]
    },
    {
      "path": "src/views/TodoListView.vue",
      "extension": ".vue",
      "category": "vue-view",
      "domains": ["ui-components", "state-management"]
    }
  ],
  "context_needs": {
    "configs": [".eslintrc.js", ".prettierrc", "vite.config.js"],
    "docs": ["CONTRIBUTING.md", "ARCHITECTURE.md"],
    "primary": ["CLAUDE.md", "AGENTS.md"],
    "domains": ["state-management", "ui-components"]
  }
}
```

### 8. Report Analysis

```
✓ File analysis complete:
   📄 Files: {n} ({list of extensions})
   🎯 Domains: {domains}
   📋 Configs needed: {configs}
   📚 Docs needed: {docs}
   💬 Annotations found: {count}
```

### 9. Load Next Step

Add `step-01-analyze-files` to `stepsCompleted`. Load: `{nextStepFile}`
