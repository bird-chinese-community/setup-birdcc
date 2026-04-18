# Developing setup-birdcc

This file is for maintainers of the action itself. Consumer-facing usage belongs in [README.md](./README.md).

## Scope

`setup-birdcc` is a reusable composite GitHub Action. Its public job is to prepare a runner for BIRD config automation:

- checkout when requested;
- Node.js and pnpm setup;
- optional pnpm dependency install for repositories that already have a Node workspace;
- optional selected Git submodule initialization;
- optional Rust toolchain setup for BIRDCC development workflows;
- optional Turbo cache for monorepos;
- optional BIRD2/BIRD3 installation for parse validation.

The action should stay thin. Non-trivial logic belongs in Node.js ESM scripts under `scripts/`, and those scripts must not require npm dependencies.

## Local Commands

Run from this repository root:

```bash
pnpm install
pnpm run check:scripts
pnpm test
pnpm run release:dry-run -- --tag v1.0.0
```

Lint workflows and examples:

```bash
actionlint .github/workflows/*.yml examples/*.yml
```

Check whitespace-sensitive diffs:

```bash
git diff --check
```

## Local GitHub Actions Smoke Tests

`act` is useful for quick smoke tests:

```bash
act -j smoke-basic --reuse \
  --container-architecture linux/amd64 \
  -P ubuntu-latest=catthehacker/ubuntu:act-latest

act -j smoke-bird --reuse \
  --container-architecture linux/amd64 \
  -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

On Apple Silicon, Rust smoke tests can fail under `act` because local runner images may execute Rust tools through emulation. Treat GitHub-hosted `ubuntu-latest` as the source of truth for Rust validation.

## Release Dry Run

Before publishing a tag:

```bash
pnpm run ci
pnpm run release:dry-run -- --tag v1.0.0 --check-clean
```

The release workflow runs the same dry-run script, uploads a source archive, and creates a GitHub Release on pushed semver tags.

For a compatible v1 release:

```bash
git tag v1.0.0
git push origin v1.0.0

git tag -f v1 v1.0.0
git push origin v1 --force
```

Consumers may then use `@v1`, `@v1.0.0`, or a full commit SHA depending on their pinning policy.
