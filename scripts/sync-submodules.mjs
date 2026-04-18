#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parsePathList, validateConfig } from "./validate-inputs.mjs";

const DEFAULT_TIMEOUT_MS = 120_000;

const run = (command, args, { timeoutMs } = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    timeout: timeoutMs,
  });

  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      throw new Error(
        `${command} ${args.join(" ")} timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
};

export const buildSubmoduleCommands = (paths) =>
  paths.flatMap((path) => [
    ["git", ["submodule", "sync", "--", path]],
    ["git", ["submodule", "update", "--init", "--depth", "1", "--", path]],
  ]);

export const parseTimeoutSeconds = (raw) => {
  if (!raw || raw === "") return DEFAULT_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid submodule-timeout value: ${raw}`);
  }
  return n * 1000;
};

export const syncSubmodules = (rawPaths, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const paths = parsePathList(rawPaths);
  const { submodulePaths } = validateConfig({ submodulePaths: paths.join("\n") });

  if (submodulePaths.length === 0) {
    console.log("No submodule paths configured");
    return;
  }

  for (const [command, args] of buildSubmoduleCommands(submodulePaths)) {
    run(command, args, { timeoutMs });
  }
};

const main = () => {
  try {
    const timeoutMs = parseTimeoutSeconds(process.env.INPUT_SUBMODULE_TIMEOUT);
    syncSubmodules(process.env.INPUT_SUBMODULE_PATHS ?? "", { timeoutMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error::${message}`);
    process.exitCode = 1;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
