#!/usr/bin/env node
/**
 * Ensure this clone uses repo .githooks (pre-commit sync + pre-push validate).
 * Safe to run repeatedly; no-op outside a git work tree.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function git(args) {
  return spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
}

const inside = git(["rev-parse", "--is-inside-work-tree"]);
if (inside.status !== 0 || inside.stdout.trim() !== "true") {
  process.exit(0);
}

const desired = ".githooks";
const current = git(["config", "--get", "core.hooksPath"]);
const value = (current.stdout || "").trim();
if (value === desired) {
  process.exit(0);
}

const set = git(["config", "core.hooksPath", desired]);
if (set.status !== 0) {
  console.warn("Could not set core.hooksPath=.githooks — run: pnpm run mcp:install-hooks");
  process.exit(0);
}
console.log("Enabled git hooks at .githooks (MCP architecture sync on commit)");
