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

### 7. Detect Technology Stacks

Analyze file extensions, import statements, config files, and directory structure to detect which technology stacks are involved in the PR. This information is used in Step 2 to load stack-specific review rules.

**Frontend Frameworks:**

| Stack key | Detection signals |
|-----------|-------------------|
| `vue3` | `*.vue` files · `from 'vue'` · `<script setup>` · `defineComponent` · `vite.config.*` with vue plugin |
| `react` | `*.jsx` / `*.tsx` · `from 'react'` · `useState` / `useEffect` · JSX syntax |
| `angular` | `*.component.ts` · `@Component(` · `@NgModule(` · `angular.json` |
| `svelte` | `*.svelte` files |
| `nextjs` | `next.config.*` · `pages/` or `app/` dir · `getServerSideProps` · `from 'next'` |
| `nuxtjs` | `nuxt.config.*` · `useNuxtApp` · `defineNuxtComponent` · `.nuxt/` |
| `astro` | `*.astro` files · `astro.config.*` · `from 'astro'` · `@astrojs/` imports |
| `solidjs` | `from 'solid-js'` · `createSignal` · `createEffect` · `<Show>` · `<For>` · `vite-plugin-solid` |
| `htmx` | `htmx.min.js` · `hx-get` / `hx-post` / `hx-swap` attributes in HTML templates |

**Styling:**

| Stack key | Detection signals |
|-----------|-------------------|
| `typescript` | `*.ts` / `*.tsx` · `tsconfig.json` · `typescript` in devDeps |
| `tailwindcss` | `tailwind.config.*` · `@tailwind` · `@apply` in CSS · utility class patterns |
| `css` | `*.css` / `*.scss` / `*.sass` / `*.less` / `*.styl` files |

**State Management:**

| Stack key | Detection signals |
|-----------|-------------------|
| `redux` | `@reduxjs/toolkit` or `redux` in deps · `createSlice` · `configureStore` · `useSelector` · `useDispatch` |

**Backend — Node.js:**

| Stack key | Detection signals |
|-----------|-------------------|
| `nestjs` | `@Module(` · `@Injectable(` · `@Controller(` · `NestFactory` · `nest-cli.json` |
| `expressjs` | `express()` · `app.use(` · `router.get/post` · `from 'express'` |

**Backend — Python:**

| Stack key | Detection signals |
|-----------|-------------------|
| `fastapi` | `from fastapi` · `@app.get` · `Depends(` · `BaseModel` (pydantic) |
| `django` | `from django` · `models.Model` · `views.py` · `urls.py` · `manage.py` |
| `flask` | `from flask import` · `@app.route` · `Flask(__name__)` |
| `python` | `*.py` files without more specific framework signals |

**Backend — Java:**

| Stack key | Detection signals |
|-----------|-------------------|
| `spring-boot` | `@SpringBootApplication` · `@RestController` · `@Service` · `application.properties` |
| `java` | `*.java` files · `public class` · `import java.` · without Spring Boot signals |

**Backend — Kotlin:**

| Stack key | Detection signals |
|-----------|-------------------|
| `kotlin` | `*.kt` files · `fun main()` · `import kotlin.` · `build.gradle.kts` · `@Composable` |

**Backend — C# / .NET:**

| Stack key | Detection signals |
|-----------|-------------------|
| `csharp` | `*.cs` files · `*.csproj` · `*.sln` · `using System` · `namespace` · `appsettings.json` |

**Backend — C++:**

| Stack key | Detection signals |
|-----------|-------------------|
| `cpp` | `*.cpp` / `*.cc` / `*.cxx` files · `*.hpp` · `#include <` · `CMakeLists.txt` · `Makefile` |

**Backend — Rust:**

| Stack key | Detection signals |
|-----------|-------------------|
| `rust` | `*.rs` files · `Cargo.toml` · `Cargo.lock` · `fn main()` · `use std::` · `impl` |

**Backend — Elixir:**

| Stack key | Detection signals |
|-----------|-------------------|
| `elixir` | `*.ex` / `*.exs` files · `mix.exs` · `defmodule` · `use Phoenix.` · `Repo.` · `Ecto.` |

**Backend — Go:**

| Stack key | Detection signals |
|-----------|-------------------|
| `go` | `*.go` files · `go.mod` · `package main` |

**Backend — PHP:**

| Stack key | Detection signals |
|-----------|-------------------|
| `laravel` | `*.php` + `artisan` · `Eloquent` · `routes/web.php` · `app/Http/Controllers` |

**Backend — Ruby:**

| Stack key | Detection signals |
|-----------|-------------------|
| `rails` | `*.rb` + `Gemfile` with rails · `ApplicationController` · `config/routes.rb` |

**Database / ORM:**

| Stack key | Detection signals |
|-----------|-------------------|
| `sql` | `*.sql` · raw SQL strings in code (`SELECT`, `INSERT`, `UPDATE`) · `db.query(` |
| `prisma` | `prisma/schema.prisma` · `@prisma/client` · `PrismaClient` |
| `typeorm` | `@Entity(` · `@Column(` · `DataSource` · `createConnection` |
| `mongodb` | `mongoose` · `MongoClient` · `Schema(` · `.aggregate(` |

**Cache / KV Store:**

| Stack key | Detection signals |
|-----------|-------------------|
| `redis` | `ioredis` / `redis` in deps · `createClient()` · `HSET` · `GET` / `SET` commands · `redis://` URIs |

**BaaS / Cloud Platform:**

| Stack key | Detection signals |
|-----------|-------------------|
| `firebase` | `firebase` in deps · `initializeApp(` · `getFirestore(` · `getAuth(` · `firebase.json` |

**Testing — Unit / Integration:**

| Stack key | Detection signals |
|-----------|-------------------|
| `jest-vitest` | `jest.config.*` · `vitest.config.*` · `*.test.ts/js` · `*.spec.ts/js` |

**Testing — E2E:**

| Stack key | Detection signals |
|-----------|-------------------|
| `playwright` | `playwright.config.*` · `cypress.config.*` · `*.cy.js` · `page.goto` · `cy.` commands |

**Infrastructure:**

| Stack key | Detection signals |
|-----------|-------------------|
| `docker` | `Dockerfile*` · `docker-compose*.yml` · `.dockerignore` |
| `kubernetes` | `*.yaml` with `apiVersion:` + `kind: Deployment/Pod/Service` · `kubectl` · `kustomization.yaml` · Helm charts |
| `terraform` | `*.tf` files · `terraform {` · `resource "` · `provider "` · `terraform.tfvars` |
| `github-actions` | `.github/workflows/*.yml` · `on:` + `jobs:` + `steps:` · `uses: actions/` |

**API Layer:**

| Stack key | Detection signals |
|-----------|-------------------|
| `graphql` | `*.graphql` / `*.gql` · `gql\`` · `typeDefs` · `resolvers` · `ApolloServer` |

**Mobile:**

| Stack key | Detection signals |
|-----------|-------------------|
| `react-native` | `react-native` in deps · RN component imports (`View`, `Text`, `StyleSheet`) |
| `flutter` | `*.dart` files · `pubspec.yaml` with `flutter:` · `import 'package:flutter/` · `Widget` |
| `kotlin` | (see Backend — Kotlin above; also applies to Android development) |
| `swift` | `*.swift` files · `import UIKit` / `import SwiftUI` · `Package.swift` · `*.xcodeproj` |

**Desktop:**

| Stack key | Detection signals |
|-----------|-------------------|
| `electron` | `electron` in deps · `BrowserWindow` · `ipcMain` · `ipcRenderer` · `app.whenReady()` |

**Runtime:**

| Stack key | Detection signals |
|-----------|-------------------|
| `deno` | `deno.json` / `deno.jsonc` · `Deno.` namespace · `jsr:` / `npm:` specifiers · `deno run` in scripts |

**Output — add to analysis summary:**
```yaml
detected_stacks: [vue3, typescript, tailwindcss]   # list of matched stack keys
```

If no stack is confidently detected → `detected_stacks: []` — steps downstream skip stack-specific loading silently.

---

### 8. Build Analysis Summary

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
  },
  "detected_stacks": ["vue3", "typescript"]
}
```

### 9. Report Analysis

```
✓ File analysis complete:
   📄 Files: {n} ({list of extensions})
   🎯 Domains: {domains}
   🧩 Stacks detected: {detected_stacks or "none"}
   📋 Configs needed: {configs}
   📚 Docs needed: {docs}
   💬 Annotations found: {count}
```

### 10. Load Next Step

Add `step-01-analyze-files` to `stepsCompleted`. Load: `{nextStepFile}`
