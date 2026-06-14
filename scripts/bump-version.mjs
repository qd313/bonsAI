#!/usr/bin/env node
/**
 * Prepare-only release bump: plugin.json, package.json, pluginVersion.ts, CHANGELOG header.
 * Does not commit, tag, or push.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "plugin.json");
const changelogPath = path.join(root, "CHANGELOG.md");

function usage() {
  console.error("Usage: node scripts/bump-version.mjs <patch|minor|major|x.y.z>");
  process.exit(1);
}

function parseSemver(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function bump(current, kind) {
  const p = parseSemver(current);
  if (!p) throw new Error(`Invalid current version: ${current}`);
  if (kind === "patch") return `${p.major}.${p.minor}.${p.patch + 1}`;
  if (kind === "minor") return `${p.major}.${p.minor + 1}.0`;
  if (kind === "major") return `${p.major + 1}.0.0`;
  const explicit = parseSemver(kind);
  if (!explicit) throw new Error(`Invalid bump target: ${kind}`);
  return kind;
}

function promoteChangelog(content, version) {
  const unreleased = "## [Unreleased]";
  if (!content.includes(unreleased)) {
    throw new Error("CHANGELOG.md missing ## [Unreleased] section");
  }
  const date = new Date().toISOString().slice(0, 10);
  const promoted = `## [${version}] - ${date}`;
  return content.replace(unreleased, `${unreleased}\n\n${promoted}`);
}

const arg = process.argv[2];
if (!arg) usage();

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const current = String(manifest.version ?? "").trim();
const next = bump(current, arg);

manifest.version = next;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const syncPlugin = spawnSync(process.execPath, ["scripts/sync-version-from-plugin.mjs"], {
  cwd: root,
  stdio: "inherit",
});
if (syncPlugin.status !== 0) process.exit(syncPlugin.status ?? 1);

const syncPkg = spawnSync(process.execPath, ["scripts/sync-versions.mjs"], {
  cwd: root,
  stdio: "inherit",
});
if (syncPkg.status !== 0) process.exit(syncPkg.status ?? 1);

let changelog = fs.readFileSync(changelogPath, "utf8");
changelog = promoteChangelog(changelog, next);
fs.writeFileSync(changelogPath, changelog, "utf8");

console.log("");
console.log(`Bumped ${current} → ${next}`);
console.log("Updated: plugin.json, package.json, src/pluginVersion.ts, CHANGELOG.md");
console.log("");
console.log("Next steps (manual):");
console.log("  1. Edit CHANGELOG bullets under the new version section");
console.log("  2. pnpm run build");
console.log("  3. ./scripts/build.sh release");
console.log(`  4. git add -A && git commit -m "Release v${next}"`);
console.log(`  5. git tag v${next}`);
console.log(`  6. git push origin HEAD && git push origin v${next}`);
