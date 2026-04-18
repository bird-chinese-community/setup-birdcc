#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cznicKeyringPath = "/usr/share/keyrings/cznic-labs-pkg.gpg";
const birdBinaryCandidates = ["/usr/sbin/bird", "/usr/local/sbin/bird"];

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
    const stderr = result.stderr ? `\n${result.stderr.trim()}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${stderr}`);
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
};

const sudo = (args, options) => run("sudo", args, options);

export const resolveInstallPlan = ({
  birdVersion = "2",
  birdPackageSource = "auto",
  codename,
}) => {
  const resolvedSource =
    birdPackageSource === "auto"
      ? birdVersion === "3"
        ? "cznic"
        : "ubuntu"
      : birdPackageSource;

  if (birdVersion === "3" && resolvedSource === "ubuntu") {
    throw new Error(
      "BIRD3 is not available from the Ubuntu package source. Use bird-package-source: auto or cznic.",
    );
  }

  const packageName = birdVersion === "3" ? "bird3" : "bird2";
  const repository =
    resolvedSource === "cznic"
      ? `deb [signed-by=${cznicKeyringPath}] https://pkg.labs.nic.cz/bird${birdVersion} ${codename} main`
      : undefined;

  return {
    birdVersion,
    packageName,
    repository,
    resolvedSource,
  };
};

const getUbuntuCodename = () => {
  const codename = run("lsb_release", ["-sc"], { capture: true });
  if (!codename) {
    throw new Error("Unable to detect Ubuntu codename with lsb_release -sc");
  }
  return codename;
};

const installCznicRepository = (repository) => {
  sudo(["apt-get", "update"]);
  sudo([
    "apt-get",
    "install",
    "-y",
    "apt-transport-https",
    "ca-certificates",
    "curl",
    "lsb-release",
  ]);
  sudo(["install", "-d", "-m", "0755", "/usr/share/keyrings"]);

  const tempDir = mkdtempSync(join(tmpdir(), "setup-birdcc-"));
  const tempKeyPath = join(tempDir, "cznic-labs-pkg.gpg");
  const tempListPath = join(tempDir, "cznic-labs-bird.list");

  run("curl", ["-fsSL", "https://pkg.labs.nic.cz/gpg", "-o", tempKeyPath]);
  writeFileSync(tempListPath, `${repository}\n`, "utf8");

  sudo(["mv", tempKeyPath, cznicKeyringPath]);
  sudo(["mv", tempListPath, "/etc/apt/sources.list.d/cznic-labs-bird.list"]);
};

const installPackage = (plan) => {
  if (plan.resolvedSource === "cznic") {
    installCznicRepository(plan.repository);
  }

  sudo(["apt-get", "update"]);
  sudo(["apt-get", "install", "-y", plan.packageName]);
};

const commandExists = (command) => {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
  });
  return result.status === 0;
};

const findBirdBinary = () => {
  for (const candidate of birdBinaryCandidates) {
    if (commandExists(candidate)) {
      return candidate;
    }
  }

  const fromPath = spawnSync("sh", ["-c", "command -v bird"], {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
  });

  if (fromPath.status === 0 && fromPath.stdout.trim()) {
    return fromPath.stdout.trim();
  }

  throw new Error("BIRD binary was installed but no bird executable was found");
};

const writeGithubOutput = ({ birdBin, birdVersion }) => {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `bird-bin=${birdBin}\nbird-version=${birdVersion.replace(/\n/gu, " ")}\n`,
      "utf8",
    );
  }

  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `BIRD_BIN=${birdBin}\n`, "utf8");
  }
};

const installBird = () => {
  const dryRun = process.env.SETUP_BIRDCC_DRY_RUN === "true";

  if (!dryRun && process.platform !== "linux") {
    throw new Error("setup-birdcc can install BIRD only on Linux runners");
  }

  const codename = dryRun
    ? (process.env.SETUP_BIRDCC_UBUNTU_CODENAME ?? "noble")
    : getUbuntuCodename();
  const plan = resolveInstallPlan({
    birdVersion: process.env.INPUT_BIRD_VERSION ?? "2",
    birdPackageSource: process.env.INPUT_BIRD_PACKAGE_SOURCE ?? "auto",
    codename,
  });

  if (dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  installPackage(plan);

  const birdBin = findBirdBinary();
  const birdVersion = run(birdBin, ["--version"], { capture: true });
  console.log(`BIRD binary: ${birdBin}`);
  console.log(`BIRD version: ${birdVersion}`);
  writeGithubOutput({ birdBin, birdVersion });
};

const main = () => {
  try {
    installBird();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error::${message}`);
    process.exitCode = 1;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
