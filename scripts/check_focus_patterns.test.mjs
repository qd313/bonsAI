// Tests for scripts/check-focus-patterns.mjs, rule "move-props-on-button" (plan 93, lane B10).
// Run with:  node --test scripts/check_focus_patterns.test.mjs
// `npm run test:py` runs this file too, through tests/test_check_focus_patterns.py, because
// vitest only collects src/**/*.test.{ts,tsx} and a script under scripts/ cannot live there.
//
// Each case writes a one-file tree to a scratch folder and runs the real checker on it
// (FOCUS_PATTERNS_ROOT points the checker at that folder), against an empty baseline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "check-focus-patterns.mjs");

function run(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "focuspat-"));
  fs.mkdirSync(path.join(root, "src"));
  fs.mkdirSync(path.join(root, "scripts"));
  fs.writeFileSync(path.join(root, "src", "Row.tsx"), source);
  fs.writeFileSync(path.join(root, "scripts", "focus-baseline.json"), JSON.stringify({ total: 0, counts: {} }));
  const out = spawnSync("node", [SCRIPT], { env: { ...process.env, FOCUS_PATTERNS_ROOT: root }, encoding: "utf8" });
  fs.rmSync(root, { recursive: true, force: true });
  return { code: out.status, text: out.stdout + out.stderr };
}

test("a move handler written as an attribute on a Decky Button is caught (the old rule)", () => {
  const r = run(`export const A = () => <Button onMoveDown={() => true}>x</Button>;`);
  assert.equal(r.code, 1);
  assert.match(r.text, /onMoveDown on <Button>/);
});

test("move handlers spread onto a Decky Button inside an object are caught", () => {
  const r = run(
    `export const A = () => (
      <Button {...({ onMoveUp: () => true, onMoveDown: () => true } as unknown as Record<string, unknown>)}>x</Button>
    );`,
  );
  assert.equal(r.code, 1);
  assert.match(r.text, /onMoveUp spread on <Button>/);
});

test("move handlers spread from a named object in the same file are caught", () => {
  const r = run(
    `const nav = { onMoveLeft: () => true };
     export const A = () => <ButtonItem {...nav}>x</ButtonItem>;`,
  );
  assert.equal(r.code, 1);
  assert.match(r.text, /onMoveLeft spread on <ButtonItem>/);
});

test("the same spread on a Focusable, which Steam does call, is fine", () => {
  const r = run(
    `export const A = () => (
      <Focusable {...({ onMoveUp: () => true } as unknown as Record<string, unknown>)}><Button>x</Button></Focusable>
    );`,
  );
  assert.equal(r.code, 0, r.text);
});

test("a spread with no move handler in it, on a Button, is fine", () => {
  const r = run(`export const A = () => <Button {...({ "data-x": "1" } as Record<string, unknown>)}>x</Button>;`);
  assert.equal(r.code, 0, r.text);
});
