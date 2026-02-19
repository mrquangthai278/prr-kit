---
name: "step-01-scan-configs"
description: "Scan the target repo for config files, linting rules, and standards documents"
nextStepFile: "./step-02-extract-rules.md"
---

# Step 1: Scan Repository Config Files

## Sequence of Instructions

### 1. Announce Scan

```
🔍 Scanning project: {project_name}
   Repo: {target_repo}
   Looking for: config files, standards docs, architecture references...
```

### 2. Scan for Linting & Formatting Configs

Check for these files in `{target_repo}` (root and common subdirs):

**JavaScript/TypeScript:**
- `.eslintrc`, `.eslintrc.js`, `.eslintrc.json`, `.eslintrc.yaml`, `eslint.config.mjs`, `eslint.config.js`
- `.prettierrc`, `.prettierrc.json`, `prettier.config.mjs`, `prettier.config.js`
- `tsconfig.json`, `tsconfig.*.json`
- `.editorconfig`

**Python:**
- `pyproject.toml` (look for `[tool.ruff]`, `[tool.black]`, `[tool.isort]`, `[tool.flake8]`)
- `setup.cfg` (look for `[flake8]`, `[mypy]`)
- `.flake8`, `mypy.ini`

**CSS/Vue/React:**
- `.stylelintrc`, `stylelint.config.js`
- `vite.config.js`, `vite.config.ts`, `vue.config.js`

**General:**
- `.editorconfig`
- `sonar-project.properties`
- `.pre-commit-config.yaml`

For each found file: read it and note the key rules.

### 3. Scan for Standards Documents

Look for these files anywhere in `{target_repo}`:

```
CONTRIBUTING.md
CONTRIBUTING.rst
DEVELOPMENT.md
CODING_STANDARDS.md
CODING_STYLE.md
CODE_STYLE.md
ARCHITECTURE.md
ARCHITECTURE_DECISION*.md
docs/architecture/
docs/adr/          ← Architecture Decision Records
docs/standards/
docs/conventions/
.github/CONTRIBUTING.md
```

For each found file: read the relevant sections (skip boilerplate like "how to submit a PR").

Extract from these docs:
- Named conventions (e.g. "we use PascalCase for components")
- Prohibited patterns (e.g. "never use `var`", "no direct DOM manipulation")
- Required patterns (e.g. "all API calls go through the service layer")
- Domain terminology that has specific meaning

### 4. Scan for Package/Dependency Info

Read `package.json` (or `requirements.txt` / `pyproject.toml` / `Cargo.toml` / `go.mod`):

Extract:
- Main framework and version (Vue 3 / React 18 / Express 4 / etc.)
- Key libraries that imply patterns (e.g. `pinia` → state management pattern, `prisma` → ORM layer)
- Test framework (jest / vitest / pytest / etc.)
- Build toolchain (vite / webpack / esbuild / etc.)

### 5. Detect Project Type

Based on files found and dependencies, classify:

**Frontend framework:** Vue 3 / React / Angular / Svelte / vanilla / none
**Backend framework:** Express / Fastify / NestJS / Django / FastAPI / Spring / none
**Language:** TypeScript / JavaScript / Python / Java / Go / Rust / mixed
**DB/ORM:** Prisma / TypeORM / Sequelize / SQLAlchemy / none
**Test runner:** Vitest / Jest / Pytest / JUnit / none
**State management:** Pinia / Vuex / Redux / Zustand / none

### 6. Report What Was Found

```
✅ Scan complete:
   📄 Config files found: {n} ({list of filenames})
   📚 Standards docs found: {n} ({list of filenames})
   🏗️  Detected stack: {frontend} + {backend} ({language})
   ⚠️  Not found: {list of expected but missing files}
```

### 7. Load Next Step

Add `step-01-scan-configs` to `stepsCompleted`. Load: `{nextStepFile}`
