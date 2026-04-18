import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePathList,
  validateConfig,
} from "../scripts/validate-inputs.mjs";

test("parsePathList accepts newline and comma separated paths", () => {
  assert.deepEqual(
    parsePathList("refer/BIRD-source-code, refer/BIRD2-vim-grammar\nrefer/vscode-bird2"),
    ["refer/BIRD-source-code", "refer/BIRD2-vim-grammar", "refer/vscode-bird2"],
  );
});

test("validateConfig accepts the documented default inputs", () => {
  const config = validateConfig({
    checkout: "true",
    fetchDepth: "0",
    submodules: "false",
    submodulePaths: "",
    nodeVersion: "22",
    pnpmVersion: "10.18.3",
    registryUrl: "https://registry.npmjs.org",
    workingDirectory: ".",
    installDependencies: "true",
    installCommand: "pnpm install --frozen-lockfile --prefer-offline",
    cacheTurbo: "true",
    turboCachePath: ".turbo",
    installRust: "false",
    rustToolchain: "stable",
    rustComponents: "rustfmt,clippy",
    rustTargets: "wasm32-unknown-unknown",
    installBird: "true",
    birdVersion: "2",
    birdPackageSource: "auto",
    hardenRunner: "false",
    hardenRunnerEgressPolicy: "audit",
  });

  assert.equal(config.birdVersion, "2");
  assert.equal(config.birdPackageSource, "auto");
  assert.deepEqual(config.submodulePaths, []);
});

test("validateConfig rejects invalid enum values and unsafe submodule paths", () => {
  assert.throws(
    () =>
      validateConfig({
        birdVersion: "4",
        birdPackageSource: "auto",
      }),
    /bird-version/,
  );

  assert.throws(
    () =>
      validateConfig({
        birdVersion: "2",
        birdPackageSource: "auto",
        submodulePaths: "../outside",
      }),
    /submodule-paths/,
  );
});
