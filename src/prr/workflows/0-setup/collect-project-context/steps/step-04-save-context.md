---
name: "step-04-save-context"
description: "Save complete project context to YAML file for use by all review workflows"
---

# Step 4: Save Project Context

## Sequence of Instructions

### 1. Assemble Complete Context Document

Combine everything from steps 01-03 into a single structured YAML:

```yaml
# PR Review — Project Context
# Generated: {date}
# Project: {project_name}
# Repo: {target_repo}

meta:
  generated_date: "{date}"
  generated_by: "{user_name}"
  project_name: "{project_name}"
  schema_version: "1"

stack:
  frontend: "{detected_frontend}"          # vue3 / react / angular / none
  backend: "{detected_backend}"            # express / nestjs / django / none
  language: "{primary_language}"           # typescript / javascript / python / java
  orm: "{orm_or_none}"
  test_runner: "{test_framework}"
  state_management: "{state_lib_or_none}"
  build_tool: "{vite_or_webpack_etc}"

coding_standards:
  enforced_rules:                          # from ESLint/linting configs
    - "{rule_name}: {description}"
  soft_warnings:
    - "{rule_name}: {description}"
  typescript:
    strict: {true|false}
    no_implicit_any: {true|false}
    strict_null_checks: {true|false}

naming_conventions:
  documented:
    - thing: "{what}"
      convention: "{PascalCase|camelCase|snake_case|kebab-case|UPPER_SNAKE}"
      example: "{example}"
  inferred:
    - thing: "{what}"
      convention: "{convention}"
      example: "{example}"
      note: "inferred from existing files, not documented"

architecture:
  description: "{architecture_description}"
  layer_order: "{layer → layer → layer}"
  prohibited:
    - "{cross-layer violation that must not happen}"
  established_patterns:
    error_handling: "{description}"
    api_response_format: "{description or null}"
    auth_pattern: "{description or null}"
    logging: "{description or null}"
  known_debt:
    - "{known issue to deprioritize in reviews}"

testing:
  framework: "{vitest|jest|pytest|none}"
  file_pattern: "{*.spec.ts|*.test.ts|test_*.py}"
  location: "{co-located|__tests__|test/ folder}"
  coverage_threshold: "{percentage or null}"
  what_requires_tests: "{all new code|only services|only utils|none documented}"

domain:
  description: "{business domain description}"
  key_entities:
    - "{Entity}"
  business_rules:
    - "{rule that code must enforce}"
  terminology:
    - term: "{domain term}"
      meaning: "{what it means in this project}"

review_guidelines:
  priorities:
    - "{what to focus on most}"
  ignore_list:
    - "{what to NOT flag — intentional or known}"
  pr_specific_rules:
    - "{when to require which review type}"
```

### 2. Write to File

Write the assembled YAML to:
```
{review_output}/project-context.yaml
```

### 3. Write Human-Readable Summary

Also write a compact summary at:
```
{review_output}/project-context-summary.md
```

Content:
```markdown
# Project Context: {project_name}

**Stack:** {frontend} + {backend} ({language})
**Generated:** {date} by {user_name}

## Key Rules for Reviewers

### Must Follow (enforced by linting)
{enforced_rules as bullet list}

### Architecture Rules
- Layer order: {layer_order}
{prohibited as bullet list}

### Naming Conventions
{naming table}

### Business Rules
{business_rules as bullet list}

### Review Priorities
{priorities as bullet list}

### Do NOT Flag
{ignore_list as bullet list}
```

### 4. Display Completion

```
✅ Project Context Saved!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Context file:   {review_output}/project-context.yaml
📋 Summary:        {review_output}/project-context-summary.md

What was captured:
  🏗️  Stack: {stack_summary}
  📏  Linting rules: {n} hard, {n} soft
  🔤  Naming conventions: {n} documented, {n} inferred
  🏢  Architecture layers: {layer_order}
  📖  Business rules: {n}
  🎯  Review priorities: {n}
  🚫  Ignore list: {n} items

All review workflows will now load this context automatically.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next step: Run [SP] Select PR to begin reviewing.
```

**Workflow complete.** Return to agent menu.
