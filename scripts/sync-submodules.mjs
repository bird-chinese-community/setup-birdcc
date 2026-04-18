#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parsePathList, validateConfig } from "./validate-inputs.mjs";

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
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

export const syncSubmodules = (rawPaths) => {
  const paths = parsePathList(rawPaths);
  const { submodulePaths } = validateConfig({ submodulePaths: paths.join("\n") });

  if (submodulePaths.length === 0) {
    console.log("No submodule paths configured");
    return;
  }

  for (const [command, args] of buildSubmoduleCommands(submodulePaths)) {
    run(command, args);
  }
};

const main = () => {
  try {
    syncSubmodules(process.env.INPUT_SUBMODULE_PATHS ?? "");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error::${message}`);
    process.exitCode = 1;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
