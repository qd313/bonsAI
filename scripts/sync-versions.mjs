/**
 * Align package.json version with plugin.json (manifest is source of truth).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "plugin.json");
const packagePath = path.join(root, "package.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = String(manifest.version ?? "").trim();
if (!version) {
  console.error("sync-versions: plugin.json missing version");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
if (pkg.version === version) {
  console.log("sync-versions: package.json already", version);
} else {
  pkg.version = version;
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  console.log("sync-versions: package.json →", version);
}
