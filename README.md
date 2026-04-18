<div align="center">

# 🕊️ setup-birdcc

</div>

<p align="center">
  <strong>Set up GitHub Actions runners for BIRD config automation</strong>
</p>

<p align="center">
  <a href="https://github.com/marketplace/actions/setup-birdcc">
    <img src="https://img.shields.io/badge/GitHub%20Actions-Marketplace-2088FF?style=flat-square&logo=github-actions&logoColor=white" alt="GitHub Actions Marketplace" />
  </a>
  <a href="https://github.com/bird-chinese-community/setup-birdcc/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="MIT License" />
  </a>
  <a href="https://github.com/bird-chinese-community/setup-birdcc/actions/workflows/ci.yml">
    <img src="https://github.com/bird-chinese-community/setup-birdcc/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
</p>

<div align="center">

English Version | [中文文档](./README.zh.md)

> [Overview](#overview) · [Quick Start](#quick-start) · [Inputs](#inputs) · [Outputs](#outputs) · [Version Selection](#version-selection) · [BIRD Version Guide](#bird-version-guide) · [Real-World Patterns](#real-world-patterns) · [License Notes](#license-notes)

</div>

---

## Overview

`setup-birdcc` is a reusable composite GitHub Action that prepares a runner for BIRD configuration file automation. It installs Node.js, pnpm, and optionally BIRD2/BIRD3 so your workflow can run `birdcc` and `bird -p -c` without repeating runner setup boilerplate.

Use this action when a repository needs CI to lint, format-check, or parse-check BIRD configuration files. It is a companion to the [BIRD-LSP](https://github.com/bird-chinese-community/BIRD-LSP) toolchain and its [`@birdcc/cli`](https://www.npmjs.com/package/@birdcc/cli) package.

```yaml
steps:
  - name: Set up BIRD config tooling
    id: setup
    uses: bird-chinese-community/setup-birdcc@v1
    with:
      install-dependencies: "false"
      cache-turbo: "false"

  - name: Lint and parse BIRD config
    run: pnpm dlx @birdcc/cli@latest birdcc lint bird.conf --bird
    env:
      BIRD_BIN: ${{ steps.setup.outputs.bird-bin }}
```

For action maintenance, local `act` notes, and release dry runs, see [README.DEV.md](./README.DEV.md).

---

## What This Action Does

This action prepares the runner environment only. It does not decide which config files are valid for your network and it does not run hidden lint commands for you.

| Capability          | Default   | Typical config-repo setting                                      |
| ------------------- | --------- | ---------------------------------------------------------------- |
| Checkout            | on        | Keep on unless you already checked out the repo.                 |
| Node.js             | `22`      | Needed for `pnpm dlx @birdcc/cli`.                               |
| pnpm                | `10.18.3` | Needed for `pnpm dlx` or workspace installs.                     |
| pnpm install        | on        | Set `install-dependencies: "false"` for config-only repos.       |
| Turbo cache         | on        | Set `cache-turbo: "false"` outside Turborepo projects.           |
| Selected submodules | off       | Use `submodule-paths` for config repos stored as Git submodules. |
| Rust toolchain      | off       | Usually not needed for config-only repos.                        |
| BIRD binary         | BIRD2 on  | Used by `birdcc lint --bird` or direct `bird -p -c`.             |
| Harden runner       | off       | Opt in only after checking network egress needs.                 |

## Quick Start

### Lint And Parse A Single Config

```yaml
name: BIRD Config Lint

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Set up BIRD config tooling
        id: setup
        uses: bird-chinese-community/setup-birdcc@v1
        with:
          install-dependencies: "false"
          cache-turbo: "false"

      - name: Lint and validate the main config
        run: pnpm dlx @birdcc/cli@latest birdcc lint bird.conf --bird
        env:
          BIRD_BIN: ${{ steps.setup.outputs.bird-bin }}
```

### Check Formatting

```yaml
- name: Set up BIRD config tooling
  uses: bird-chinese-community/setup-birdcc@v1
  with:
    install-dependencies: "false"
    cache-turbo: "false"
    install-bird: "false"

- name: Check formatting
  run: pnpm dlx @birdcc/cli@latest birdcc fmt bird.conf --check
```

### Direct BIRD Parse Check

```yaml
- name: Set up BIRD3
  id: setup
  uses: bird-chinese-community/setup-birdcc@v1
  with:
    install-dependencies: "false"
    cache-turbo: "false"
    bird-version: "3"

- name: Parse config with BIRD
  run: '"${{ steps.setup.outputs.bird-bin }}" -p -c bird.conf'
```

More copyable workflows live in [examples/](./examples/).

---

## Version Selection

Choose the ref based on how tightly you need to pin your supply chain.

| Ref style        | Example                                                                        | Use when                                                    |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Major tag        | `bird-chinese-community/setup-birdcc@v1`                                       | Recommended default. Receives compatible fixes.             |
| Exact semver tag | `bird-chinese-community/setup-birdcc@v1.0.0`                                   | You want reproducible release behavior with a readable tag. |
| Full commit SHA  | `bird-chinese-community/setup-birdcc@0123456789abcdef0123456789abcdef01234567` | Highest pinning. Use with Dependabot or a scheduled review. |
| Branch           | `bird-chinese-community/setup-birdcc@main`                                     | Only for testing action changes before release.             |

For protected production config repositories, pin to a full commit SHA after auditing the release. For normal CI, `@v1` is the friendlier default.

---

## BIRD Version Guide

| Input                                                    | Result                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| `bird-version: "2"`                                      | Installs Ubuntu's `bird2` package by default.                        |
| `bird-version: "3"`                                      | Installs BIRD3 from the CZNIC apt repository by default.             |
| `bird-package-source: "ubuntu"` with BIRD2               | Forces Ubuntu apt packages.                                          |
| `bird-package-source: "cznic"`                           | Forces the CZNIC apt repository.                                     |
| `bird-version: "3"` plus `bird-package-source: "ubuntu"` | Rejected, because Ubuntu does not provide BIRD3 through that source. |

This action installs BIRD on the runner only. It does not vendor, commit, or redistribute BIRD source code or binaries.

---

## Inputs

| Input                         | Default                                           | Description                                                                                  |
| ----------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `checkout`                    | `true`                                            | Run `actions/checkout@v4`.                                                                   |
| `fetch-depth`                 | `0`                                               | Checkout fetch depth. Keep `0` for changed-file or affected-history workflows.               |
| `submodules`                  | `false`                                           | Passed to checkout. Use `false`, `true`, or `recursive`.                                     |
| `submodule-paths`             | empty                                             | Newline or comma separated paths to initialize with `git submodule update --init --depth 1`. |
| `submodule-timeout`           | `120`                                             | Timeout in seconds for each submodule git operation.                                         |
| `node-version`                | `22`                                              | Node.js version.                                                                             |
| `pnpm-version`                | `10.18.3`                                         | pnpm version.                                                                                |
| `registry-url`                | `https://registry.npmjs.org`                      | npm registry for `actions/setup-node`.                                                       |
| `working-directory`           | `.`                                               | Directory for dependency install and cache path resolution.                                  |
| `install-dependencies`        | `true`                                            | Run `install-command`. Use `false` for config-only repositories that run `pnpm dlx`.         |
| `install-command`             | `pnpm install --frozen-lockfile --prefer-offline` | Dependency installation command.                                                             |
| `cache-turbo`                 | `true`                                            | Restore/save Turbo cache. Use `false` outside Turborepo projects.                            |
| `turbo-cache-path`            | `.turbo`                                          | Turbo cache path relative to `working-directory`.                                            |
| `install-rust`                | `false`                                           | Install Rust toolchain.                                                                      |
| `rust-toolchain`              | `stable`                                          | Rust toolchain passed to `dtolnay/rust-toolchain`.                                           |
| `rust-components`             | `rustfmt,clippy`                                  | Comma separated Rust components.                                                             |
| `rust-targets`                | `wasm32-unknown-unknown`                          | Comma separated Rust targets.                                                                |
| `install-bird`                | `true`                                            | Install BIRD for `birdcc lint --bird` or direct parse checks.                                |
| `bird-version`                | `2`                                               | BIRD major version: `2` or `3`.                                                              |
| `bird-package-source`         | `auto`                                            | `auto`, `ubuntu`, or `cznic`.                                                                |
| `harden-runner`               | `false`                                           | Enable `step-security/harden-runner`.                                                        |
| `harden-runner-egress-policy` | `audit`                                           | `audit` or `block`.                                                                          |

---

## Outputs

| Output                | Description                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `bird-bin`            | Path to installed BIRD binary. Empty when `install-bird: "false"` or on non-Linux runners.          |
| `bird-version`        | `bird --version` output. Empty when `install-bird: "false"`.                                        |
| `turbo-cache-hit`     | Exact Turbo cache hit from `actions/cache`.                                                         |
| `changed-config-files`| Newline-separated list of changed BIRD config files (`.conf`, `.bird`, `.bird2`, `.bird3`) detected via `git diff`. Requires `fetch-depth: "0"` and a PR context. |

---

## BIRD_BIN Environment Variable

`@birdcc/cli` reads the `BIRD_BIN` environment variable to locate the BIRD binary for `birdcc lint --bird` parse validation. The resolution chain is:

1. `BIRD_BIN` env var (set by the consumer workflow from `steps.<id>.outputs.bird-bin`)
2. `bird` on `$PATH` (fallback in `@birdcc/cli`)

Pass the output as an env var in your lint step:

```yaml
- name: Lint config
  run: pnpm dlx @birdcc/cli@latest birdcc lint bird.conf --bird
  env:
    BIRD_BIN: ${{ steps.setup.outputs.bird-bin }}
```

On non-Linux runners, `bird-bin` will be empty and `@birdcc/cli` will skip BIRD parse validation gracefully.

---

## Real-World Patterns

Use `submodule-paths` when production configs live in one or more private or shared Git submodules:

```yaml
- uses: bird-chinese-community/setup-birdcc@v1
  with:
    install-dependencies: "false"
    cache-turbo: "false"
    submodule-paths: |
      vendor/route-server-configs
      vendor/lab-bird-configs
```

Use a BIRD2/BIRD3 matrix when you maintain migration-safe configs:

```yaml
strategy:
  fail-fast: false
  matrix:
    bird-version: ["2", "3"]
steps:
  - id: setup
    uses: bird-chinese-community/setup-birdcc@v1
    with:
      install-dependencies: "false"
      cache-turbo: "false"
      bird-version: ${{ matrix.bird-version }}
  - run: '"${{ steps.setup.outputs.bird-bin }}" -p -c bird.conf'
```

---

## License Notes

`setup-birdcc` is released under the MIT License. BIRD and `@birdcc/cli` have their own licenses. This action installs and invokes external tools on the runner; it does not embed their source code or binaries.
