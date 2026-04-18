import assert from "node:assert/strict";
import test from "node:test";

import { resolveChangedFiles } from "../scripts/resolve-changed-files.mjs";

test("resolveChangedFiles returns empty array when baseSha is empty", () => {
  assert.deepEqual(resolveChangedFiles({ baseSha: "", headSha: "abc123" }), []);
});

test("resolveChangedFiles returns empty array when headSha is empty", () => {
  assert.deepEqual(resolveChangedFiles({ baseSha: "abc123", headSha: "" }), []);
});

test("resolveChangedFiles returns empty array when both shas are empty", () => {
  assert.deepEqual(resolveChangedFiles({ baseSha: "", headSha: "" }), []);
});

test("resolveChangedFiles returns empty array when baseSha is undefined", () => {
  assert.deepEqual(resolveChangedFiles({ baseSha: undefined, headSha: "abc123" }), []);
});
