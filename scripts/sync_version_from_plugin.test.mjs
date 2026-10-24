// Tests for scripts/sync-version-from-plugin.mjs (plan 79, helper AD).
// Run with:  node --test scripts/sync_version_from_plugin.test.mjs
// `npm run test:py` runs this file too, through tests/test_sync_version_from_plugin.py.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { writeIfChanged } from "./sync-version-from-plugin.mjs";

function tmpFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "syncver-"));
  const file = path.join(dir, "pluginVersion.ts");
  if (content !== null) fs.writeFileSync(file, content);
  return file;
}

test("a file that differs only in line endings is left alone", () => {
  const file = tmpFile("a\r\nb\r\n");
  const before = fs.statSync(file).mtimeMs;
  assert.equal(writeIfChanged(file, "a\nb\n"), false);
  assert.equal(fs.readFileSync(file, "utf8"), "a\r\nb\r\n");
  assert.equal(fs.statSync(file).mtimeMs, before);
});

test("a real change keeps the line endings the file already has", () => {
  const crlf = tmpFile("a\r\nb\r\n");
  assert.equal(writeIfChanged(crlf, "a\nc\n"), true);
  assert.equal(fs.readFileSync(crlf, "utf8"), "a\r\nc\r\n");
  const lf = tmpFile("a\nb\n");
  assert.equal(writeIfChanged(lf, "a\nc\n"), true);
  assert.equal(fs.readFileSync(lf, "utf8"), "a\nc\n");
});

test("a missing file is created", () => {
  const file = tmpFile(null);
  assert.equal(writeIfChanged(file, "x\n"), true);
  assert.equal(fs.readFileSync(file, "utf8"), "x\n");
});
