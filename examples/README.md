# setup-birdcc Examples

These examples are for repositories that keep BIRD configuration files and want GitHub Actions to lint, format-check, and parse-check those configs.

`setup-birdcc` only prepares the runner: checkout, Node.js, pnpm, optional submodules, and optional BIRD2/BIRD3. The workflow remains responsible for choosing which config files to check and which `birdcc` commands to run.

| Example                                                                      | Purpose                                                                          |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [`bird-config-lint.yml`](./bird-config-lint.yml)                             | Minimal CI for `birdcc lint bird.conf --bird`.                                   |
| [`bird-config-format-check.yml`](./bird-config-format-check.yml)             | Formatting gate for a single config entrypoint.                                  |
| [`bird-config-changed-files.yml`](./bird-config-changed-files.yml)           | Pull request workflow that only checks changed `.conf`/`.bird` files.            |
| [`bird-config-bird2-bird3-matrix.yml`](./bird-config-bird2-bird3-matrix.yml) | Parse smoke test against both BIRD2 and BIRD3.                                   |
| [`bird-config-submodules.yml`](./bird-config-submodules.yml)                 | Fast selected-submodule checkout for config repositories split across Git repos. |
| [`pinned-sha-config-lint.yml`](./pinned-sha-config-lint.yml)                 | Supply-chain hardened consumer workflow pinned to a full commit SHA.             |

For most config-only repositories, start with `bird-config-lint.yml` and keep:

```yaml
with:
  install-dependencies: "false"
  cache-turbo: "false"
```

That avoids creating a project-level `package.json` just to run `birdcc` through `pnpm dlx`.
