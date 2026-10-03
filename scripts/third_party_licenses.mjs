// Title: Third-party licences file for the plugin download
//
// Purpose: After rollup builds dist/index.js, read dist/index.js.map, work out which packages
//   under node_modules ended up in the bundle, and write dist/THIRD-PARTY-LICENSES.txt with
//   each one's name, version, licence and licence text.
// Used for: `npm run build` (package.json: `rollup -c && node scripts/third_party_licenses.mjs`).
//   dist/ is packed into the release zip whole, so the file travels with the download.
// Solves: the bundle carries about 51 packages (react-markdown and its family, react-icons'
//   Feather set, @ungap/structured-clone, a little of @decky/api) whose licences require their
//   notice to go with every copy, and none did. It also fails the build when a bundled package
//   has no licence file or a licence outside the allowlist, so a new dependency cannot slip in.
// Does not: Look at Python code, the voice program or the game-notes library; those are covered
//   by NOTICE, bin/README.md and the library's own ATTRIBUTIONS.md.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

export const OUTPUT_NAME = "THIRD-PARTY-LICENSES.txt";

/** Licences any bundled package may carry (SPDX ids). */
export const ALLOWED_LICENCES = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD"]);

/** Licences allowed only for one named package: @decky/api is the loader's own API (LGPL-2.1). */
export const PACKAGE_ONLY_LICENCES = new Map([
  ["@decky/api", new Set(["LGPL-2.1", "LGPL-2.1-only", "LGPL-2.1-or-later"])],
]);

/**
 * react-icons is MIT, but each icon set inside it keeps its own licence (some are CC BY 4.0 or
 * MPL-2.0). Only sets on this list may reach the bundle; add one only after reading its licence.
 */
export const ALLOWED_ICON_SETS = new Map([["fi", "Feather, MIT"]]);

const LICENCE_FILE = /^(licen[cs]e|copying)(\b|[._-]|$)/i;
const NOTICE_FILE = /^notice(\b|[._-]|$)/i;
const COMMONJS_PACKAGE = "@rollup/plugin-commonjs";

const toPosix = (p) => p.split("\\").join("/");

/**
 * @decky/rollup rewrites a leading `../` in each source to `decky://decky/plugin/<name>/`, so
 * such a path is relative to the repo root (the dist folder's parent). The rewrite only fires
 * where rollup hands it forward slashes: Linux and macOS builds get the URL form, Windows
 * builds keep plain `../` paths.
 */
const DECKY_SOURCE_PREFIX = /^decky:\/\/decky\/plugin\/[^/]+\//;

/**
 * Turn source-map paths into the package folders they came from, one per folder, sorted by
 * name. A path's package is the segment(s) after its LAST `node_modules/`, which handles pnpm's
 * `.pnpm/<id>/node_modules/<name>` layout and nested installs alike.
 */
export function packageRootsFromSources(sources, mapDir) {
  const base = toPosix(mapDir);
  const repoRoot = path.posix.dirname(base);
  const byDir = new Map();
  for (const raw of sources) {
    if (typeof raw !== "string" || raw.includes("\u0000")) continue;
    const src = toPosix(raw);
    const abs = DECKY_SOURCE_PREFIX.test(src)
      ? path.posix.normalize(path.posix.join(repoRoot, src.replace(DECKY_SOURCE_PREFIX, "")))
      : path.posix.normalize(path.posix.join(base, src));
    const marker = "/node_modules/";
    const i = abs.lastIndexOf(marker);
    if (i < 0) continue;
    const parts = abs.slice(i + marker.length).split("/");
    const name = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
    if (!name || name === ".pnpm") continue;
    const dir = abs.slice(0, i + marker.length) + name;
    byDir.set(dir, { name, dir });
  }
  return [...byDir.values()].sort((a, b) => a.name.localeCompare(b.name) || a.dir.localeCompare(b.dir));
}

/** Icon-set folders of react-icons that appear in the map (`lib` is its shared code). */
export function iconSetsFromSources(sources) {
  const sets = new Set();
  for (const raw of sources) {
    const m = /\/node_modules\/react-icons\/([^/]+)\//.exec(toPosix(String(raw)));
    if (m && m[1] !== "lib") sets.add(m[1]);
  }
  return [...sets].sort();
}

export function licenceIdOf(pkg) {
  const l = pkg.license ?? (Array.isArray(pkg.licenses) ? pkg.licenses[0] : undefined);
  if (typeof l === "string") return l.trim();
  if (l && typeof l.type === "string") return l.type.trim();
  return "";
}

export function repositoryUrlOf(pkg) {
  const r = pkg.repository;
  let url = typeof r === "string" ? r : r && typeof r.url === "string" ? r.url : "";
  url = url.trim();
  if (!url) return "";
  if (/^[\w.-]+\/[\w.-]+$/.test(url)) return `https://github.com/${url}`;
  url = url.replace(/^git\+/, "").replace(/^git@github\.com:/, "https://github.com/");
  url = url.replace(/^ssh:\/\/git@github\.com[:/]/, "https://github.com/").replace(/^git:\/\//, "https://");
  return url.replace(/\.git$/, "");
}

function licenceAllowed(name, id) {
  const extra = PACKAGE_ONLY_LICENCES.get(name);
  const ok = (one) => ALLOWED_LICENCES.has(one) || Boolean(extra && extra.has(one));
  const expr = id.replace(/^\((.*)\)$/, "$1").trim();
  if (!expr || /\b(AND|WITH)\b/.test(expr)) return false;
  return expr.split(/\s+OR\s+/).some((part) => ok(part.trim()));
}

/** Problems that must stop the build for one bundled package; empty when it is fine. */
export function checkEntry(entry) {
  const problems = [];
  const who = `${entry.name}${entry.version ? ` ${entry.version}` : ""}`;
  if (!entry.licence) {
    problems.push(`${who}: its package.json names no licence`);
  } else if (!licenceAllowed(entry.name, entry.licence)) {
    problems.push(`${who}: licence "${entry.licence}" is not on the allowlist in scripts/third_party_licenses.mjs`);
  }
  if (!entry.licenceTexts || !entry.licenceTexts.some((t) => LICENCE_FILE.test(t.file))) {
    problems.push(`${who}: no licence file (LICENSE, LICENCE or COPYING) in its package folder`);
  }
  if (entry.name === "react-icons") {
    const bad = (entry.iconSets ?? []).filter((s) => !ALLOWED_ICON_SETS.has(s));
    if (bad.length) {
      problems.push(`${who}: icon set(s) ${bad.join(", ")} are not on ALLOWED_ICON_SETS; each set has its own licence`);
    }
  }
  return problems;
}

const RULE = "=".repeat(78);

/** The licences file: a short header, then one block per package, sorted by name. */
export function renderLicences(entries) {
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  const out = [
    "Third-party software in bonsAI's screen code (dist/index.js)",
    "",
    "bonsAI itself is Apache-2.0 (see LICENSE and NOTICE in the plugin folder). The screen code",
    "bundles the packages below. Each keeps its own licence, reproduced here in full.",
    "This file is written by scripts/third_party_licenses.mjs every time the plugin is built.",
    "",
    `${sorted.length} packages.`,
    "",
  ];
  for (const e of sorted) {
    out.push(RULE, `${e.name} ${e.version}`, `Licence: ${e.licence}`);
    if (e.repository) out.push(`Source: ${e.repository}`);
    if (e.name === "react-icons" && e.iconSets?.length) {
      out.push(`Icon sets bundled: ${e.iconSets.map((s) => `${s} (${ALLOWED_ICON_SETS.get(s) ?? "unknown"})`).join(", ")}`);
    }
    if (PACKAGE_ONLY_LICENCES.has(e.name)) {
      out.push(
        `bonsAI bundles a small part of ${e.name} version ${e.version}, unchanged. Its complete`,
        `source code is available from ${e.repository || "its package registry entry"}.`,
      );
    }
    for (const t of e.licenceTexts ?? []) {
      out.push("", `--- ${t.file} ---`, "", t.text.replace(/\r\n/g, "\n").trimEnd());
    }
    out.push("");
  }
  return `${out.join("\n")}\n`;
}

/** True when rollup's commonjs plugin injected its helper code into the bundle. */
export function bundleUsesCommonjsHelper(bundleText) {
  return /\bgetDefaultExportFromCjs\b|\bcommonjsGlobal\b|\bcommonjsRequire\b/.test(bundleText);
}

function readPackage({ name, dir }, extra = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  const files = fs.readdirSync(dir).filter((f) => LICENCE_FILE.test(f) || NOTICE_FILE.test(f)).sort();
  return {
    name,
    version: String(pkg.version ?? ""),
    licence: licenceIdOf(pkg),
    repository: repositoryUrlOf(pkg),
    licenceTexts: files
      .filter((f) => fs.statSync(path.join(dir, f)).isFile())
      .map((f) => ({ file: f, text: fs.readFileSync(path.join(dir, f), "utf8") })),
    ...extra,
  };
}

/** Folder of the commonjs plugin that @decky/rollup builds with (its helper is in the bundle). */
function commonjsPluginDir(repoRoot) {
  const fromRepo = createRequire(path.join(repoRoot, "package.json"));
  const fromDecky = createRequire(fromRepo.resolve("@decky/rollup"));
  let dir = path.dirname(fromDecky.resolve(COMMONJS_PACKAGE));
  for (;;) {
    const pj = path.join(dir, "package.json");
    if (fs.existsSync(pj) && JSON.parse(fs.readFileSync(pj, "utf8")).name === COMMONJS_PACKAGE) return dir;
    const up = path.dirname(dir);
    if (up === dir) throw new Error(`could not find ${COMMONJS_PACKAGE}'s package folder`);
    dir = up;
  }
}

export function main({
  distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist"),
  log = console.log,
  error = console.error,
} = {}) {
  const mapPath = path.join(distDir, "index.js.map");
  if (!fs.existsSync(mapPath)) {
    error(`third_party_licenses: no ${mapPath}; run rollup first (it writes the source map)`);
    return 1;
  }
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const sources = Array.isArray(map.sources) ? map.sources : [];
  const iconSets = iconSetsFromSources(sources);
  const entries = [];
  const problems = [];
  for (const root of packageRootsFromSources(sources, distDir)) {
    try {
      entries.push(readPackage(root, root.name === "react-icons" ? { iconSets } : {}));
    } catch (e) {
      problems.push(`${root.name}: could not read its package folder ${root.dir} (${e.message})`);
    }
  }
  const bundlePath = path.join(distDir, "index.js");
  if (fs.existsSync(bundlePath) && bundleUsesCommonjsHelper(fs.readFileSync(bundlePath, "utf8"))) {
    try {
      entries.push(readPackage({ name: COMMONJS_PACKAGE, dir: commonjsPluginDir(path.dirname(distDir)) }));
    } catch (e) {
      problems.push(`${COMMONJS_PACKAGE}: its helper code is in the bundle but its licence was not found (${e.message})`);
    }
  }
  for (const e of entries) problems.push(...checkEntry(e));
  if (problems.length) {
    error("third_party_licenses: refusing to build; a bundled package cannot ship as it is:");
    for (const p of problems) error(`  ${p}`);
    return 1;
  }
  fs.writeFileSync(path.join(distDir, OUTPUT_NAME), renderLicences(entries), "utf8");
  log(`third_party_licenses: wrote dist/${OUTPUT_NAME} (${entries.length} packages)`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main();
}
