/**
 * Writes src/pluginVersion.ts from repo-root plugin.json so the UI shows the Decky manifest version.
 * Run via npm prebuild / pretest, or after bumping plugin.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Writes `text` (written with plain 
 line endings) to `file` only when it
 * really differs from what is there, ignoring line endings. When it does
 * write, it keeps the line endings the file already has. Returns true when it
 * wrote. This keeps `npm test` and `npm run build` from leaving the file
 * showing as changed on a Windows checkout, where git turns it into CRLF.
 */
export function writeIfChanged(file, text) {
  let existing = null;
  try {
    existing = fs.readFileSync(file, "utf8");
  } catch {
    existing = null;
  }
  if (existing !== null && existing.replace(/\r\n/g, "\n") === text) return false;
  const crlf = existing !== null && existing.includes("\r\n");
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
  return true;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

function main() {
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "plugin.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = String(manifest.version ?? "").trim();
if (!version) {
  console.error("sync-version-from-plugin: plugin.json missing version");
  process.exit(1);
}

const outPath = path.join(root, "src", "pluginVersion.ts");
/*
 * The header is written here rather than into the file, because the file is
 * overwritten in full every time this runs. A worker explaining every file in
 * the project wrote a good header into src/pluginVersion.ts and the next build
 * wiped it, which is also why the header check kept reporting that file as
 * having no description however many times someone described it. A generated
 * file can only be explained by its generator.
 */
const body =
  "/**\n" +
  " * Title: Plugin version number\n" +
  " *\n" +
  " * Purpose: Holds the version number the plugin shows a person, on the About\n" +
  " * tab and anywhere else it names itself. Nobody types the number here: this\n" +
  " * whole file is written from scratch by scripts/sync-version-from-plugin.mjs,\n" +
  " * reading plugin.json, so what the plugin says about its own version always\n" +
  " * matches what Decky actually installed.\n" +
  " *\n" +
  " * Used for: Anywhere the screen prints the plugin's own version.\n" +
  " *\n" +
  " * Gotchas: Editing this file does not stick, and neither does explaining it --\n" +
  " * the next build replaces the lot, this header included. Change the version in\n" +
  " * plugin.json instead, then run `npm run build`, which brings this back into\n" +
  " * step. To change these words, change the generator that writes them.\n" +
  " */\n" +
  `export const PLUGIN_VERSION = ${JSON.stringify(version)} as const;\n`;

const wrote = writeIfChanged(outPath, body);
console.log("sync-version-from-plugin:", version, "→", path.relative(root, outPath), wrote ? "" : "(already up to date)");

const packagePath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
if (pkg.version !== version) {
  pkg.version = version;
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  console.log("sync-version-from-plugin: package.json →", version);
}
}
