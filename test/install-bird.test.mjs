import assert from "node:assert/strict";
import test from "node:test";

import { resolveInstallPlan, resolveUbuntuCodename } from "../scripts/install-bird.mjs";

test("resolveUbuntuCodename reads the standard version codename", () => {
  assert.equal(
    resolveUbuntuCodename('NAME="Ubuntu"\nVERSION_CODENAME=noble\nUBUNTU_CODENAME=noble\n'),
    "noble",
  );
});

test("resolveUbuntuCodename falls back to the Ubuntu-specific codename", () => {
  assert.equal(resolveUbuntuCodename("NAME=Ubuntu\nUBUNTU_CODENAME='jammy'\n"), "jammy");
});

test("resolveUbuntuCodename rejects release metadata without a codename", () => {
  assert.throws(
    () => resolveUbuntuCodename('NAME="Ubuntu"\nVERSION_ID="24.04"\n'),
    /Unable to detect Ubuntu codename from \/etc\/os-release/,
  );
});

test("resolveInstallPlan uses Ubuntu apt for default BIRD2 installs", () => {
  const plan = resolveInstallPlan({
    birdVersion: "2",
    birdPackageSource: "auto",
    codename: "noble",
  });

  assert.equal(plan.packageName, "bird2");
  assert.equal(plan.resolvedSource, "ubuntu");
  assert.equal(plan.repository, undefined);
});

test("resolveInstallPlan uses CZNIC repository for BIRD3 auto installs", () => {
  const plan = resolveInstallPlan({
    birdVersion: "3",
    birdPackageSource: "auto",
    codename: "noble",
  });

  assert.equal(plan.packageName, "bird3");
  assert.equal(plan.resolvedSource, "cznic");
  assert.match(plan.repository, /https:\/\/pkg\.labs\.nic\.cz\/bird3 noble main/);
});

test("resolveInstallPlan can force the CZNIC repository for BIRD2", () => {
  const plan = resolveInstallPlan({
    birdVersion: "2",
    birdPackageSource: "cznic",
    codename: "noble",
  });

  assert.equal(plan.packageName, "bird2");
  assert.equal(plan.resolvedSource, "cznic");
  assert.match(plan.repository, /https:\/\/pkg\.labs\.nic\.cz\/bird2 noble main/);
});

test("resolveInstallPlan rejects Ubuntu source for BIRD3", () => {
  assert.throws(
    () =>
      resolveInstallPlan({
        birdVersion: "3",
        birdPackageSource: "ubuntu",
        codename: "noble",
      }),
    /BIRD3 is not available from the Ubuntu package source/,
  );
});
