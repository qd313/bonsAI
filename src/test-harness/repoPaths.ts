/**
 * Title: Repo paths for tests that read files
 * Purpose: Test helper. Gives a test the repo root and a way to find one source file by its base name
 *          anywhere under src/, so a test no longer hard-codes the folder a file lives in (the screen
 *          files move into feature folders in plan 86 step 4; a test that counts folders up from its
 *          own place, or writes `src/components/x.tsx`, would break or quietly read nothing).
 * Used for: tests that read a source file, a fixture or a tests/contracts file from disk.
 * Solves: tests breaking, or passing while checking a smaller tree, after a file changes folder.
 * Does not: search outside src/, follow links, or accept two files with the same base name (it throws
 *           and names both, so a clash is loud rather than a quiet pick).
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** The repo root. Vitest runs from the repo root; `main.py` sitting there is how we check. */
export function repoRoot(): string {
  const root = process.cwd();
  if (!existsSync(join(root, "main.py"))) {
    throw new Error(`repoRoot(): expected to run from the repo root (main.py not found in ${root})`);
  }
  return root;
}

let byName: Map<string, string[]> | null = null;

function index(): Map<string, string[]> {
  if (byName) return byName;
  const map = new Map<string, string[]>();
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else map.set(e.name, [...(map.get(e.name) ?? []), full]);
    }
  };
  walk(join(repoRoot(), "src"));
  byName = map;
  return map;
}

/** The one file called `name` anywhere under src/. Throws if there is none or more than one. */
export function findSrcFile(name: string): string {
  const hits = index().get(name) ?? [];
  if (hits.length === 0) throw new Error(`findSrcFile("${name}"): no file with that name under src/`);
  if (hits.length > 1) throw new Error(`findSrcFile("${name}"): ${hits.length} files share that name: ${hits.join(", ")}`);
  return hits[0];
}

/** Several names at once, in the same order. */
export function findSrcFiles(names: readonly string[]): string[] {
  return names.map(findSrcFile);
}

/** The first of `names` that exists under src/ (for a file the move renames). Throws if none do. */
export function findFirstSrcFile(names: readonly string[]): string {
  for (const n of names) if ((index().get(n) ?? []).length > 0) return findSrcFile(n);
  throw new Error(`findFirstSrcFile: none of ${names.join(", ")} found under src/`);
}
