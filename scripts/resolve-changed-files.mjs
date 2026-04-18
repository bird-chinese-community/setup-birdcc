#!/usr/bin/env node
import { appendFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const configPatterns = ["*.conf", "*.bird", "*.bird2", "*.bird3"];

const run = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr.trim()}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${stderr}`);
  }

  return result.stdout.trim();
};

export const resolveChangedFiles = ({ baseSha, headSha }) => {
  if (!baseSha || !headSha) {
    return [];
  }

  const output = run("git", ["diff", "--name-only", "--diff-filter=ACMR", baseSha, headSha]);

  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .filter((file) => configPatterns.some((pattern) => matchGlob(pattern, file)))
    .filter((file) => existsSync(file))
    .sort();
};

const matchGlob = (pattern, filePath) => {
  const fileName = filePath.split("/").pop();
  if (pattern.startsWith("*.")) {
    const ext = pattern.slice(1);
    return fileName.endsWith(ext);
  }
  return fileName === pattern;
};

const writeOutput = (files) => {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  const delimiter = `ghadelimiter_${Date.now()}`;
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `changed-config-files<<${delimiter}\n${files.join("\n")}\n${delimiter}\n`,
    "utf8",
  );
};

const main = () => {
  try {
    const baseSha = process.env.INPUT_BASE_SHA ?? "";
    const headSha = process.env.INPUT_HEAD_SHA ?? process.env.GITHUB_SHA ?? "";

    const files = resolveChangedFiles({ baseSha, headSha });

    if (files.length === 0) {
      console.log("No changed BIRD config files detected.");
    } else {
      console.log(`Changed BIRD config files (${files.length}):`);
      for (const file of files) {
        console.log(`  ${file}`);
      }
    }

    writeOutput(files);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`::warning::Could not detect changed config files: ${message}`);
    writeOutput([]);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
