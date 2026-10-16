/**
 * Title: Where the workshop folder is
 * Purpose: The history of the plugin (every Deck check's evidence, the saved Deck walks, the old
 *          research reports) lives in a second, private repo called the workshop, not in this one.
 *          Anything that saves or reads that kind of file needs to know where the workshop sits on
 *          this PC. This file answers that in one place. The answer comes from, in this order: the
 *          BONSAI_WORKSHOP environment variable, a BONSAI_WORKSHOP= line in the repo's own .env file
 *          (the file is not tracked), and finally the folder named bonsAI-workshop that sits next to
 *          the repo folder. When a script runs from one of the repo's own working copies (under
 *          .claude/worktrees), "the repo folder" means the main checkout those copies hang off, so
 *          every copy finds the same workshop.
 * Used for: scripts/deck_overnight_run.mjs (saved walks in, report out). The same answer in Python
 *          is scripts/lib/workshop.py.
 * Solves: Evidence files used to be written under docs/ in this repo. Now that they live in the
 *          workshop, each script would otherwise carry its own copy of "where is the workshop".
 * Does not: Create the workshop, clone it, or write any file in it. It only names the folders.
 *          When the workshop is missing it throws one plain sentence, rather than quietly writing
 *          the file somewhere else.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SETTING_NAME = "BONSAI_WORKSHOP";
export const EVIDENCE_FOLDER = "test-evidence";
export const WALKS_FOLDER = "checks";
export const RESEARCH_FOLDER = path.join("archive", "research");
const DEFAULT_FOLDER_NAME = "bonsAI-workshop";

/** The workshop folder is not where the setting (or the default place) says. The message is a full sentence. */
export class WorkshopNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkshopNotFoundError";
  }
}

/** The repo folder this file belongs to (two levels above scripts/lib). */
export function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/** The main checkout, when repoRoot is one of its working copies under .claude/worktrees/<name>. */
export function mainCheckoutRoot(repoRoot) {
  const resolved = path.resolve(repoRoot);
  const parts = resolved.split(path.sep);
  for (let i = 1; i < parts.length - 2; i++) {
    if (parts[i] === ".claude" && parts[i + 1] === "worktrees") {
      return parts.slice(0, i).join(path.sep) || path.sep;
    }
  }
  return resolved;
}

/** The value of NAME= in a .env file, or null. Comments, `export ` and quotes are tolerated. */
export function readEnvFileSetting(envFile, name = SETTING_NAME) {
  let text;
  try {
    text = fs.readFileSync(envFile, "utf8");
  } catch {
    return null;
  }
  let found = null;
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length).trimStart();
    const eq = line.indexOf("=");
    if (eq < 0 || line.slice(0, eq).trim() !== name) continue;
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && value[0] === value[value.length - 1] && (value[0] === '"' || value[0] === "'")) {
      value = value.slice(1, -1);
    }
    found = value;
  }
  return found || null;
}

function configuredValue(repoRoot, env) {
  const fromEnv = (env[SETTING_NAME] ?? "").trim();
  if (fromEnv) return fromEnv;
  for (const root of new Set([path.resolve(repoRoot), mainCheckoutRoot(repoRoot)])) {
    const fromFile = readEnvFileSetting(path.join(root, ".env"));
    if (fromFile) return fromFile;
  }
  return null;
}

/** The workshop folder. Throws WorkshopNotFoundError (one plain sentence) when it is not there. */
export function workshopRoot({ repoRoot = defaultRepoRoot(), env = process.env } = {}) {
  const configured = configuredValue(repoRoot, env);
  let root;
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new WorkshopNotFoundError(
        `${SETTING_NAME} must be an absolute folder path, but it is ${JSON.stringify(configured)}: fix it in .env or in the environment.`
      );
    }
    root = configured;
  } else {
    root = path.join(path.dirname(mainCheckoutRoot(repoRoot)), DEFAULT_FOLDER_NAME);
  }
  let isDir = false;
  try {
    isDir = fs.statSync(root).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    throw new WorkshopNotFoundError(
      `the workshop repo was not found at ${root}: clone qd313/bonsAI-workshop next to this repo, or set ${SETTING_NAME} in .env`
    );
  }
  return root;
}

/** Where Deck check evidence (results, screenshots, logs, recordings) is saved. */
export function evidenceDir(options) {
  return path.join(workshopRoot(options), EVIDENCE_FOLDER);
}

/** Where the Deck tool's saved walks are kept and replayed from. */
export function walksDir(options) {
  return path.join(workshopRoot(options), WALKS_FOLDER);
}

/** Where eval and bake-off reports are saved. */
export function researchDir(options) {
  return path.join(workshopRoot(options), RESEARCH_FOLDER);
}
