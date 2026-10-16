/**
 * Title: Architecture maps, built when the tool server starts
 *
 * Purpose: The tool server answers questions about the code from five small JSON maps
 * (which back-end methods exist, which files are biggest, how files import each other,
 * which tests exist, which settings variables are read) plus
 * one for the back end's own imports. They are no longer saved in the repo. This file runs
 * the two programs that write them, once, before the server starts answering, so every answer
 * comes from the code as it is right now.
 * Used for: runServer in server.ts, and the architecture tools there, which ask here
 * why a map is missing when its file is not on disk.
 * Solves: Saved maps went stale between commits, and every helper working in its own copy of
 * the repo collided on them at every landing.
 * Does not: rebuild after start (restart the server to pick up new code), build
 * src/types/rpcMethods.ts (that file stays saved in the repo), or crash the server when a
 * builder fails -- it records what went wrong and the tools say so.
 */
import { execFile } from "node:child_process";
import path from "node:path";

const BUILD_TIMEOUT_MS = 180_000;

let problems: string[] = [];

function runProgram(command: string, args: string[], cwd: string, what: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(command, args, { cwd, timeout: BUILD_TIMEOUT_MS, windowsHide: true }, (error, stdout, stderr) => {
      if (!error) {
        resolve(null);
        return;
      }
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        resolve(`${what}: the program "${command}" was not found`);
        return;
      }
      const lines = `${stderr || stdout || error.message}`.trim().split(/\r?\n/);
      resolve(`${what}: failed (${lines[lines.length - 1] || "no output"})`);
    });
  });
}

/** Python is `python` on Windows and often only `python3` on Linux and Mac. */
async function runPython(script: string, cwd: string, what: string): Promise<string | null> {
  const first = await runProgram("python", [script], cwd, what);
  if (first === null || !first.includes("was not found")) return first;
  return runProgram("python3", [script], cwd, what);
}

/**
 * Build every map into packages/bonsai-mcp/knowledge/architecture/. Never throws. The reasons
 * any step failed are kept and returned; an empty list means all the maps were built.
 */
export async function buildArchitectureMaps(repoRoot: string): Promise<string[]> {
  const generator = path.join(repoRoot, "packages", "bonsai-mcp", "scripts", "generate-architecture.mjs");
  const pyGraph = path.join(repoRoot, "scripts", "py_import_graph.py");
  const results = await Promise.all([
    runProgram(process.execPath, [generator, "--maps-only"], repoRoot, "the front-end and RPC maps"),
    runPython(pyGraph, repoRoot, "the back-end import map"),
  ]);
  problems = results.filter((r): r is string => r !== null);
  for (const p of problems) console.error(`[bonsai-mcp] could not build ${p}`);
  return problems;
}

/** Why a map may be missing, as one sentence for a tool answer. Empty when the build worked. */
export function architectureBuildProblems(): string {
  return problems.join("; ");
}

/** What a tool says when its map file is not there. */
export function mapMissingMessage(fileName: string): string {
  const why = architectureBuildProblems();
  return why
    ? `${fileName} could not be built when the server started (${why}). Run: npm run mcp:generate`
    : `${fileName} is not on disk and the server did not report a build problem. Run: npm run mcp:generate`;
}
