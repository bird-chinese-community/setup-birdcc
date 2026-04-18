#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const requiredFiles = [
  "action.yml",
  "README.md",
  "DEVELOP.md",
  "LICENSE",
  "package.json",
  "pnpm-lock.yaml",
  "scripts/install-bird.mjs",
  "scripts/sync-submodules.mjs",
  "scripts/validate-inputs.mjs",
  "test/fixtures/bird.conf",
  ".github/workflows/ci.yml",
  ".github/workflows/lint-workflows.yml",
  ".github/workflows/release.yml",
  "examples/README.md",
  "examples/bird-config-lint.yml",
  "examples/bird-config-format-check.yml",
  "examples/bird-config-changed-files.yml",
  "examples/bird-config-bird2-bird3-matrix.yml",
  "examples/bird-config-submodules.yml",
  "examples/pinned-sha-config-lint.yml",
];

const forbiddenAttributionPatterns = [
  /Generated with \[Claude Code\]/u,
  /Co-Authored-By:\s*Claude/u,
  /Claude Sonnet/u,
];

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
};

export const parseReleaseTag = (tag) => {
  const match = /^(v(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*))$/u.exec(
    tag,
  );

  if (!match?.groups) {
    throw new Error("Release tag must use semver format like v1.0.0");
  }

  return {
    major: Number.parseInt(match.groups.major, 10),
    majorTag: `v${match.groups.major}`,
    tag: match[1],
    version: `${match.groups.major}.${match.groups.minor}.${match.groups.patch}`,
  };
};

export const findMissingRequiredFiles = (files = requiredFiles) =>
  files.filter((file) => !existsSync(file));

export const findForbiddenAttribution = (files = requiredFiles) => {
  const matches = [];

  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }

    const text = readFileSync(file, "utf8");
    for (const pattern of forbiddenAttributionPatterns) {
      if (pattern.test(text)) {
        matches.push(file);
        break;
      }
    }
  }

  return matches;
};

export const buildReleasePlan = ({ tag, sha }) => {
  const release = parseReleaseTag(tag);
  return {
    ...release,
    sha,
    recommendedRefs: {
      major: `bird-chinese-community/setup-birdcc@${release.majorTag}`,
      semver: `bird-chinese-community/setup-birdcc@${release.tag}`,
      sha: `bird-chinese-community/setup-birdcc@${sha}`,
    },
  };
};

export const parseArgs = (argv) => {
  const options = {
    checkClean: false,
    dryRun: false,
    json: false,
    tag: "v1.0.0",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check-clean") {
      options.checkClean = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--") {
      continue;
    } else if (arg === "--tag") {
      options.tag = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
};

const assertCleanGit = () => {
  const status = run("git", ["status", "--porcelain"], { capture: true });
  if (status) {
    throw new Error("Working tree is not clean. Commit or stash changes before publishing.");
  }
};

const main = () => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const missingFiles = findMissingRequiredFiles();
    if (missingFiles.length > 0) {
      throw new Error(`Missing release files: ${missingFiles.join(", ")}`);
    }

    const forbiddenFiles = findForbiddenAttribution();
    if (forbiddenFiles.length > 0) {
      throw new Error(`Forbidden attribution found in: ${forbiddenFiles.join(", ")}`);
    }

    if (options.checkClean) {
      assertCleanGit();
    }

    const sha = run("git", ["rev-parse", "HEAD"], { capture: true });
    const plan = buildReleasePlan({ tag: options.tag, sha });

    if (process.env.GITHUB_OUTPUT) {
      const output = [
        `tag=${plan.tag}`,
        `major-tag=${plan.majorTag}`,
        `version=${plan.version}`,
        `sha=${plan.sha}`,
      ].join("\n");
      appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`, "utf8");
    }

    if (options.json) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    console.log(`Release dry-run ${options.dryRun ? "OK" : "plan OK"} for ${plan.tag}`);
    console.log(`Major tag: ${plan.majorTag}`);
    console.log(`Pinned SHA ref: ${plan.recommendedRefs.sha}`);
    console.log(`Semver ref: ${plan.recommendedRefs.semver}`);
    console.log(`Major ref: ${plan.recommendedRefs.major}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error::${message}`);
    process.exitCode = 1;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
