# setup-birdcc

Reusable GitHub Action for BIRDCC projects.

`setup-birdcc` is a composite action that prepares a pnpm/Turborepo workspace for CI and release workflows. It is designed for `bird-chinese-community/BIRD-LSP`, but can be reused by other BIRDCC repositories that need the same Node.js, pnpm, Turbo cache, Rust, and BIRD binary setup.

## Features

- Checkout with full history by default for Turbo affected filters.
- Install pinned pnpm and Node.js versions.
- Restore/save `.turbo` cache with `actions/cache`.
- Optionally initialize selected Git submodules.
- Optionally install Rust with `rustfmt`, `clippy`, and `wasm32-unknown-unknown`.
- Optionally install BIRD2 or BIRD3 for `bird -p -c` validation.
- Uses small Node.js ESM scripts for non-trivial logic instead of large bash blocks.

## Quick Start

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: bird-chinese-community/setup-birdcc@v1

      - run: pnpm turbo run lint typecheck test build format --continue
```

## BIRD-LSP Example

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: bird-chinese-community/setup-birdcc@v1
        with:
          install-rust: "true"
          submodule-paths: |
            refer/BIRD-source-code
            refer/BIRD-tm-language-grammar
            refer/BIRD2-vim-grammar

      - name: Run affected Turbo tasks
        run: pnpm turbo run lint typecheck test build format --continue --filter="...[origin/${{ github.base_ref || 'main' }}]"
```

See also:

- [`examples/bird-lsp-ci.yml`](./examples/bird-lsp-ci.yml)
- [`examples/bird-lsp-release.yml`](./examples/bird-lsp-release.yml)

## Inputs

| Input                         | Default                                           | Description                                                                |
| ----------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| `checkout`                    | `true`                                            | Run `actions/checkout@v4`.                                                 |
| `fetch-depth`                 | `0`                                               | Checkout fetch depth. Keep `0` for Turbo affected detection.               |
| `submodules`                  | `false`                                           | Value passed to `actions/checkout`; supports `false`, `true`, `recursive`. |
| `submodule-paths`             | empty                                             | Newline or comma separated submodule paths initialized with depth `1`.     |
| `node-version`                | `22`                                              | Node.js version.                                                           |
| `pnpm-version`                | `10.18.3`                                         | pnpm version.                                                              |
| `registry-url`                | `https://registry.npmjs.org`                      | npm registry URL for `actions/setup-node`.                                 |
| `working-directory`           | `.`                                               | Directory for dependency installation and Turbo cache path resolution.     |
| `install-dependencies`        | `true`                                            | Run the install command.                                                   |
| `install-command`             | `pnpm install --frozen-lockfile --prefer-offline` | Dependency installation command.                                           |
| `cache-turbo`                 | `true`                                            | Restore/save Turbo cache.                                                  |
| `turbo-cache-path`            | `.turbo`                                          | Turbo cache path relative to `working-directory`.                          |
| `install-rust`                | `false`                                           | Install Rust toolchain.                                                    |
| `rust-toolchain`              | `stable`                                          | Rust toolchain passed to `dtolnay/rust-toolchain`.                         |
| `rust-components`             | `rustfmt,clippy`                                  | Rust components to install.                                                |
| `rust-targets`                | `wasm32-unknown-unknown`                          | Rust targets to install.                                                   |
| `install-bird`                | `true`                                            | Install BIRD for `bird -p` validation.                                     |
| `bird-version`                | `2`                                               | BIRD major version, `2` or `3`.                                            |
| `bird-package-source`         | `auto`                                            | Package source: `auto`, `ubuntu`, or `cznic`.                              |
| `harden-runner`               | `false`                                           | Enable `step-security/harden-runner`.                                      |
| `harden-runner-egress-policy` | `audit`                                           | Egress policy passed to harden-runner.                                     |

## Outputs

| Output            | Description                                 |
| ----------------- | ------------------------------------------- |
| `bird-bin`        | Path to the installed BIRD binary.          |
| `bird-version`    | Output from `bird --version`.               |
| `turbo-cache-hit` | Exact cache hit value from `actions/cache`. |

## BIRD Installation

`bird-version: "2"` with `bird-package-source: auto` installs Ubuntu's `bird2` package.

`bird-version: "3"` with `bird-package-source: auto` installs BIRD3 from the CZNIC apt repository. BIRD3 is not available from the Ubuntu package source, so `bird-version: "3"` with `bird-package-source: ubuntu` is rejected.

This action does not vendor, commit, or redistribute BIRD binaries. It installs BIRD on the GitHub runner through apt and invokes it as an external process. That keeps this MIT-licensed action independent from BIRD's GPL distribution requirements while still allowing CI to run `bird -p -c`.

## Release Workflow Example

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: bird-chinese-community/setup-birdcc@v1
        with:
          install-rust: "true"
          registry-url: https://registry.npmjs.org

      - uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm run release:publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: "true"
```

## Local Development

Run script tests:

```bash
pnpm test
```

Lint workflows locally:

```bash
actionlint .github/workflows/*.yml
```

Run selected GitHub Actions jobs locally with `act`:

```bash
act -j smoke-basic --reuse \
  --container-architecture linux/amd64 \
  -P ubuntu-latest=catthehacker/ubuntu:act-latest

act -j smoke-bird --reuse \
  --container-architecture linux/amd64 \
  -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

Install local tooling on macOS:

```bash
brew install act actionlint
```

On Apple Silicon, the Rust smoke job may fail under `act` because Rust tools run through emulation in the local container. Treat GitHub-hosted `ubuntu-latest` as the source of truth for the Rust matrix.

## Publishing

Create a semantic version tag and push it:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Consumers should reference a major tag such as:

```yaml
- uses: bird-chinese-community/setup-birdcc@v1
```

Keep the `v1` tag updated to the latest compatible `v1.x.x` release.
