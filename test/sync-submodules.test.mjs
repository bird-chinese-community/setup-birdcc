import assert from "node:assert/strict";
import test from "node:test";

import { buildSubmoduleCommands } from "../scripts/sync-submodules.mjs";

test("buildSubmoduleCommands creates sync and update commands per path", () => {
  assert.deepEqual(buildSubmoduleCommands(["refer/BIRD-source-code"]), [
    ["git", ["submodule", "sync", "--", "refer/BIRD-source-code"]],
    [
      "git",
      [
        "submodule",
        "update",
        "--init",
        "--depth",
        "1",
        "--",
        "refer/BIRD-source-code",
      ],
    ],
  ]);
});
