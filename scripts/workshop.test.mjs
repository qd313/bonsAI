// Tests for scripts/lib/workshop.mjs: where the workshop folder is.
// Run with:  node --test scripts/workshop.test.mjs   (also run by tests/test_workshop_setting.py)
// Every case works in temp folders, never in the real workshop or the repo's real .env.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  workshopRoot,
  evidenceDir,
  walksDir,
  researchDir,
  readEnvFileSetting,
  WorkshopNotFoundError,
} from "./lib/workshop.mjs";

function makeBase() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "workshop-test-")));
  const repo = path.join(base, "BonsAI");
  fs.mkdirSync(repo);
  return { base, repo };
}
const mk = (...parts) => {
  const p = path.join(...parts);
  fs.mkdirSync(p, { recursive: true });
  return p;
};

test("the default is the folder next to the repo", () => {
  const { base, repo } = makeBase();
  const expected = mk(base, "bonsAI-workshop");
  assert.equal(workshopRoot({ repoRoot: repo, env: {} }), expected);
});

test("the environment variable beats the .env line and the default", () => {
  const { base, repo } = makeBase();
  mk(base, "bonsAI-workshop");
  const fromFile = mk(base, "from-file");
  const fromEnv = mk(base, "from-env");
  fs.writeFileSync(path.join(repo, ".env"), `BONSAI_WORKSHOP=${fromFile}\n`);
  assert.equal(workshopRoot({ repoRoot: repo, env: { BONSAI_WORKSHOP: fromEnv } }), fromEnv);
});

test("the .env line beats the default, and comments, export and quotes are tolerated", () => {
  const { base, repo } = makeBase();
  mk(base, "bonsAI-workshop");
  const fromFile = mk(base, "from-file");
  fs.writeFileSync(path.join(repo, ".env"), `# a comment\r\nDECK_IP=1.2.3.4\r\nexport BONSAI_WORKSHOP="${fromFile}"\r\n`);
  assert.equal(workshopRoot({ repoRoot: repo, env: {} }), fromFile);
  assert.equal(readEnvFileSetting(path.join(repo, "missing.env")), null);
});

test("a missing folder stops with one plain sentence", () => {
  const { base, repo } = makeBase();
  assert.throws(
    () => workshopRoot({ repoRoot: repo, env: {} }),
    (err) => {
      assert.ok(err instanceof WorkshopNotFoundError);
      assert.ok(err.message.includes("the workshop repo was not found at"));
      assert.ok(err.message.includes(path.join(base, "bonsAI-workshop")));
      assert.ok(err.message.includes("clone qd313/bonsAI-workshop next to this repo, or set BONSAI_WORKSHOP in .env"));
      assert.ok(!err.message.includes("\n"));
      return true;
    }
  );
});

test("a setting that points nowhere is an error, not a fallback to the default", () => {
  const { base, repo } = makeBase();
  mk(base, "bonsAI-workshop");
  const missing = path.join(base, "nowhere");
  assert.throws(() => workshopRoot({ repoRoot: repo, env: { BONSAI_WORKSHOP: missing } }), /nowhere/);
});

test("a relative setting is refused", () => {
  const { repo } = makeBase();
  assert.throws(() => workshopRoot({ repoRoot: repo, env: { BONSAI_WORKSHOP: "bonsAI-workshop" } }), /absolute folder path/);
});

test("a working copy finds the workshop and the .env of the main checkout", () => {
  const { base, repo } = makeBase();
  const copy = mk(repo, ".claude", "worktrees", "some-lane");
  const expected = mk(base, "bonsAI-workshop");
  assert.equal(workshopRoot({ repoRoot: copy, env: {} }), expected);
  const elsewhere = mk(base, "elsewhere");
  fs.writeFileSync(path.join(repo, ".env"), `BONSAI_WORKSHOP=${elsewhere}\n`);
  assert.equal(workshopRoot({ repoRoot: copy, env: {} }), elsewhere);
});

test("the three folders", () => {
  const { base, repo } = makeBase();
  const root = mk(base, "bonsAI-workshop");
  const options = { repoRoot: repo, env: {} };
  assert.equal(evidenceDir(options), path.join(root, "test-evidence"));
  assert.equal(walksDir(options), path.join(root, "checks"));
  assert.equal(researchDir(options), path.join(root, "archive", "research"));
});
