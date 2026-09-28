// Tests for scripts/third_party_licenses.mjs (plan 74, lane 1, fix 2).
// Run with:  node --test scripts/third_party_licenses.test.mjs
// `npm run test:py` runs this file too, through tests/test_third_party_licenses.py, because
// vitest only collects src/**/*.test.{ts,tsx} and a script under scripts/ cannot live there.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  packageRootsFromSources,
  iconSetsFromSources,
  licenceIdOf,
  repositoryUrlOf,
  checkEntry,
  renderLicences,
  bundleUsesCommonjsHelper,
  main,
} from "./third_party_licenses.mjs";

const MIT_TEXT = "MIT License\n\nCopyright (c) someone\n";

function entry(over = {}) {
  return {
    name: "tiny-pkg",
    version: "1.2.3",
    licence: "MIT",
    repository: "https://github.com/someone/tiny-pkg",
    licenceTexts: [{ file: "LICENSE", text: MIT_TEXT }],
    ...over,
  };
}

test("packages are read from the map's source paths", () => {
  const dist = "/repo/dist";
  const sources = [
    "../src/index.tsx",
    "\u0000commonjsHelpers.js",
    "../node_modules/.pnpm/unified@11.0.5/node_modules/unified/lib/index.js",
    "../node_modules/.pnpm/unified@11.0.5/node_modules/unified/lib/callable.js",
    "../node_modules/.pnpm/@decky+api@1.1.3/node_modules/@decky/api/dist/index.js",
    "../node_modules/outer/node_modules/inner/index.js",
    "../../../../elsewhere/node_modules/.pnpm/bail@2.0.2/node_modules/bail/index.js",
  ];
  const roots = packageRootsFromSources(sources, dist);
  assert.deepEqual(
    roots.map((r) => r.name),
    ["@decky/api", "bail", "inner", "unified"],
  );
  const decky = roots.find((r) => r.name === "@decky/api");
  assert.equal(decky.dir, "/repo/node_modules/.pnpm/@decky+api@1.1.3/node_modules/@decky/api");
  assert.equal(roots.find((r) => r.name === "inner").dir, "/repo/node_modules/outer/node_modules/inner");
});

test("two versions of one package are both listed", () => {
  const roots = packageRootsFromSources(
    [
      "../node_modules/.pnpm/a@1.0.0/node_modules/a/i.js",
      "../node_modules/.pnpm/a@2.0.0/node_modules/a/i.js",
    ],
    "/r/dist",
  );
  assert.equal(roots.length, 2);
});

test("icon sets are read from react-icons source paths", () => {
  const sets = iconSetsFromSources([
    "../node_modules/react-icons/lib/iconBase.mjs",
    "../node_modules/react-icons/fi/index.mjs",
    "../node_modules/react-icons/fa6/index.mjs",
    "../src/x.ts",
  ]);
  assert.deepEqual(sets, ["fa6", "fi"]);
});

test("licence id and repository link are read from package.json shapes", () => {
  assert.equal(licenceIdOf({ license: "MIT" }), "MIT");
  assert.equal(licenceIdOf({ license: { type: "ISC" } }), "ISC");
  assert.equal(licenceIdOf({ licenses: [{ type: "BSD-3-Clause" }] }), "BSD-3-Clause");
  assert.equal(licenceIdOf({}), "");
  assert.equal(
    repositoryUrlOf({ repository: "git+https://github.com/SteamDeckHomebrew/loader-api.git" }),
    "https://github.com/SteamDeckHomebrew/loader-api",
  );
  assert.equal(repositoryUrlOf({ repository: "wooorm/bail" }), "https://github.com/wooorm/bail");
  assert.equal(
    repositoryUrlOf({ repository: { url: "git+ssh://git@github.com:react-icons/react-icons.git" } }),
    "https://github.com/react-icons/react-icons",
  );
  assert.equal(repositoryUrlOf({}), "");
});

test("allowed licences pass", () => {
  for (const id of ["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD", "(MIT OR GPL-3.0)"]) {
    assert.deepEqual(checkEntry(entry({ licence: id })), [], id);
  }
});

test("a licence outside the allowlist fails", () => {
  assert.equal(checkEntry(entry({ licence: "GPL-3.0" })).length, 1);
  assert.equal(checkEntry(entry({ licence: "MIT AND CC-BY-4.0" })).length, 1);
  assert.equal(checkEntry(entry({ licence: "" })).length, 1);
});

test("LGPL-2.1 is allowed only for @decky/api", () => {
  assert.equal(checkEntry(entry({ licence: "LGPL-2.1" })).length, 1);
  assert.deepEqual(checkEntry(entry({ name: "@decky/api", licence: "LGPL-2.1" })), []);
});

test("a package with no licence file fails", () => {
  const problems = checkEntry(entry({ licenceTexts: [] }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /no licence file/);
});

test("react-icons may only bring in icon sets on the list", () => {
  assert.deepEqual(checkEntry(entry({ name: "react-icons", iconSets: ["fi"] })), []);
  const problems = checkEntry(entry({ name: "react-icons", iconSets: ["fi", "fa"] }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /fa/);
});

test("the licences file names every package, its version, licence and text", () => {
  const text = renderLicences([
    entry(),
    entry({
      name: "@decky/api",
      version: "1.1.3",
      licence: "LGPL-2.1",
      repository: "https://github.com/SteamDeckHomebrew/loader-api",
      licenceTexts: [{ file: "LICENSE", text: "GNU LESSER GENERAL PUBLIC LICENSE\nVersion 2.1\n" }],
    }),
  ]);
  assert.match(text, /tiny-pkg 1\.2\.3/);
  assert.match(text, /Licence: MIT/);
  assert.match(text, /Copyright \(c\) someone/);
  assert.match(text, /@decky\/api 1\.1\.3/);
  assert.match(text, /GNU LESSER GENERAL PUBLIC LICENSE/);
  assert.match(text, /version 1\.1\.3.*https:\/\/github\.com\/SteamDeckHomebrew\/loader-api/s);
  // Sorted by name, so the file is stable between builds.
  assert.ok(text.indexOf("@decky/api 1.1.3") < text.indexOf("tiny-pkg 1.2.3"));
});

test("rollup's commonjs helper is spotted in the bundle text", () => {
  assert.equal(bundleUsesCommonjsHelper("function getDefaultExportFromCjs (x) {}"), true);
  assert.equal(bundleUsesCommonjsHelper("var commonjsGlobal = globalThis;"), true);
  assert.equal(bundleUsesCommonjsHelper("const a = 1;"), false);
});

function fakeRepo(pkgs) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-"));
  const dist = path.join(root, "dist");
  fs.mkdirSync(dist);
  const sources = ["../src/index.tsx"];
  for (const p of pkgs) {
    const dir = path.join(root, "node_modules", p.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: p.name, version: p.version ?? "1.0.0", license: p.license, repository: "o/r" }),
    );
    if (p.licenceFile !== false) fs.writeFileSync(path.join(dir, "LICENSE"), `${p.license} text for ${p.name}\n`);
    sources.push(`../node_modules/${p.name}/index.js`);
  }
  fs.writeFileSync(path.join(dist, "index.js"), "const a = 1;\n");
  fs.writeFileSync(path.join(dist, "index.js.map"), JSON.stringify({ version: 3, sources }));
  return { root, dist };
}

test("main writes the licences file into dist/ for a clean bundle", () => {
  const { dist } = fakeRepo([
    { name: "alpha", license: "MIT" },
    { name: "@scope/beta", license: "ISC" },
  ]);
  const errors = [];
  const code = main({ distDir: dist, log: () => {}, error: (m) => errors.push(m) });
  assert.equal(code, 0, errors.join("\n"));
  const text = fs.readFileSync(path.join(dist, "THIRD-PARTY-LICENSES.txt"), "utf8");
  assert.match(text, /alpha 1\.0\.0/);
  assert.match(text, /@scope\/beta 1\.0\.0/);
  assert.match(text, /ISC text for @scope\/beta/);
});

test("main fails the build and writes nothing for a disallowed or unlicensed package", () => {
  for (const bad of [{ name: "gamma", license: "GPL-3.0" }, { name: "delta", license: "MIT", licenceFile: false }]) {
    const { dist } = fakeRepo([{ name: "alpha", license: "MIT" }, bad]);
    const errors = [];
    const code = main({ distDir: dist, log: () => {}, error: (m) => errors.push(m) });
    assert.equal(code, 1, bad.name);
    assert.match(errors.join("\n"), new RegExp(bad.name));
    assert.equal(fs.existsSync(path.join(dist, "THIRD-PARTY-LICENSES.txt")), false);
  }
});

test("main fails when there is no source map to read", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-"));
  const errors = [];
  assert.equal(main({ distDir: root, log: () => {}, error: (m) => errors.push(m) }), 1);
});
