# PLAN.md – BirdCC Monorepo CI/CD & Developer Experience Upgrade

**Target Agent:** Codex (OpenAI Coding Agent)  
**Context:** This plan is based on the existing `bird-chinese-community/BIRD-LSP` monorepo (pnpm + Turborepo + Changesets) and the architectural discussion in the chat history.  
**Goal:** Implement a modern, reusable, locally-debuggable, and AI‑friendly CI/CD pipeline, integrate BIRD binary validation, and document the workflow for both humans and agents.

---

## 1. Project Overview

| Aspect               | Details                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| Repository           | `../BIRD-LSP`                                                               |
| Package Manager      | pnpm (v10.18.3)                                                             |
| Monorepo Tool        | Turborepo (pipeline defined in `turbo.json`)                                |
| Versioning & Publish | Changesets + `bumpp` (script `release:publish`)                             |
| Packages             | 8 packages under `packages/@birdcc/*`                                       |
| License              | GPL-3.0 (compatible with BIRD’s GPL‑2+; no redistribution of BIRD binaries) |
| Core Validation      | `bird -p` (BIRD configuration syntax check) invoked by LSP / CLI            |

---

## 2. Architecture & Design Principles

### 2.1 Layered Workflow Strategy

We adopt **3 core workflows + 1 reusable composite action**:

- **`setup-birdcc`** – Reusable composite action for environment initialization (Node, pnpm, Turbo cache, BIRD binary).
- **`ci.yml`** – Main CI triggered on PRs and pushes to `main`. Runs **only affected packages** using Turbo’s `--filter` flag.
- **`release.yml`** – Publish workflow triggered on `main` when Changesets are present. Automates versioning and npm publish.
- **`lint-workflows.yml`** – Meta‑CI that lints all GitHub Actions YAML files with `actionlint`.

### 2.2 Toolchain Philosophy

| Tool                          | Purpose                        | Why Chosen (DX & AI Agent Native)                                      |
| ----------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `pnpm/action-setup`           | Package manager setup          | Official, fastest, auto‑caches `node_modules` and `.pnpm-store`.       |
| `actions/cache`               | Turbo cache persistence        | Reduces CI time from minutes to seconds.                               |
| `nektos/act`                  | Local GitHub Actions emulation | **Game Changer** – full local CI loop without pushing.                 |
| `rhysd/actionlint`            | Lint workflow YAML files       | Industry standard; prevents syntax errors and enforces best practices. |
| `changesets/action`           | Release automation             | Integrates seamlessly with existing `release:publish` script.          |
| `step-security/harden-runner` | Security hardening             | Audit egress policy, prevent token leaks (optional but recommended).   |

---

## 3. Implementation Tasks

### Task 1 – Reusable Setup Action (`.github/actions/setup-birdcc/action.yml`)

**Purpose:** Single source of truth for all workflow environment initialization.

**Implementation Steps:**

1. Create the directory `.github/actions/setup-birdcc`.
2. Write the `action.yml` composite action with the following steps:
   - Harden Runner (optional).
   - Checkout with `fetch-depth: 0` (required for Turbo `affected`).
   - Setup pnpm (version pinned to `10.18.3`).
   - Setup Node.js (default `22`, cache `pnpm`).
   - Install dependencies with `pnpm install --frozen-lockfile --prefer-offline`.
   - Restore/save Turbo cache using `actions/cache@v4` (path: `.turbo`).
   - **Install BIRD2 binary** for `bird -p` validation (see License Note below).

**License Note (BIRD Binary Installation):**  
Installing and invoking `bird` as an external process is **fully compliant** with GPL. We are not redistributing or linking BIRD code. The user/CI provides the binary.

**Example snippet for BIRD installation (Ubuntu runner):**

```yaml
- name: Install BIRD2
  shell: bash
  run: |
    sudo apt-get update
    sudo apt-get install -y bird2
    bird --version
```

### Task 2 – Main CI Workflow (`.github/workflows/ci.yml`)

**Trigger:** `push` to `main`, `pull_request` to `main`.

**Steps:**

1. Use the reusable action: `uses: ./.github/actions/setup-birdcc`.
2. Run Turbo pipeline on **affected packages only**:
   ```bash
   pnpm turbo run lint typecheck test build format \
     --continue \
     --filter="...[origin/${{ github.base_ref || 'main' }}]"
   ```
3. (Optional) Upload coverage to Codecov.

### Task 3 – Release Workflow (`.github/workflows/release.yml`)

**Trigger:** `push` to `main` branch.

**Permissions:** `contents: write`, `id-token: write` (for npm provenance).

**Steps:**

1. Use reusable `setup-birdcc`.
2. Run Changesets action:
   - `version`: `pnpm changeset version`
   - `publish`: `pnpm run release:publish`
3. Provide secrets: `GITHUB_TOKEN` and `NPM_TOKEN` (must be added to GitHub Secrets).

### Task 4 – Workflow Linting (`.github/workflows/lint-workflows.yml`)

**Trigger:** `pull_request` with changes to `.github/workflows/**`, plus `workflow_dispatch`.

**Steps:**

1. Checkout.
2. Run `reviewdog/action-actionlint@v1` with `reporter: github-pr-review` and `fail-on-error: true`.

### Task 5 – Local Development Documentation

**Objective:** Enable developers (and AI agents) to run CI locally with `act` and validate workflow syntax with `actionlint`.

**Documentation Additions to `README.md`:**

- Installation commands for `act` and `actionlint`.
- Example commands:

  ```bash
  # Lint workflows
  actionlint .github/workflows/*.yml

  # Run full CI locally (reuse containers for speed)
  act -j ci --reuse

  # Run a specific job
  act -j release --reuse
  ```

- (Optional) Add VS Code tasks in `.vscode/tasks.json` for one‑click local CI.

### Task 6 – Security & Best Practices (Optional but Recommended)

- Integrate `step-security/harden-runner` in the reusable action.
- Consider adding `dorny/paths-filter` if fine‑grained path filtering is needed (Turbo already handles it well).

---

## 4. Acceptance Criteria / Checklist

- [ ] **`setup-birdcc` action created** and correctly referenced by all workflows.
- [ ] **`ci.yml` passes** on a PR that modifies a package (verify affected filtering).
- [ ] **`release.yml` creates a Release PR** when a changeset is pushed to `main`.
- [ ] **`lint-workflows.yml` runs** and passes on PRs touching workflow files.
- [ ] **BIRD binary is installed** in CI and `bird -p` validation works (if integrated into lint/test).
- [ ] **`act -j ci` runs successfully locally** (after `act` is installed).
- [ ] **`actionlint` returns no errors** for all workflow YAML files.
- [ ] **`README.md` updated** with local development instructions for `act` and `actionlint`.
- [ ] **Secrets configured:** `NPM_TOKEN` added to GitHub repository secrets.

---

## 5. Notes for Codex

- **File Structure:** Please create or modify exactly the files listed in Section 3.
- **Secrets:** Do **not** attempt to create or modify secrets programmatically; only output instructions for manual setup.
- **Package Manager:** Always use `pnpm`; do not generate `npm` or `yarn` commands.
- **Turbo Filter:** The `--filter="...[origin/main]"` syntax is **intentional** and required for correct affected detection.
- **License Compliance:** The BIRD installation step is **explicitly allowed** under GPL. No license conflict exists.
- **Testing Locally:** After implementation, you (Codex) may suggest the user run `act` to validate, but cannot execute it directly.

---

## 6. Expected Deliverables from Codex

1. Four YAML files as described above (fully commented, ready to copy/paste).
2. A proposed diff for `README.md` (or a new section) covering local CI tooling.
3. A concise summary of any manual steps the user must perform (e.g., adding `NPM_TOKEN` secret).

**End of PLAN.md**
