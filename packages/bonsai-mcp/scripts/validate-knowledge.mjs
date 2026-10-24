#!/usr/bin/env node
/**
 * Validate knowledge/ frontmatter and that src/types/rpcMethods.ts is fresh.
 *
 * rpcMethods.ts is the only generated file saved in the repo (the type check needs it in a
 * fresh clone). The architecture JSON maps are no longer saved; the tool server and the
 * checks build them when they need them, so there is nothing to compare for those.
 *
 * Freshness check runs when:
 *   - `--check-generated` is passed (default for `pnpm run mcp:validate`), or
 *   - `CI=true` (GitHub Actions / other CI)
 *
 * Skip with `--skip-generated-check` when you only need frontmatter validation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const KNOWLEDGE = path.join(__dirname, "..", "knowledge");
const skipGenerated = process.argv.includes("--skip-generated-check");
const checkGenerated =
  !skipGenerated &&
  (process.argv.includes("--check-generated") || process.env.CI === "true");

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

// The one saved generated file: rewrite it from main.py and compare with the last commit.
// Compare to HEAD (not the index): staged-but-uncommitted output must still fail, matching
// what CI checks after a clean checkout.
const GENERATED_TYPES = "src/types/rpcMethods.ts";
if (checkGenerated) {
  try {
    execSync("node scripts/generate-architecture.mjs --types-only", {
      cwd: path.join(REPO_ROOT, "packages", "bonsai-mcp"),
      stdio: "pipe",
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    fail(`Failed to regenerate ${GENERATED_TYPES}: ${detail}`);
  }

  if (errors === 0) {
    try {
      const diff = execSync(`git diff HEAD --name-only -- "${GENERATED_TYPES}"`, {
        cwd: REPO_ROOT,
        encoding: "utf8",
      }).trim();
      if (diff) {
        fail(
          `Stale ${GENERATED_TYPES} (it no longer matches main.py) — run: node packages/bonsai-mcp/scripts/generate-architecture.mjs --types-only && git add ${GENERATED_TYPES}`,
        );
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      // Outside a git work tree (e.g. some CI unpack paths), skip freshness.
      if (/not a git repository/i.test(detail)) {
        console.warn("validate-knowledge: skip freshness check (not a git repository)");
      } else {
        fail(`${GENERATED_TYPES} freshness check failed: ${detail}`);
      }
    }
  }
}

if (errors > 0) {
  process.exit(1);
}
console.log("validate-knowledge: OK");
