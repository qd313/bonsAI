import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function hasRepoMarkers(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, "plugin.json")) &&
    fs.existsSync(path.join(dir, "main.py")) &&
    fs.existsSync(path.join(dir, "packages", "bonsai-mcp"))
  );
}

export function resolveRepoRoot(): string {
  const fromEnv = process.env.BONSAI_REPO_ROOT?.trim();
  if (fromEnv && hasRepoMarkers(fromEnv)) {
    return path.resolve(fromEnv);
  }

  let dir = path.resolve(__dirname, "..", "..", "..");
  for (let i = 0; i < 8; i++) {
    if (hasRepoMarkers(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    "Could not resolve bonsAI repo root. Set BONSAI_REPO_ROOT to the workspace folder.",
  );
}

export function mcpPackageRoot(): string {
  return path.join(resolveRepoRoot(), "packages", "bonsai-mcp");
}

export function knowledgeDir(): string {
  return path.join(mcpPackageRoot(), "knowledge");
}

export function docsDir(): string {
  return path.join(resolveRepoRoot(), "docs");
}

export function subagentReportsPath(): string {
  return path.join(resolveRepoRoot(), ".cursor", "agents", "SUBAGENT_REPORTS.md");
}

/** Reject path traversal for docs/{path} reads. */
export function safeDocPath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error(`Invalid docs path: ${relativePath}`);
  }
  const full = path.join(docsDir(), normalized);
  const resolved = path.resolve(full);
  const docsResolved = path.resolve(docsDir());
  if (!resolved.startsWith(docsResolved + path.sep) && resolved !== docsResolved) {
    throw new Error(`Docs path escapes docs/: ${relativePath}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Doc not found: ${relativePath}`);
  }
  return resolved;
}
