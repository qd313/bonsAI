#!/usr/bin/env node
/**
 * pre-commit helper: regenerate MCP architecture snapshots and stage them.
 * Keeps validate-mcp.yml green without relying on developers to remember mcp:generate.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
// Everything generate-architecture.mjs writes. This list was written out twice in
// this file and only one copy was used, so adding a generated file here did nothing.
// One list now, used below.
const GENERATED_FILES = [
  "packages/bonsai-mcp/knowledge/architecture/rpc-map.json",
  "packages/bonsai-mcp/knowledge/architecture/hotspots.json",
  "packages/bonsai-mcp/knowledge/architecture/import-graph.json",
  "packages/bonsai-mcp/knowledge/architecture/test-inventory.json",
  "packages/bonsai-mcp/knowledge/architecture/preview-tiers.json",
  "packages/bonsai-mcp/knowledge/architecture/env-vars.json",
  // Not a snapshot: the back-end method names as a type the screen code is held to.
  "src/types/rpcMethods.ts",
];

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: opts.stdio ?? "pipe",
    shell: false,
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || `${cmd} failed`).trim();
    console.error(detail);
    process.exit(result.status ?? 1);
  }
  return result;
}

run(process.execPath, [
  path.join(REPO_ROOT, "packages", "bonsai-mcp", "scripts", "generate-architecture.mjs"),
], { stdio: "inherit" });

run("git", ["add", "--", ...GENERATED_FILES]);

console.log(`regenerated and staged ${GENERATED_FILES.length} generated files`);
