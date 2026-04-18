<div align="center">

# 🐦 setup-birdcc

</div>

<p align="center">
  <strong>为 BIRD Config 自动化 CI 准备的 GitHub Actions Runner</strong>
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

[English Version](./README.md) | 中文文档

> [概述](#概述) · [快速开始](#快速开始) · [输入参数](#输入参数) · [输出参数](#输出参数) · [版本选择](#版本选择) · [BIRD 版本指南](#bird-版本指南) · [实际使用场景](#实际使用场景) · [许可证说明](#许可证说明)

</div>

---

## 概述

`setup-birdcc` 是一个可复用的 GitHub Actions 复合 Action，用于为 BIRD 配置文件自动化流水线准备 Runner 环境。它会安装 Node.js、pnpm，并可选安装 BIRD2/BIRD3，让你的工作流能够直接运行 `birdcc` 和 `bird -p -c`，无需在每个仓库重复编写 Runner 初始化样板代码。

当你的仓库需要 CI 来对 BIRD 配置文件进行 **语法检查（lint）**、**格式校验（format check）** 或 **解析验证（parse check）** 时，使用本 Action。它是 [BIRD-LSP](https://github.com/bird-chinese-community/BIRD-LSP) 工具链及 [`@birdcc/cli`](https://www.npmjs.com/package/@birdcc/cli) 包的配套 Action。

```yaml
steps:
  - name: 配置 BIRD 工具链
    id: setup
    uses: bird-chinese-community/setup-birdcc@v1
    with:
      install-dependencies: "false"
      cache-turbo: "false"

  - name: 检查并解析 BIRD 配置
    run: pnpm dlx @birdcc/cli@latest birdcc lint bird.conf --bird
    env:
      BIRD_BIN: ${{ steps.setup.outputs.bird-bin }}
```

Action 维护说明、本地 `act` 调试方法和发布流程，请参阅 [README.DEV.md](./README.DEV.md)。

---

## 此 Action 的功能

本 Action 只负责准备 Runner 环境，不决定哪些配置文件对你的网络是有效的，也不会为你执行任何隐式的 lint 命令。

| 功能          | 默认值     | 推荐的配置仓库设置                                    |
| ------------- | ---------- | ----------------------------------------------------- |
| Checkout      | 开启       | 若已手动 checkout，可关闭。                           |
| Node.js       | `22`       | `pnpm dlx @birdcc/cli` 所需。                         |
| pnpm          | `10.18.3`  | `pnpm dlx` 或 workspace 安装所需。                    |
| pnpm install  | 开启       | 纯配置仓库可设为 `install-dependencies: "false"`。    |
| Turbo 缓存    | 开启       | 非 Turborepo 项目可设为 `cache-turbo: "false"`。      |
| 指定子模块    | 关闭       | 若配置以 Git 子模块形式存储，使用 `submodule-paths`。 |
| Rust 工具链   | 关闭       | 纯配置仓库通常不需要。                                |
| BIRD 二进制   | BIRD2 开启 | 用于 `birdcc lint --bird` 或直接执行 `bird -p -c`。   |
| Harden Runner | 关闭       | 仅在确认网络出口需求后再开启。                        |

---

## 快速开始

### 对单个配置文件进行 Lint 和解析

```yaml
name: BIRD 配置检查

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
      - name: 配置 BIRD 工具链
        id: setup
        uses: bird-chinese-community/setup-birdcc@v1
        with:
          install-dependencies: "false"
          cache-turbo: "false"

      - name: 检查主配置文件
        run: pnpm dlx @birdcc/cli@latest birdcc lint bird.conf --bird
        env:
          BIRD_BIN: ${{ steps.setup.outputs.bird-bin }}
```

### 格式校验

```yaml
- name: 配置 BIRD 工具链
  uses: bird-chinese-community/setup-birdcc@v1
  with:
    install-dependencies: "false"
    cache-turbo: "false"
    install-bird: "false"

- name: 检查格式
  run: pnpm dlx @birdcc/cli@latest birdcc fmt bird.conf --check
```

### 直接使用 BIRD 解析校验

```yaml
- name: 安装 BIRD3
  id: setup
  uses: bird-chinese-community/setup-birdcc@v1
  with:
    install-dependencies: "false"
    cache-turbo: "false"
    bird-version: "3"

- name: 使用 BIRD 解析配置
  run: '"${{ steps.setup.outputs.bird-bin }}" -p -c bird.conf'
```

更多可直接复用的工作流示例请参阅 [examples/](./examples/)。

---

## 版本选择

根据供应链安全需求选择合适的引用方式：

| 引用方式        | 示例                                                                           | 适用场景                                         |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| 主版本号标签    | `bird-chinese-community/setup-birdcc@v1`                                       | 推荐默认用法，会自动接收兼容性修复。             |
| 精确语义化标签  | `bird-chinese-community/setup-birdcc@v1.0.0`                                   | 需要可复现行为且保持可读性。                     |
| 完整 commit SHA | `bird-chinese-community/setup-birdcc@0123456789abcdef0123456789abcdef01234567` | 最高级别的版本锁定，适合 Dependabot 或定期审计。 |
| 分支名          | `bird-chinese-community/setup-birdcc@main`                                     | 仅用于发布前测试 Action 本身的变更。             |

对于生产环境的配置仓库，建议在审计发布内容后锁定到完整 commit SHA。普通 CI 使用 `@v1` 即可。

---

## BIRD 版本指南

| 输入组合                                              | 结果                                    |
| ----------------------------------------------------- | --------------------------------------- |
| `bird-version: "2"`                                   | 默认从 Ubuntu 官方源安装 `bird2`。      |
| `bird-version: "3"`                                   | 默认从 CZNIC apt 源安装 BIRD3。         |
| `bird-package-source: "ubuntu"` + BIRD2               | 强制使用 Ubuntu apt 源。                |
| `bird-package-source: "cznic"`                        | 强制使用 CZNIC apt 源。                 |
| `bird-version: "3"` + `bird-package-source: "ubuntu"` | 不支持，Ubuntu 源不提供 BIRD3，会报错。 |

本 Action 仅在 Runner 上安装 BIRD，不会将 BIRD 源代码或二进制文件纳入版本控制或重新分发。

---

## 输入参数

| 参数                          | 默认值                                            | 说明                                                                                  |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `checkout`                    | `true`                                            | 是否执行 `actions/checkout@v4`。                                                      |
| `fetch-depth`                 | `0`                                               | checkout 的 fetch 深度。保持 `0` 可支持变更文件检测和历史对比工作流。                 |
| `submodules`                  | `false`                                           | 传给 checkout 的子模块模式，可选 `false`、`true` 或 `recursive`。                     |
| `submodule-paths`             | 空                                                | 以换行符或逗号分隔的子模块路径，使用 `git submodule update --init --depth 1` 初始化。 |
| `submodule-timeout`           | `120`                                             | 每个子模块 git 操作的超时时间（秒）。                                                 |
| `node-version`                | `22`                                              | Node.js 版本。                                                                        |
| `pnpm-version`                | `10.18.3`                                         | pnpm 版本。                                                                           |
| `registry-url`                | `https://registry.npmjs.org`                      | 传给 `actions/setup-node` 的 npm 注册表地址。                                         |
| `working-directory`           | `.`                                               | 依赖安装和缓存路径解析的工作目录。                                                    |
| `install-dependencies`        | `true`                                            | 是否执行 `install-command`。纯配置仓库（使用 `pnpm dlx`）可设为 `false`。             |
| `install-command`             | `pnpm install --frozen-lockfile --prefer-offline` | 依赖安装命令。                                                                        |
| `cache-turbo`                 | `true`                                            | 是否恢复/保存 Turbo 缓存。非 Turborepo 项目设为 `false`。                             |
| `turbo-cache-path`            | `.turbo`                                          | Turbo 缓存路径（相对于 `working-directory`）。                                        |
| `install-rust`                | `false`                                           | 是否安装 Rust 工具链。                                                                |
| `rust-toolchain`              | `stable`                                          | 传给 `dtolnay/rust-toolchain` 的工具链名称。                                          |
| `rust-components`             | `rustfmt,clippy`                                  | 逗号分隔的 Rust 组件列表。                                                            |
| `rust-targets`                | `wasm32-unknown-unknown`                          | 逗号分隔的 Rust target 列表。                                                         |
| `install-bird`                | `true`                                            | 是否安装 BIRD，用于 `birdcc lint --bird` 或直接解析校验。                             |
| `bird-version`                | `2`                                               | BIRD 主版本：`2` 或 `3`。                                                             |
| `bird-package-source`         | `auto`                                            | 安装来源：`auto`、`ubuntu` 或 `cznic`。                                               |
| `harden-runner`               | `false`                                           | 是否启用 `step-security/harden-runner`。                                              |
| `harden-runner-egress-policy` | `audit`                                           | `audit` 或 `block`。                                                                  |

---

## 输出参数

| 输出参数                | 说明                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `bird-bin`              | 已安装 BIRD 二进制的路径。`install-bird: "false"` 或非 Linux Runner 时为空。                 |
| `bird-version`          | `bird --version` 的输出内容。`install-bird: "false"` 时为空。                                |
| `turbo-cache-hit`       | 来自 `actions/cache` 的 Turbo 缓存精确命中状态。                                             |
| `changed-config-files`  | 通过 `git diff` 检测到的变更 BIRD 配置文件列表（`.conf`、`.bird`、`.bird2`、`.bird3`），以换行符分隔。需要 `fetch-depth: "0"` 和 PR 上下文。 |

---

## BIRD_BIN 环境变量

`@birdcc/cli` 通过 `BIRD_BIN` 环境变量定位 BIRD 二进制文件，用于 `birdcc lint --bird` 的解析验证。解析链如下：

1. `BIRD_BIN` 环境变量（由消费工作流从 `steps.<id>.outputs.bird-bin` 获取并设置）
2. `$PATH` 中的 `bird`（`@birdcc/cli` 的兜底策略）

在 lint 步骤中通过 env 传递此输出：

```yaml
- name: 检查配置
  run: pnpm dlx @birdcc/cli@latest birdcc lint bird.conf --bird
  env:
    BIRD_BIN: ${{ steps.setup.outputs.bird-bin }}
```

在非 Linux Runner 上，`bird-bin` 输出为空，`@birdcc/cli` 会优雅地跳过 BIRD 解析验证。

---

## 实际使用场景

**通过子模块管理的配置仓库：** 使用 `submodule-paths` 只初始化必要的子模块，避免完整 recursive checkout：

```yaml
- uses: bird-chinese-community/setup-birdcc@v1
  with:
    install-dependencies: "false"
    cache-turbo: "false"
    submodule-paths: |
      vendor/route-server-configs
      vendor/lab-bird-configs
```

**同时验证 BIRD2 和 BIRD3 兼容性：** 使用矩阵策略对两个版本并行测试：

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

**仅校验 PR 中变更的配置文件：** 结合 `fetch-depth: "0"` 和 `git diff`，只对本次 PR 修改的 `.conf`/`.bird` 文件运行检查：

```yaml
- name: 配置 BIRD 工具链
  id: setup
  uses: bird-chinese-community/setup-birdcc@v1
  with:
    fetch-depth: "0"
    install-dependencies: "false"
    cache-turbo: "false"

- name: 检查变更的配置文件
  shell: bash
  run: |
    mapfile -t files < <(
      git diff --name-only "${{ github.event.pull_request.base.sha }}" "$GITHUB_SHA" -- \
        "*.bird" "*.conf" "configs/**" "conf/**" | sort -u
    )
    [ "${#files[@]}" -eq 0 ] && echo "无变更的配置文件" && exit 0
    for file in "${files[@]}"; do
      pnpm dlx @birdcc/cli@latest birdcc lint "$file" --bird
    done
  env:
    BIRD_BIN: ${{ steps.setup.outputs.bird-bin }}
```

完整示例请参阅 [examples/](./examples/)。

---

## 许可证说明

`setup-birdcc` 基于 **MIT 许可证** 发布。BIRD 和 `@birdcc/cli` 各自拥有独立的许可证。本 Action 仅在 Runner 上安装并调用外部工具，不嵌入其源代码或二进制文件。
