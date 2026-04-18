# PLAN.md – setup-birdcc Next-Step Optimization Plan

**Context:** `setup-birdcc` is a production-grade, reusable composite GitHub Action that prepares a runner for BIRD configuration file automation. Its core loop is: checkout → Node.js + pnpm → (optional) submodules → (optional) dependencies → (optional) Turbo cache → (optional) BIRD2/BIRD3 → expose `bird-bin` output.

This document captures the _next wave_ of improvements based on a full review of the current implementation.

---

## Current State Summary

| Area                  | Status   | Notes                                                                          |
| --------------------- | -------- | ------------------------------------------------------------------------------ |
| `action.yml`          | ✅ Solid | All inputs/outputs defined; composite steps well-ordered.                      |
| Input validation      | ✅ Solid | `validate-inputs.mjs` rejects unsafe paths, bad enums, control chars.          |
| BIRD installation     | ✅ Solid | `install-bird.mjs` supports Ubuntu and CZNIC apt sources for BIRD2/BIRD3.      |
| Example workflows     | ✅ Solid | 6 examples covering lint, fmt, changed-files, matrix, submodules, SHA-pinned.  |
| CI (action self-test) | ✅ Solid | Smoke jobs + Node script tests; invalid-input rejection verified.              |
| Release workflow      | ✅ Solid | Dry-run validation, source archive, GitHub Release on semver tag push.         |
| README.md             | ✅ Good  | Comprehensive; recently polished with nav links, badges, and `---` separators. |
| README.zh.md          | ✅ Good  | Newly created; mirrors English content with full Chinese translation.          |
| README.DEV.md         | ✅ Good  | Covers local `act` smoke tests, dry-run workflow, and release tagging.         |
| `pnpm-lock.yaml`      | ✅ Good  | Zero external runtime dependencies; only `node:*` built-ins used.              |

---

## Priority 1 — Consumer Experience

### 1.1 Auto-detect changed BIRD files via a dedicated output

**Problem:** Workflows that only want to check changed `.conf`/`.bird` files must re-implement `git diff` logic. This is error-prone and duplicated across repos.

**Proposal:** Add a new output `changed-config-files` (newline-separated) computed from `git diff --name-only` when `fetch-depth: "0"` is set. Consumers can reference it directly:

```yaml
- run: |
    for f in ${{ steps.setup.outputs.changed-config-files }}; do
      pnpm dlx @birdcc/cli@latest birdcc lint "$f" --bird
    done
```

**Implementation:** New script `scripts/resolve-changed-files.mjs`; new step after checkout in `action.yml`.

---

### 1.2 Expose `birdcc-version` as an output

**Problem:** Workflows that pin `@birdcc/cli@latest` cannot easily log or assert the exact birdcc version that ran.

**Proposal:** After `pnpm dlx @birdcc/cli@latest birdcc --version` (or a resolution step), emit a `birdcc-version` output for downstream steps to log or create cache keys from.

---

### 1.3 Add a `birdcc-version` input to pin the CLI version

**Problem:** Using `@latest` in consumer `pnpm dlx` calls can cause unexpected breakage when a new alpha is published.

**Proposal:** Add an optional `birdcc-version` input (default: `latest`). When set, the action emits the pinned version as part of the Node cache key and exposes it as an output:

```yaml
- uses: bird-chinese-community/setup-birdcc@v1
  with:
    birdcc-version: "0.1.0-alpha.5"
```

---

### 1.4 Windows / macOS runner support

**Problem:** `install-bird.mjs` calls `sudo apt-get` which is Linux-only. Non-Linux runners silently skip BIRD installation with no clear diagnostic.

**Proposal:**

- Detect `runner.os` via the `RUNNER_OS` env variable in the script.
- On non-Linux runners, emit a `::warning::` annotation and set `bird-bin` to empty.
- Document clearly in README that BIRD installation only works on Linux runners.

---

## Priority 2 — Technical Hardening

### 2.1 Reproducible Node.js cache key for `pnpm dlx`

**Problem:** `pnpm dlx @birdcc/cli@latest` always fetches from the registry; there is no cache layer for config-only repos that skip `install-dependencies`.

**Proposal:** When `install-dependencies: "false"`, add an optional `cache-pnpm-dlx: "true"` input that caches the pnpm store at `~/.local/share/pnpm/store` with a weekly key, dramatically reducing cold-start time for config repos.

---

### 2.2 BIRD installation idempotency check

**Problem:** If the action runs twice in the same job (e.g., reused container via `act`), `apt-get install` is called twice.

**Proposal:** In `install-bird.mjs`, check if the binary already exists at known paths before running apt commands. Skip installation and set outputs from the found binary.

---

### 2.3 Strict SHA pinning for third-party actions

**Problem:** `action.yml` uses floating tags for `actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4`, `actions/cache@v4`, and `dtolnay/rust-toolchain@master`. These can break silently.

**Proposal:** Pin all third-party action references to full SHA digests and add a `dependabot.yml` entry to auto-update them:

```yaml
# .github/dependabot.yml (already exists — add group)
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    groups:
      actions:
        patterns: ["*"]
```

---

### 2.4 Submodule initialization timeout guard

**Problem:** `sync-submodules.mjs` has no timeout; a large or slow submodule can block the job indefinitely.

**Proposal:** Add a `submodule-timeout` input (default: `60`, seconds). Pass it as `--depth-timeout` or implement a `AbortController`-based timeout in the script.

---

## Priority 3 — Ecosystem Integration

### 3.1 Publish to GitHub Actions Marketplace

**Problem:** The action is not yet listed on the GitHub Marketplace, reducing discoverability.

**Steps:**

1. Ensure `action.yml` has `branding.icon` and `branding.color` fields:
   ```yaml
   branding:
     icon: check-circle
     color: blue
   ```
2. Create a GitHub Release with a proper semver tag (e.g., `v1.0.0`).
3. Follow [GitHub Marketplace publishing docs](https://docs.github.com/en/actions/sharing-automations/creating-actions/publishing-actions-in-github-marketplace).

---

### 3.2 Integration test against a real BIRD config repository

**Problem:** Smoke tests use `bird.conf` from the runner's default install, not a real user config. Edge cases (includes, `%include`, large configs) are untested.

**Proposal:** Add a smoke job in `ci.yml` that clones a known public BIRD config repository (e.g., a sample from `bird-chinese-community`) and runs `birdcc lint` + `bird -p -c` against it.

---

### 3.3 Provide a `bird-config-repo` project template

**Problem:** New users still need to create a `bird.config.json` (or `birdcc.config.json`) and copy a workflow file manually.

**Proposal:** Create a GitHub repository template (`bird-chinese-community/bird-config-template`) with:

- A minimal `bird.conf` starter
- A `bird.config.json` with default settings
- A pre-configured `.github/workflows/ci.yml` using `setup-birdcc@v1`
- A `README.md` explaining the template

---

### 3.4 Document `BIRD_BIN` environment variable contract

**Problem:** The `BIRD_BIN` environment variable is used by `@birdcc/cli` but its contract (when it is respected, fallback behavior when absent) is not documented in `setup-birdcc`.

**Proposal:** Add a dedicated section in README explaining the `BIRD_BIN` → `bird-bin` output → `@birdcc/cli` resolution chain, including what happens when the variable is absent (CLI falls back to `PATH` lookup).

---

## Priority 4 — Developer Experience (Action Maintainer)

### 4.1 Add `act` configuration file (`.actrc`)

**Problem:** `act` invocation flags (`--container-architecture`, `-P`) must be re-typed each time.

**Proposal:** Add a `.actrc` at the repository root:

```
-P ubuntu-latest=catthehacker/ubuntu:act-latest
--container-architecture linux/amd64
```

This lets maintainers run `act -j smoke-basic` without extra flags.

---

### 4.2 Add VS Code task definitions

**Problem:** Running `pnpm test`, `actionlint`, or `act` requires switching to the terminal and recalling the exact command.

**Proposal:** Add `.vscode/tasks.json` with tasks:

- `Run tests` → `pnpm test`
- `Lint workflows` → `actionlint .github/workflows/*.yml examples/*.yml`
- `Act: smoke-basic` → `act -j smoke-basic --reuse`
- `Release dry-run` → `pnpm run release:dry-run -- --tag v1.0.0`

---

### 4.3 Add `CONTRIBUTING.md`

**Proposal:** Create a `CONTRIBUTING.md` covering:

- Scope: what the action should and should not do (keep thin, logic in scripts)
- Adding a new input: checklist (action.yml → validate-inputs.mjs → test → README)
- Testing locally with `act`
- Release process step-by-step

---

## Acceptance Checklist for Next Milestone

- [x] `changed-config-files` output implemented and documented — `scripts/resolve-changed-files.mjs` + action.yml step + output
- [ ] `birdcc-version` input and output added — Deferred; requires upstream `@birdcc/cli` changes
- [x] Non-Linux runner warning added to `install-bird.mjs` — Emits `::warning::` + empty outputs instead of throwing
- [x] BIRD installation idempotency check — `findExistingBird()` skips apt when binary exists
- [x] Submodule initialization timeout guard — `submodule-timeout` input + `parseTimeoutSeconds()` in sync-submodules.mjs
- [x] Third-party action SHA pinning completed in `action.yml` — All 6 actions pinned with `# vX` comments
- [x] `branding` fields added to `action.yml` — `icon: check-circle`, `color: blue`
- [ ] Published to GitHub Actions Marketplace — Requires manual release creation
- [x] `.actrc` added to repository root
- [x] `.vscode/tasks.json` added
- [x] `CONTRIBUTING.md` created
- [x] `BIRD_BIN` environment variable documented in README.md and README.zh.md
- [ ] Integration smoke test against a real config repository passing in CI — Future work
- [ ] `bird-config-repo` project template created — Future work
- [ ] `cache-pnpm-dlx` input for config-only repos — Future work

---

## Manual Steps Required

| Step                        | Owner      | Details                                                                          |
| --------------------------- | ---------- | -------------------------------------------------------------------------------- |
| Publish to Marketplace      | Maintainer | Create GitHub Release v1.0.0, then submit via GitHub UI.                         |
| Add `NPM_TOKEN` secret      | Maintainer | Not needed for this action (no npm publish), but needed for BIRD-LSP release CI. |
| Create config repo template | Maintainer | Create `bird-chinese-community/bird-config-template` repository on GitHub.       |
