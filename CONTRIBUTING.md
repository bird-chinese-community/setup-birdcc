# Contributing to setup-birdcc

Thank you for considering contributing to `setup-birdcc`. This document explains the project scope, development workflow, and how to add features.

## Scope

`setup-birdcc` is a **thin composite GitHub Action** that prepares a runner for BIRD configuration file automation. It should stay focused on environment setup and avoid executing lint/format commands on behalf of the consumer.

**In scope:**

- Checkout, Node.js, pnpm, and optional Turbo cache setup
- Optional BIRD2/BIRD3 binary installation
- Optional Rust toolchain setup (for BIRDCC development)
- Input validation and output exposure
- Selected Git submodule initialization

**Out of scope:**

- Running `birdcc` commands (the consumer workflow decides what to run)
- Deciding which config files are valid
- Publishing npm packages (that belongs to BIRD-LSP)

## Prerequisites

- Node.js 22+
- pnpm 10+
- [`actionlint`](https://github.com/rhysd/actionlint) (optional, for linting workflow YAML)
- [`act`](https://github.com/nektos/act) (optional, for local GitHub Actions smoke tests)

## Development Workflow

```bash
# Install (no runtime deps, only devDependencies for testing)
pnpm install

# Syntax-check all scripts
pnpm run check:scripts

# Run unit tests
pnpm test

# Full CI: check:scripts + test + release dry-run
pnpm run ci

# Lint workflow and example YAML files
actionlint .github/workflows/*.yml examples/*.yml
```

## Adding a New Input

When adding a new input to the action, follow this checklist:

1. **`action.yml`** — Add the input definition with `description`, `required: false`, and a sensible `default`.
2. **`scripts/validate-inputs.mjs`** — Add validation logic (enum, boolean, path safety, etc.).
3. **`test/validate-inputs.test.mjs`** — Add test cases for valid and invalid values.
4. **`action.yml` steps** — Wire the input into the composite step that uses it, passing it via `env:` variables.
5. **`README.md`** — Add the input to the Inputs table.
6. **`README.zh.md`** — Mirror the update in Chinese.
7. **`examples/`** — Update or add an example workflow if relevant.

## Adding a New Output

1. **`action.yml`** — Add the output definition under `outputs:`.
2. **Script** — Use `appendFileSync(process.env.GITHUB_OUTPUT, ...)` to write the value.
3. **`README.md` / `README.zh.md`** — Add the output to the Outputs table.

## Script Guidelines

- All scripts live under `scripts/` and must be valid ESM (`#!/usr/bin/env node`).
- Scripts must **not** require npm dependencies — only `node:*` built-ins are allowed.
- Export testable pure functions and keep side effects in a `main()` guarded by `if (process.argv[1] === fileURLToPath(import.meta.url))`.

## Testing

Tests use Node.js built-in `node:test` and `node:assert/strict`. No test framework dependencies.

```bash
# Run all tests
pnpm test

# Run a single test file
node --test test/validate-inputs.test.mjs
```

## Local Smoke Tests with `act`

A `.actrc` file provides default flags for Apple Silicon and Linux:

```bash
# Run the basic smoke test
act -j smoke-basic --reuse

# Run the BIRD installation smoke test
act -j smoke-bird --reuse
```

> **Note:** On Apple Silicon, Rust smoke tests may fail under `act` due to emulation. Treat GitHub-hosted `ubuntu-latest` as the source of truth for Rust.

## Release Process

1. Ensure all tests pass: `pnpm run ci`
2. Run a release dry-run: `pnpm run release:dry-run -- --tag v1.x.y --check-clean`
3. Create and push the semver tag:
   ```bash
   git tag v1.x.y
   git push origin v1.x.y
   ```
4. The release workflow creates a GitHub Release automatically.
5. Update the major tag for consumer convenience:
   ```bash
   git tag -f v1 v1.x.y
   git push origin v1 --force
   ```

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) with a kebab-case scope:

```
feat(bird-install): add idempotency check for existing binary
fix(validate): reject control characters in registry-url
docs(readme): add BIRD_BIN environment variable section
chore(deps): pin third-party actions to SHA
```
