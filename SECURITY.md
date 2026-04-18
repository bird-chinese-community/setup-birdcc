# Security Policy

## Supported versions

| Version / branch             | Supported | Notes                                                                        |
| ---------------------------- | --------- | ---------------------------------------------------------------------------- |
| `main`                       | ✅        | Active development line and pre-release fixes                                |
| latest `v1.x` tag            | ✅        | Supported after `v1` is published; only the latest patch line receives fixes |
| older tags / historical SHAs | ❌        | Upgrade to the latest supported ref before requesting a fix                  |

If a stable `v1` release has not been published yet, treat `main` as the only supported line.

## Scope

This policy covers security issues in `setup-birdcc` itself, including:

- `action.yml` and composite workflow behavior;
- Node.js scripts under `scripts/`;
- release automation and example workflows in this repository;
- output handling, path validation, and runner setup logic.

Out of scope unless `setup-birdcc` directly introduces the risk:

- GitHub-hosted runner images and operating system packages;
- upstream BIRD binaries and package repositories;
- third-party GitHub Actions maintained outside BIRDCC;
- secrets or misconfigurations in consumer repositories.

## Reporting a vulnerability

Please **do not** open a public GitHub issue, pull request, or discussion for a suspected vulnerability.

Preferred reporting path:

1. Use GitHub private vulnerability reporting for this repository when available: <https://github.com/bird-chinese-community/setup-birdcc/security/advisories/new>
2. If that path is unavailable, email `npm-dev@birdcc.link` with a subject like `[SECURITY][setup-birdcc] short summary`

Please include as much of the following as you can:

- affected ref (`main`, tag, or commit SHA);
- runner OS and relevant action inputs;
- impact assessment (for example: command injection, secret leakage, path traversal, supply-chain risk);
- steps to reproduce or a minimal proof of concept;
- sanitized logs or screenshots.

## Response targets

We will make a good-faith effort to:

- acknowledge a report within 3 business days;
- provide an initial triage update within 7 business days;
- coordinate disclosure after a fix or mitigation is ready.

These targets are goals, not guarantees, but we do take security reports seriously.

## Coordinated disclosure

Please keep vulnerability details private until a fix, mitigation, or explicit disclosure window has been agreed with maintainers.

## Hardening notes for consumers

For production workflows, we recommend:

- pinning the action to a full commit SHA after review;
- keeping repository and organization secrets in GitHub Secrets, never in workflow YAML;
- using the least privilege `permissions:` needed by each job;
- reviewing downstream commands that consume `bird-bin` or `changed-config-files` outputs.
