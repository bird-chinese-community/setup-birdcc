import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReleasePlan,
  findMissingRequiredFiles,
  parseArgs,
  parseReleaseTag,
} from "../scripts/release-dry-run.mjs";

test("parseReleaseTag accepts semver tags and returns the major alias", () => {
  assert.deepEqual(parseReleaseTag("v1.2.3"), {
    major: 1,
    majorTag: "v1",
    tag: "v1.2.3",
    version: "1.2.3",
  });
});

test("parseReleaseTag rejects major-only and non-semver tags", () => {
  assert.throws(() => parseReleaseTag("v1"), /semver/);
  assert.throws(() => parseReleaseTag("1.0.0"), /semver/);
});

test("parseArgs accepts pnpm run argument separators", () => {
  assert.deepEqual(parseArgs(["--", "--tag", "v1.2.3", "--json"]), {
    checkClean: false,
    dryRun: false,
    json: true,
    tag: "v1.2.3",
  });
});

test("buildReleasePlan reports major, semver, and SHA refs", () => {
  const plan = buildReleasePlan({
    tag: "v1.0.0",
    sha: "0123456789abcdef0123456789abcdef01234567",
  });

  assert.equal(plan.recommendedRefs.major, "bird-chinese-community/setup-birdcc@v1");
  assert.equal(plan.recommendedRefs.semver, "bird-chinese-community/setup-birdcc@v1.0.0");
  assert.equal(
    plan.recommendedRefs.sha,
    "bird-chinese-community/setup-birdcc@0123456789abcdef0123456789abcdef01234567",
  );
});

test("findMissingRequiredFiles reports absent required files", () => {
  assert.deepEqual(findMissingRequiredFiles(["README.md", "not-here.txt"]), ["not-here.txt"]);
});

test("findMissingRequiredFiles accepts the release documentation set when files exist", () => {
  assert.deepEqual(
    findMissingRequiredFiles(["README.md", "README.zh.md", "CODE_OF_CONDUCT.md", "SECURITY.md"]),
    [],
  );
});
