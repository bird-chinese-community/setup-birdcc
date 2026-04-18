import assert from "node:assert/strict";
import test from "node:test";

import { buildSubmoduleCommands, parseTimeoutSeconds } from "../scripts/sync-submodules.mjs";

test("buildSubmoduleCommands creates sync and update commands per path", () => {
  assert.deepEqual(buildSubmoduleCommands(["refer/BIRD-source-code"]), [
    ["git", ["submodule", "sync", "--", "refer/BIRD-source-code"]],
    ["git", ["submodule", "update", "--init", "--depth", "1", "--", "refer/BIRD-source-code"]],
  ]);
});

test("buildSubmoduleCommands preserves path order for multiple config submodules", () => {
  assert.deepEqual(
    buildSubmoduleCommands(["vendor/route-server-configs", "vendor/lab-bird-configs"]),
    [
      ["git", ["submodule", "sync", "--", "vendor/route-server-configs"]],
      [
        "git",
        ["submodule", "update", "--init", "--depth", "1", "--", "vendor/route-server-configs"],
      ],
      ["git", ["submodule", "sync", "--", "vendor/lab-bird-configs"]],
      ["git", ["submodule", "update", "--init", "--depth", "1", "--", "vendor/lab-bird-configs"]],
    ],
  );
});

test("parseTimeoutSeconds returns default for empty string", () => {
  assert.equal(parseTimeoutSeconds(""), 120_000);
});

test("parseTimeoutSeconds returns default for undefined", () => {
  assert.equal(parseTimeoutSeconds(undefined), 120_000);
});

test("parseTimeoutSeconds converts seconds to milliseconds", () => {
  assert.equal(parseTimeoutSeconds("60"), 60_000);
  assert.equal(parseTimeoutSeconds("300"), 300_000);
});

test("parseTimeoutSeconds rejects invalid values", () => {
  assert.throws(() => parseTimeoutSeconds("abc"), /Invalid submodule-timeout/);
  assert.throws(() => parseTimeoutSeconds("-1"), /Invalid submodule-timeout/);
  assert.throws(() => parseTimeoutSeconds("0"), /Invalid submodule-timeout/);
});
