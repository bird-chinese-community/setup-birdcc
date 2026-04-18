#!/usr/bin/env node
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const booleanValues = new Set(["true", "false"]);
const submoduleModes = new Set(["false", "true", "recursive"]);
const birdVersions = new Set(["2", "3"]);
const birdPackageSources = new Set(["auto", "ubuntu", "cznic"]);
const hardenRunnerEgressPolicies = new Set(["audit", "block"]);

const githubError = (message) => `::error::${message}`;

export const parsePathList = (rawValue = "") =>
  rawValue
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean);

const requireEnum = (name, value, allowedValues) => {
  if (!allowedValues.has(value)) {
    throw new Error(
      `${name} must be one of: ${Array.from(allowedValues).join(", ")}`,
    );
  }
  return value;
};

const requireBoolean = (name, value = "false") =>
  requireEnum(name, value, booleanValues);

const rejectControlChars = (name, value) => {
  if (/[\0\r\n]/u.test(value)) {
    throw new Error(`${name} must not contain control characters`);
  }
};

const validateRelativePath = (name, value) => {
  rejectControlChars(name, value);
  if (!value || value.startsWith("-")) {
    throw new Error(`${name} contains an unsafe path: ${value}`);
  }
  if (isAbsolute(value)) {
    throw new Error(`${name} must use relative paths: ${value}`);
  }
  if (value.split(/[\\/]/u).includes("..")) {
    throw new Error(`${name} must not include '..' path segments: ${value}`);
  }
  return value;
};

const validateWorkingDirectory = (value = ".") => {
  rejectControlChars("working-directory", value);
  if (!value || value.startsWith("-")) {
    throw new Error("working-directory must be a non-empty relative path");
  }
  if (isAbsolute(value)) {
    throw new Error("working-directory must be relative to the workspace");
  }
  return value;
};

const validateFetchDepth = (value = "0") => {
  if (!/^\d+$/u.test(value)) {
    throw new Error("fetch-depth must be a non-negative integer");
  }
  return value;
};

const validateNonEmpty = (name, value) => {
  rejectControlChars(name, value);
  if (!value || value.trim() === "") {
    throw new Error(`${name} must not be empty`);
  }
  return value;
};

export const validateConfig = (input = {}) => {
  const submodulePaths = parsePathList(input.submodulePaths ?? "").map((path) =>
    validateRelativePath("submodule-paths", path),
  );

  return {
    checkout: requireBoolean("checkout", input.checkout ?? "true"),
    fetchDepth: validateFetchDepth(input.fetchDepth ?? "0"),
    submodules: requireEnum(
      "submodules",
      input.submodules ?? "false",
      submoduleModes,
    ),
    submodulePaths,
    nodeVersion: validateNonEmpty("node-version", input.nodeVersion ?? "22"),
    pnpmVersion: validateNonEmpty(
      "pnpm-version",
      input.pnpmVersion ?? "10.18.3",
    ),
    registryUrl: validateNonEmpty(
      "registry-url",
      input.registryUrl ?? "https://registry.npmjs.org",
    ),
    workingDirectory: validateWorkingDirectory(input.workingDirectory ?? "."),
    installDependencies: requireBoolean(
      "install-dependencies",
      input.installDependencies ?? "true",
    ),
    installCommand: validateNonEmpty(
      "install-command",
      input.installCommand ?? "pnpm install --frozen-lockfile --prefer-offline",
    ),
    cacheTurbo: requireBoolean("cache-turbo", input.cacheTurbo ?? "true"),
    turboCachePath: validateRelativePath(
      "turbo-cache-path",
      input.turboCachePath ?? ".turbo",
    ),
    installRust: requireBoolean(
      "install-rust",
      input.installRust ?? "false",
    ),
    rustToolchain: validateNonEmpty(
      "rust-toolchain",
      input.rustToolchain ?? "stable",
    ),
    rustComponents: input.rustComponents ?? "rustfmt,clippy",
    rustTargets: input.rustTargets ?? "wasm32-unknown-unknown",
    installBird: requireBoolean("install-bird", input.installBird ?? "true"),
    birdVersion: requireEnum(
      "bird-version",
      input.birdVersion ?? "2",
      birdVersions,
    ),
    birdPackageSource: requireEnum(
      "bird-package-source",
      input.birdPackageSource ?? "auto",
      birdPackageSources,
    ),
    hardenRunner: requireBoolean(
      "harden-runner",
      input.hardenRunner ?? "false",
    ),
    hardenRunnerEgressPolicy: requireEnum(
      "harden-runner-egress-policy",
      input.hardenRunnerEgressPolicy ?? "audit",
      hardenRunnerEgressPolicies,
    ),
  };
};

const configFromEnv = (env) => ({
  checkout: env.INPUT_CHECKOUT,
  fetchDepth: env.INPUT_FETCH_DEPTH,
  submodules: env.INPUT_SUBMODULES,
  submodulePaths: env.INPUT_SUBMODULE_PATHS,
  nodeVersion: env.INPUT_NODE_VERSION,
  pnpmVersion: env.INPUT_PNPM_VERSION,
  registryUrl: env.INPUT_REGISTRY_URL,
  workingDirectory: env.INPUT_WORKING_DIRECTORY,
  installDependencies: env.INPUT_INSTALL_DEPENDENCIES,
  installCommand: env.INPUT_INSTALL_COMMAND,
  cacheTurbo: env.INPUT_CACHE_TURBO,
  turboCachePath: env.INPUT_TURBO_CACHE_PATH,
  installRust: env.INPUT_INSTALL_RUST,
  rustToolchain: env.INPUT_RUST_TOOLCHAIN,
  rustComponents: env.INPUT_RUST_COMPONENTS,
  rustTargets: env.INPUT_RUST_TARGETS,
  installBird: env.INPUT_INSTALL_BIRD,
  birdVersion: env.INPUT_BIRD_VERSION,
  birdPackageSource: env.INPUT_BIRD_PACKAGE_SOURCE,
  hardenRunner: env.INPUT_HARDEN_RUNNER,
  hardenRunnerEgressPolicy: env.INPUT_HARDEN_RUNNER_EGRESS_POLICY,
});

const main = () => {
  try {
    const config = validateConfig(configFromEnv(process.env));
    console.log("setup-birdcc inputs are valid");
    console.log(JSON.stringify(config, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(githubError(message));
    process.exitCode = 1;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
