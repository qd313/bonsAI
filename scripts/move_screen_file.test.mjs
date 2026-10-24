// Tests for scripts/move_screen_file.mjs (plan 86, step 0).
// Run with:  node --test scripts/move_screen_file.test.mjs
// `npm run test:py` runs this file too, through tests/test_move_screen_file.py, because vitest only
// collects src/**/*.test.{ts,tsx} and a script under scripts/ cannot live there.
//
// Each case builds a small throwaway git repo in the system temp folder, runs the real mover on it
// (the mover's own folder supplies ts-morph), and then runs the real scripts/check_move_commit.py on the
// move commit. The repo is deleted afterwards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const MOVER = path.join(SCRIPTS, "move_screen_file.mjs");
const CHECKER = path.join(SCRIPTS, "check_move_commit.py");
const PYTHON = process.env.PYTHON ?? "python";

function run(cmd, args, cwd) {
  const out = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  return { code: out.status, out: out.stdout + out.stderr };
}
const git = (cwd, ...args) => {
  const r = run("git", args, cwd);
  assert.equal(r.code, 0, `git ${args.join(" ")} failed: ${r.out}`);
  return r.out;
};

const FILES = {
  "tsconfig.json": '{"compilerOptions":{"module":"ESNext","jsx":"react-jsx","moduleResolution":"node","strict":true},"include":["src"]}\n',
  "src/utils/helper.ts": "// The one helper every screen uses.\n// It is deliberately boring.\nexport const helper = () => 1;\nexport const other = () => 2;\nexport const third = () => 3;\n",
  "src/utils/helper.test.ts": 'import { helper } from "./helper";\ntest("a", () => expect(helper()).toBe(1));\n',
  "src/utils/helper.extra.test.ts": 'import { helper } from "./helper";\ntest("b", () => expect(helper()).toBe(1));\n',
  "src/lib/index.ts": "export const lib = 1;\n",
  "src/components/Panel.tsx": [
    "// See src/utils/helper.ts for the helper.",
    'import { helper } from "../utils/helper";',
    'import type { X } from "../utils/helper";',
    'export * from "../utils/helper";',
    'import { lib } from "../lib";',
    "export const Panel = () => <div>{helper()}{lib}</div>;",
    'export const lazy = () => import("../utils/helper");',
    'export const t = null as unknown as typeof import("../utils/helper");',
    "",
  ].join("\n"),
  "src/components/Panel.test.tsx": [
    'import { Panel } from "./Panel";',
    'import { helper } from "../utils/helper";',
    'vi.mock("../utils/helper", () => ({ helper: vi.fn() }));',
    "vi.doMock('../utils/helper', () => ({}));",
    'test("p", async () => { await vi.importActual<typeof import("../utils/helper")>("../utils/helper"); require("../utils/helper"); });',
    "",
  ].join("\n"),
  "docs/guide.md": "See [the helper](../src/utils/helper.ts) and `src/utils/helper.ts`; Panel.tsx is the screen.\n[ref]: ../src/utils/helper.ts\n",
  "docs/archive/old.md": "History: src/utils/helper.ts was here.\n",
  "docs/code-map.md": "- src/utils/helper.ts\n",
  "src/types/rpcMethods.ts": "// from src/utils/helper.ts\nexport const rpc = 1;\n",
  "tests/test_reads.py": 'from pathlib import Path\nP = Path("src/utils/helper.ts")\n',
};

function makeRepo(extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "movescreen-"));
  git(root, "init", "-q", ".");
  git(root, "config", "user.email", "t@example.com");
  git(root, "config", "user.name", "t");
  git(root, "config", "core.autocrlf", "false");
  for (const [rel, text] of Object.entries({ ...FILES, ...extra })) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  git(root, "add", "-A");
  git(root, "commit", "-qm", "start");
  return root;
}
const read = (root, rel) => fs.readFileSync(path.join(root, rel), "utf8");
const mover = (root, ...args) => run("node", [MOVER, ...args], root);
const checker = (root, rev = "HEAD") => run(PYTHON, [CHECKER, rev, "--repo", root], root);
const cleanup = (root) => fs.rmSync(root, { recursive: true, force: true });
const snapshot = (root) => git(root, "status", "--porcelain") + git(root, "rev-parse", "HEAD");

test("moves a file with its tests, fixes every kind of reference, and the checker passes", () => {
  const root = makeRepo();
  try {
    const r = mover(root, "src/utils/helper.ts", "src/features/shared/", "--with-tests");
    assert.equal(r.code, 0, r.out);

    // files moved with history (git sees renames), tests came along
    const status = git(root, "status", "--porcelain");
    assert.match(status, /R {2}src\/utils\/helper\.ts -> src\/features\/shared\/helper\.ts/);
    assert.match(status, /R {2}src\/utils\/helper\.test\.ts -> src\/features\/shared\/helper\.test\.ts/);
    assert.match(status, /R {2}src\/utils\/helper\.extra\.test\.ts -> src\/features\/shared\/helper\.extra\.test\.ts/);

    // import, export, import type, dynamic import and typeof import()
    const panel = read(root, "src/components/Panel.tsx");
    assert.equal(panel.split("../features/shared/helper").length - 1, 5);
    assert.ok(!panel.includes("../utils/helper"));
    assert.ok(panel.includes('from "../lib"'), "an unrelated import must not change");
    assert.ok(panel.includes("// See src/features/shared/helper.ts"), "a path in a comment is fixed");

    // the mock forms a test can use
    const test_ = read(root, "src/components/Panel.test.tsx");
    assert.ok(test_.includes('vi.mock("../features/shared/helper"'));
    assert.ok(test_.includes("vi.doMock('../features/shared/helper'"));
    assert.ok(test_.includes('vi.importActual<typeof import("../features/shared/helper")>("../features/shared/helper")'));
    assert.ok(test_.includes('require("../features/shared/helper")'));
    assert.ok(test_.includes('from "./Panel"'));
    // the moved tests still import their file by the same short path
    assert.ok(read(root, "src/features/shared/helper.test.ts").includes('from "./helper"'));

    // documents and a Python test that reads the file by path
    const doc = read(root, "docs/guide.md");
    assert.ok(doc.includes("](../src/features/shared/helper.ts)"));
    assert.ok(doc.includes("`src/features/shared/helper.ts`"));
    assert.ok(doc.includes("[ref]: ../src/features/shared/helper.ts"));
    assert.ok(doc.includes("Panel.tsx is the screen"), "a bare file name that did not change stays");
    assert.ok(read(root, "tests/test_reads.py").includes('Path("src/features/shared/helper.ts")'));

    // history and generated files are left alone
    assert.ok(read(root, "docs/archive/old.md").includes("src/utils/helper.ts"));
    assert.ok(read(root, "docs/code-map.md").includes("src/utils/helper.ts"));
    assert.ok(read(root, "src/types/rpcMethods.ts").includes("src/utils/helper.ts"));

    git(root, "commit", "-qm", "move helper");
    const c = checker(root);
    assert.equal(c.code, 0, c.out);

    // break it on purpose: one changed character in a moved file must fail the checker
    fs.writeFileSync(path.join(root, "src/features/shared/helper.ts"), read(root, "src/features/shared/helper.ts").replace("=> 1;", "=> 9;"));
    git(root, "commit", "-qam", "sneaky change");
    git(root, "reset", "-q", "--soft", "HEAD~2");
    git(root, "commit", "-qm", "move helper and change it");
    const bad = checker(root);
    assert.equal(bad.code, 1, bad.out);
    assert.match(bad.out, /helper\.ts/);
    assert.match(bad.out, /=> 9/);
  } finally {
    cleanup(root);
  }
});

test("a stale vi.mock path left behind in a move commit is caught by the checker (what the mover prevents)", () => {
  const root = makeRepo();
  try {
    const r = mover(root, "src/utils/helper.ts", "src/features/shared/");
    assert.equal(r.code, 0, r.out);
    // put just the mock line back to the old path, as a hand move would if it forgot it
    const file = path.join(root, "src/components/Panel.test.tsx");
    fs.writeFileSync(file, read(root, "src/components/Panel.test.tsx").replace('vi.mock("../features/shared/helper"', 'vi.mock("../utils/helper"'));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "half-fixed move");
    const c = checker(root);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /Panel\.test\.tsx/);
    assert.match(c.out, /new line 3: path "\.\.\/utils\/helper" points at no file now/);
  } finally {
    cleanup(root);
  }
});

test("a moved file keeps its imports of files that did not move, and folder imports follow the index file", () => {
  const root = makeRepo();
  try {
    const r = mover(root, "src/components/Panel.tsx", "src/features/panel/Panel.tsx", "src/lib/index.ts", "src/lib2/index.ts");
    assert.equal(r.code, 0, r.out);
    const panel = read(root, "src/features/panel/Panel.tsx");
    assert.ok(panel.includes('from "../../utils/helper"'));
    assert.ok(panel.includes('from "../../lib2"'), panel);
    assert.ok(read(root, "src/components/Panel.test.tsx").includes('from "../features/panel/Panel"'));
    git(root, "commit", "-qm", "move two files");
    const c = checker(root);
    assert.equal(c.code, 0, c.out);
  } finally {
    cleanup(root);
  }
});

test("a rename fixes the importers, the tests' names and the bare file name in documents", () => {
  const root = makeRepo();
  try {
    const r = mover(root, "src/components/Panel.tsx", "src/components/Window.tsx", "--with-tests");
    assert.equal(r.code, 0, r.out);
    assert.ok(read(root, "src/components/Window.test.tsx").includes('from "./Window"'));
    assert.ok(read(root, "docs/guide.md").includes("Window.tsx is the screen"));
    git(root, "commit", "-qm", "rename");
    const c = checker(root);
    assert.equal(c.code, 0, c.out);
  } finally {
    cleanup(root);
  }
});

test("--map moves a whole area from a two-column file", () => {
  const root = makeRepo();
  try {
    const mapFile = path.join(root, "..", `map-${path.basename(root)}.tsv`);
    fs.writeFileSync(mapFile, "# area\nsrc/utils/helper.ts\tsrc/features/a/\nsrc/lib/index.ts\tsrc/features/b/index.ts\n");
    const r = mover(root, "--map", mapFile);
    fs.rmSync(mapFile);
    assert.equal(r.code, 0, r.out);
    assert.ok(fs.existsSync(path.join(root, "src/features/a/helper.ts")));
    assert.ok(read(root, "src/components/Panel.tsx").includes('from "../features/b"'));
    git(root, "commit", "-qm", "area");
    assert.equal(checker(root).code, 0);
  } finally {
    cleanup(root);
  }
});

test("--leave keeps one document's mentions as written while code paths are still fixed", () => {
  const root = makeRepo();
  try {
    const r = mover(root, "src/utils/helper.ts", "src/features/shared/", "--leave", "docs/guide.md");
    assert.equal(r.code, 0, r.out);
    assert.ok(read(root, "docs/guide.md").includes("src/utils/helper.ts"));
    assert.ok(read(root, "src/components/Panel.tsx").includes("../features/shared/helper"));
    assert.ok(read(root, "tests/test_reads.py").includes("src/features/shared/helper.ts"));
  } finally {
    cleanup(root);
  }
});

test("--dry-run prints the edits and changes nothing", () => {
  const root = makeRepo();
  try {
    const before = snapshot(root);
    const r = mover(root, "src/utils/helper.ts", "src/features/shared/", "--dry-run");
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /MOVE\s+src\/utils\/helper\.ts\s+->\s+src\/features\/shared\/helper\.ts/);
    assert.match(r.out, /src\/components\/Panel\.test\.tsx:3/);
    assert.equal(snapshot(root), before);
    assert.ok(fs.existsSync(path.join(root, "src/utils/helper.ts")));
  } finally {
    cleanup(root);
  }
});

test("it refuses and changes nothing for: untracked source, existing target, colliding moves, dirty files, generated files", () => {
  const root = makeRepo({ "src/utils/other.ts": "export const o = 1;\n" });
  try {
    fs.writeFileSync(path.join(root, "src/utils/loose.ts"), "export {};\n"); // untracked
    const before = snapshot(root);
    const cases = [
      [["src/utils/loose.ts", "src/features/"], /not a file git tracks/],
      [["src/utils/helper.ts", "src/utils/other.ts"], /already exists/],
      [["src/utils/helper.ts", "src/x/same.ts", "src/utils/other.ts", "src/x/same.ts"], /both land on/],
      [["src/utils/helper.ts", "src/x/a.ts", "src/utils/helper.ts", "src/y/b.ts"], /two places/],
      [["src/types/rpcMethods.ts", "src/types/rpc2.ts"], /generator writes/],
    ];
    for (const [args, pattern] of cases) {
      const r = mover(root, ...args);
      assert.equal(r.code, 1, `${args.join(" ")}: ${r.out}`);
      assert.match(r.out, pattern);
      assert.equal(snapshot(root), before + "", args.join(" "));
      assert.ok(!fs.existsSync(path.join(root, "src/x")));
    }
    // a file the move would edit has uncommitted work in it
    fs.writeFileSync(path.join(root, "src/components/Panel.tsx"), read(root, "src/components/Panel.tsx") + "// mine\n");
    const dirtyBefore = snapshot(root);
    const r = mover(root, "src/utils/helper.ts", "src/features/shared/");
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /uncommitted changes/);
    assert.equal(snapshot(root), dirtyBefore);
    assert.ok(fs.existsSync(path.join(root, "src/utils/helper.ts")));
  } finally {
    cleanup(root);
  }
});
