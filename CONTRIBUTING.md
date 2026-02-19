# Contributing to PR Review Framework

Thank you for your interest in contributing! This document explains how to get involved.

## Ways to Contribute

- **Bug reports** — open an issue with steps to reproduce
- **Feature requests** — open an issue describing the use case
- **New review workflows** — add specialized reviewers or workflow steps
- **IDE integrations** — add support for new AI IDEs
- **Documentation** — improve guides, add examples
- **Code** — fix bugs, improve CLI, enhance the agent compiler

## Development Setup

```bash
# Clone the repo
git clone https://github.com/your-org/pr-review.git
cd pr-review

# Install dependencies
npm install

# Run tests
npm test
```

Node.js 18+ required.

## Project Structure

```
src/            # Source content — agents, workflows, tasks
tools/cli/      # CLI installer, IDE handlers, agent compiler
test/           # Tests for schema validation and installer components
docs/           # Documentation and assets
```

## Making Changes

### Adding a new workflow

1. Create a directory under `src/prr/workflows/{phase}/{name}/`
2. Add a `workflow.md` or `workflow.yaml` with proper frontmatter:
   ```yaml
   ---
   name: my-workflow
   description: "What this workflow does"
   ---
   ```
3. Add step files `steps/step-01-*.md`, `steps/step-02-*.md`, etc.
4. Reference the workflow in `src/core/agents/prr-master.agent.yaml` if it belongs in the main menu

### Adding a new reviewer agent

1. Create `src/prr/agents/{name}.agent.yaml`
2. Follow the existing agent YAML schema (see `test/test-agent-schema.js` for validation rules)
3. Run `npm test` to validate

### Modifying the CLI or installer

- CLI entry: `tools/cli/prr-cli.js`
- Installer core: `tools/cli/installers/lib/core/installer.js`
- IDE handlers: `tools/cli/installers/lib/ide/`
- Agent compiler (YAML → MD): `tools/cli/lib/agent/compiler.js`

## Testing

```bash
npm test
```

This runs:
1. `test/test-agent-schema.js` — validates all agent YAML files
2. `test/test-installation-components.js` — validates installer, manifest, and utility modules

## Pull Request Guidelines

1. **Branch naming**: `feature/description`, `fix/description`, `docs/description`
2. **Commits**: clear, imperative messages (e.g., `add security review checklist for GraphQL`)
3. **Tests**: run `npm test` before submitting — all tests must pass
4. **Scope**: keep PRs focused; one feature or fix per PR
5. **Description**: fill out the PR template — explain what changed and why

## Code Style

This project uses ESLint + Prettier. Run before committing:

```bash
npx prettier --write .
npx eslint .
```

Or configure your editor to format on save (see `.vscode/settings.json`).

## Workflow and Agent Content Guidelines

When writing workflow steps and agent personas:

- **Be explicit** — AI agents follow instructions literally; vague instructions produce vague results
- **One step per file** — each `step-N.md` does one focused thing
- **Always HALT** — if a step requires user input, include an explicit `HALT — wait for user response` instruction
- **Severity format** — always use `🔴 [BLOCKER]`, `🟡 [WARNING]`, `🟢 [SUGGESTION]`, `📌 [QUESTION]`
- **Config references** — use `{project-root}`, `{target_repo}`, `{review_output}` placeholders consistently

## Reporting Security Issues

Please do **not** open public issues for security vulnerabilities.
See [SECURITY.md](SECURITY.md) for responsible disclosure guidelines.

## License

By contributing, you agree that your contributions will be licensed under the same license as this project. See [LICENSE](LICENSE).
