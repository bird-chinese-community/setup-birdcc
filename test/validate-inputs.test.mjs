import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePathList,
  validateConfig,
} from "../scripts/validate-inputs.mjs";

test("parsePathList accepts newline and comma separated paths", () => {
  assert.deepEqual(
    parsePathList(
      "vendor/route-server-configs, vendor/lab-bird-configs\nconfigs/shared",
    ),
    ["vendor/route-server-configs", "vendor/lab-bird-configs", "configs/shared"],
  );
});

test("parsePathList ignores blank comma and newline entries", () => {
  assert.deepEqual(parsePathList("\n configs/prod , , configs/lab \n"), [
    "configs/prod",
    "configs/lab",
  ]);
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

test("validateConfig rejects invalid booleans and unsafe directories", () => {
  assert.throws(
    () =>
      validateConfig({
        installDependencies: "yes",
      }),
    /install-dependencies/,
  );

  assert.throws(
    () =>
      validateConfig({
        workingDirectory: "/tmp/configs",
      }),
    /working-directory/,
  );

  assert.throws(
    () =>
      validateConfig({
        turboCachePath: "-cache",
      }),
    /turbo-cache-path/,
  );
});

test("validateConfig rejects non-integer fetch depth and multiline shell inputs", () => {
  assert.throws(
    () =>
      validateConfig({
        fetchDepth: "-1",
      }),
    /fetch-depth/,
  );

  assert.throws(
    () =>
      validateConfig({
        installCommand: "pnpm install\npnpm test",
      }),
    /install-command/,
  );
});
