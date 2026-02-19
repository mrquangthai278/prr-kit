---
name: "step-02-extract-rules"
description: "Extract and summarize actionable coding rules from the scanned files"
nextStepFile: "./step-03-ask-context.md"
---

# Step 2: Extract Coding Rules

## Sequence of Instructions

### 1. Extract ESLint Rules (if found)

From the ESLint config, extract rules that are set to `"error"` or `2` (hard rules) and `"warn"` or `1` (soft rules).

Focus on rules with reviewer relevance:
- `no-unused-vars`, `no-console`, `no-debugger` → code quality
- `eqeqeq`, `no-implicit-coercion` → logic correctness
- `import/order`, `import/no-cycle` → architecture
- Any custom plugin rules (e.g. `vue/`, `react/`, `@typescript-eslint/`)
- `security/` plugin rules if present

Build a concise rule summary:
```
ESLint hard rules: no-unused-vars, eqeqeq, @typescript-eslint/no-explicit-any
ESLint soft rules: no-console, prefer-const
Vue-specific: vue/no-unused-components, vue/component-name-in-template-casing
```

### 2. Extract TypeScript Strictness (if found)

From `tsconfig.json`, note:
- `strict: true/false`
- `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`
- `paths` aliases (e.g. `@/` → `src/`) — important for import review

### 3. Extract Naming Conventions

From all scanned files, build a naming conventions map:

| Thing | Convention | Example | Source |
|-------|-----------|---------|--------|
| Vue components | PascalCase | `UserCard.vue` | CONTRIBUTING.md |
| Composables | camelCase + `use` prefix | `useAuth.js` | CONTRIBUTING.md |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` | eslint rule |
| API endpoints | kebab-case | `/api/user-profile` | ARCHITECTURE.md |
| DB tables | snake_case | `user_sessions` | schema files |
| Test files | `*.spec.ts` or `*.test.ts` | `auth.spec.ts` | vitest config |

If a convention is NOT documented, infer from existing files:
```bash
# Check actual naming in the repo (sample 10 files per type)
ls {target_repo}/src/components/*.vue 2>/dev/null | head -10
ls {target_repo}/src/composables/*.{js,ts} 2>/dev/null | head -10
ls {target_repo}/src/services/*.{js,ts} 2>/dev/null | head -10
```

Note inferred conventions separately from documented ones.

### 4. Extract Architecture Patterns

From architecture docs and code structure, identify:

**Layer structure** (which layer calls which):
```
e.g.: routes → controllers → services → repositories → DB
e.g.: pages → composables → stores → API client → backend
```

**Prohibited cross-layer calls** (if documented):
- "Services must not import from controllers"
- "Components must not call API directly — use stores"
- "Business logic must not live in route handlers"

**Established patterns to follow:**
- Error handling pattern (try/catch in service? global handler? Result type?)
- API response format (does the project have a standard `{ data, error, meta }` wrapper?)
- Auth check pattern (middleware? decorator? manual in each handler?)
- Logging pattern (which logger, log levels, structured vs string)

**Scan for pattern evidence:**
```bash
# Check how existing API endpoints handle errors
grep -r "catch" {target_repo}/src --include="*.{js,ts}" -l | head -5
# Check existing service layer pattern
ls {target_repo}/src/services/ 2>/dev/null | head -10
```

### 5. Extract Test Conventions

From test config and existing test files:
- Test file location pattern (`__tests__/` vs `*.spec.ts` co-located vs `test/`)
- What is expected to be tested (unit? integration? e2e?)
- Test utilities used (custom render wrappers, fixture factories, etc.)
- Coverage threshold if configured

### 6. Compile Extracted Rules Summary

Build a structured in-memory summary to pass to step-03:

```yaml
linting:
  hard_errors:
    - "no-unused-vars"
    - "eqeqeq"
  soft_warnings:
    - "no-console"
  typescript_strict: true

naming:
  documented:
    - { thing: "Vue components", convention: "PascalCase", example: "UserCard.vue" }
  inferred:
    - { thing: "service files", convention: "camelCase", example: "authService.js" }

architecture:
  layer_order: "routes → services → repositories"
  prohibited:
    - "No business logic in route handlers"
  patterns:
    error_handling: "try/catch in services, global error middleware in app.js"
    api_format: "{ data, error } wrapper"

testing:
  framework: "vitest"
  file_pattern: "*.spec.ts"
  location: "co-located with source files"
```

### 7. Load Next Step

Add `step-02-extract-rules` to `stepsCompleted`. Load: `{nextStepFile}`
