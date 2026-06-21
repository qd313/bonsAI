#!/usr/bin/env node
/**
 * Validate knowledge/ frontmatter and optional generated-file freshness.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const KNOWLEDGE = path.join(__dirname, "..", "knowledge");
const checkGenerated = process.argv.includes("--check-generated");

let errors = 0;

function fail(msg) {
  console.error("ERROR:", msg);
  errors++;
}

function walkMd(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkMd(full).forEach((f) => files.push(f));
    else if (name.endsWith(".md")) files.push(full);
  }
  return files;
}

for (const sub of ["policies", "workflows", "personas"]) {
  const dir = path.join(KNOWLEDGE, sub);
  for (const file of walkMd(dir)) {
    const content = fs.readFileSync(file, "utf8");
    if (!content.startsWith("---")) {
      fail(`${file}: missing YAML frontmatter`);
      continue;
    }
    const end = content.indexOf("---", 3);
    if (end === -1) {
      fail(`${file}: unclosed frontmatter`);
      continue;
    }
    const fm = content.slice(3, end);
    if (!/^id:\s*.+/m.test(fm)) {
      fail(`${file}: frontmatter missing id`);
    }
  }
}

const archDir = path.join(KNOWLEDGE, "architecture");
const requiredJson = ["rpc-map.json", "module-map.json", "test-inventory.json", "preview-tiers.json", "env-vars.json"];
for (const name of requiredJson) {
  const p = path.join(archDir, name);
  if (!fs.existsSync(p)) {
    fail(`Missing generated file: ${p} — run pnpm run mcp:generate`);
  }
}

if (checkGenerated) {
  try {
    execSync("node scripts/generate-architecture.mjs", {
      cwd: path.join(REPO_ROOT, "packages", "bonsai-mcp"),
      stdio: "pipe",
    });
    for (const name of requiredJson) {
      const diff = execSync(`git diff --name-only -- "${path.join("packages/bonsai-mcp/knowledge/architecture", name)}"`, {
        cwd: REPO_ROOT,
        encoding: "utf8",
      }).trim();
      if (diff) {
        fail(`Stale ${name} — run pnpm run mcp:generate and commit`);
      }
    }
  } catch (e) {
    // git may not be available or not a git repo — skip stale check
  }
}

if (errors > 0) {
  process.exit(1);
}
console.log("validate-knowledge: OK");
