#!/usr/bin/env node
/**
 * pre-commit helper: rewrite src/types/rpcMethods.ts from main.py and stage it.
 *
 * That file is the only generated file still saved in the repo. The type check needs it in a
 * fresh clone, and it changes only when a back-end method is added or removed, so keeping it
 * fresh on every commit is cheap. The architecture JSON maps and the code map are no longer
 * saved: the tool server and the checks build them when they need them.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const GENERATED_FILES = ["src/types/rpcMethods.ts"];

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

run(
  process.execPath,
  [path.join(REPO_ROOT, "packages", "bonsai-mcp", "scripts", "generate-architecture.mjs"), "--types-only"],
  { stdio: "inherit" },
);

run("git", ["add", "--", ...GENERATED_FILES]);

console.log(`regenerated and staged ${GENERATED_FILES.join(", ")}`);
