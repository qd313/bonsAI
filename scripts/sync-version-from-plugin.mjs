/**
 * Writes src/pluginVersion.ts from repo-root plugin.json so the UI shows the Decky manifest version.
 * Run via npm prebuild / pretest, or after bumping plugin.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "plugin.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = String(manifest.version ?? "").trim();
if (!version) {
  console.error("sync-version-from-plugin: plugin.json missing version");
  process.exit(1);
}

const outPath = path.join(root, "src", "pluginVersion.ts");
const body =
  "/**\n" +
  " * Shipped plugin semantic version — generated from repo root `plugin.json` (do not edit by hand).\n" +
  " * Run `node scripts/sync-version-from-plugin.mjs` or `npm run build` after changing the manifest.\n" +
  " */\n" +
  `export const PLUGIN_VERSION = ${JSON.stringify(version)} as const;\n`;

fs.writeFileSync(outPath, body, "utf8");
console.log("sync-version-from-plugin:", version, "→", path.relative(root, outPath));
