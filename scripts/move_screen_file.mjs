#!/usr/bin/env node
/**
 * Title: Move screen files and fix everything that names them
 *
 * Purpose: Step 4 of the clean-up gives every feature its own folder, which means hundreds
 * of screen files change place. Moving one by hand means finding every file that imports it,
 * every test that mocks it by path, every document that names it. This script does all of
 * that in one go: it moves the files with `git mv` (so history follows) and rewrites every
 * reference to them, so the commit holds nothing but the move.
 *
 * Used for: `node scripts/move_screen_file.mjs <from> <to> [<from> <to> ...] [--with-tests]
 * [--dry-run]`, or `--map <file>` where the file lists one move per line as `<from>`, a tab,
 * `<to>`. Paths are relative to the repo root. A `<to>` that is a folder (it ends in `/`, it
 * already exists, or it has no file extension) keeps the file name; anything else is the new
 * full path, so it can rename. `--with-tests` brings the file's own tests along (`Foo.test.tsx`,
 * `Foo.walk.test.tsx`). `--dry-run` prints every edit and changes nothing. `--no-stage` leaves
 * the edited files unstaged (the moves are staged by `git mv` regardless). `--leave <path>`
 * (repeatable) leaves a file or folder's text mentions alone, for a log you want to keep as written (for example `--leave CHANGELOG.md`);
 * module paths in code are always fixed. `--root <dir>` runs
 * against a repo other than the current folder (the tests use this). Afterwards, prove the
 * commit changed nothing else with `python scripts/check_move_commit.py HEAD`.
 *
 * Solves: Hand-fixing import paths is where a move quietly goes wrong. A `vi.mock("../foo")`
 * with a stale path stops mocking anything and the test still passes. This script finds every
 * module path with the TypeScript parser (imports, exports, `vi.mock`, `vi.doMock`,
 * `vi.importActual`, `vi.importMock`, dynamic `import()`, `require()`, `import("x")` types),
 * rewrites each one relative to where its file now sits, and also fixes the repo path written
 * in comments, documents, Python tests, scripts and JSON files, and relative Markdown links.
 *
 * Does not: Touch the files a generator writes, nor the history folders (docs/archive,
 * docs/test-evidence, docs/planning, docs/audit), which stay as written. It does not rewrite
 * module paths in files outside src/ (plain .mjs or .py files), a mention of a file by its
 * path with the extension left off, or a path built at run time from pieces; it prints a
 * warning for the first kind it can see. It refuses, changing nothing, when a source is not
 * tracked by git, a target exists, two moves land on one target, or a file it would edit has
 * uncommitted changes.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Project, SyntaxKind } from "ts-morph";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = JSON.parse(fs.readFileSync(path.join(HERE, "move_tools_config.json"), "utf8"));

const MOCK_METHODS = new Set([
  "mock", "doMock", "unmock", "doUnmock", "importActual", "importMock", "requireActual", "requireMock",
]);
const CODE_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const TEXT_SIZE_LIMIT = 4 * 1024 * 1024;

// ---------------------------------------------------------------------------------------------
// Small helpers

const posix = (p) => p.split(path.sep).join("/").replace(/^\.\//, "");
const fail = (msg) => {
  console.error(`move_screen_file: ${msg}`);
  process.exit(1);
};

function globToRegex(glob) {
  const body = glob
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^/]*");
  return new RegExp(`^${body}$`);
}
const GENERATED = CONFIG.generated.map(globToRegex);
const isGenerated = (rel) => GENERATED.some((re) => re.test(rel));
const isHistory = (rel) => CONFIG.history.some((prefix) => rel.startsWith(prefix));

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Relative module path from a folder to a file, always starting with ./ or ../ (or just ".") */
function relSpec(fromDir, target) {
  let rel = posix(path.posix.relative(fromDir || ".", target || "."));
  if (rel === "") return ".";
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

// ---------------------------------------------------------------------------------------------
// Arguments

function parseArgs(argv) {
  const opts = { pairs: [], withTests: false, dryRun: false, stage: true, root: null, maps: [], leave: [] };
  const free = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--with-tests") opts.withTests = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--no-stage") opts.stage = false;
    else if (a === "--map") opts.maps.push(argv[++i]);
    else if (a === "--root") opts.root = argv[++i];
    else if (a === "--leave") opts.leave.push(argv[++i]);
    else if (a.startsWith("--")) fail(`unknown option ${a}`);
    else free.push(a);
  }
  if (free.length % 2 !== 0) fail("moves come in pairs: <from> <to> [<from> <to> ...]");
  for (let i = 0; i < free.length; i += 2) opts.pairs.push([free[i], free[i + 1]]);
  return opts;
}

// ---------------------------------------------------------------------------------------------
// Main

const opts = parseArgs(process.argv.slice(2));
const ROOT = path.resolve(opts.root ?? process.cwd());

function git(args, extra = {}) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...extra });
}

for (const mapFile of opts.maps) {
  const text = fs.readFileSync(path.resolve(mapFile), "utf8");
  for (const [n, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cols = raw.split("\t").map((c) => c.trim()).filter((c) => c !== "");
    if (cols.length !== 2) fail(`${mapFile} line ${n + 1}: expected two columns separated by a tab`);
    opts.pairs.push(cols);
  }
}
if (opts.pairs.length === 0) {
  fail("nothing to move. usage: node scripts/move_screen_file.mjs <from> <to> [...] [--with-tests] [--dry-run] [--map file]");
}

const tracked = new Set(git(["ls-files", "-z"]).split("\0").filter(Boolean));
const onDisk = (rel) => fs.existsSync(path.join(ROOT, rel));
const isDir = (rel) => {
  try { return fs.statSync(path.join(ROOT, rel)).isDirectory(); } catch { return false; }
};

/** Build the full old -> new table: folders resolved, tests added, everything checked. */
function planMoves() {
  const problems = [];
  const moves = new Map(); // old -> new
  const claimedTargets = new Map(); // new -> old

  const add = (from, to, why) => {
    if (moves.has(from)) {
      if (moves.get(from) === to) return;
      problems.push(`${from} is moved to two places (${moves.get(from)} and ${to})`);
      return;
    }
    if (claimedTargets.has(to)) {
      problems.push(`${from} and ${claimedTargets.get(to)} would both land on ${to}${why ? ` (${why})` : ""}`);
      return;
    }
    moves.set(from, to);
    claimedTargets.set(to, from);
  };

  for (const [rawFrom, rawTo] of opts.pairs) {
    const from = posix(rawFrom.replace(/\\/g, "/"));
    let to = posix(rawTo.replace(/\\/g, "/"));
    if (!tracked.has(from)) {
      problems.push(`${from} is not a file git tracks`);
      continue;
    }
    const folder = rawTo.endsWith("/") || rawTo.endsWith("\\") || isDir(to) || path.posix.extname(to) === "";
    if (folder) to = posix(path.posix.join(to.replace(/\/$/, ""), path.posix.basename(from)));
    add(from, to);

    if (opts.withTests) {
      const dir = path.posix.dirname(from);
      const ext = path.posix.extname(from);
      if (!/\.test\.[tj]sx?$/.test(from) && /^\.(ts|tsx)$/.test(ext)) {
        const base = path.posix.basename(from, ext);
        const newBase = path.posix.basename(to, path.posix.extname(to));
        const newDir = path.posix.dirname(to);
        const own = new RegExp(`^${escapeRe(base)}(\\..+)?\\.test\\.tsx?$`);
        for (const sibling of tracked) {
          if (path.posix.dirname(sibling) !== dir) continue;
          const name = path.posix.basename(sibling);
          const m = own.exec(name);
          if (!m) continue;
          const rest = name.slice(base.length);
          add(sibling, posix(path.posix.join(newDir, `${newBase}${rest}`)), "tests moved along");
        }
      }
    }
  }

  for (const [from, to] of moves) {
    if (from === to) problems.push(`${from} is already there (the target is the source)`);
    if (isGenerated(from) || isGenerated(to)) problems.push(`${from} -> ${to}: a generator writes this file; a move must not touch it`);
    if (to.startsWith("../") || path.posix.isAbsolute(to) || to.startsWith(".git/")) problems.push(`${to} is outside the repo`);
    if (tracked.has(to) || onDisk(to)) problems.push(`${to} already exists`);
  }
  return { moves, problems };
}

const { moves, problems: planProblems } = planMoves();
if (planProblems.length) {
  console.error("move_screen_file: refusing, nothing changed:");
  for (const p of planProblems) console.error(`  - ${p}`);
  process.exit(1);
}

const finalPath = (rel) => moves.get(rel) ?? rel;

// ---------------------------------------------------------------------------------------------
// Module paths in code

/**
 * Which file does a relative module path point at (before any move)? Null when none.
 * `kind` records how the path was written, so the rewrite can keep the same style:
 * "exact" (full file name), "swap" (./x.js for x.ts), "ext" (extension left off),
 * "index" (a folder, meaning its index file).
 */
function resolveSpec(fromFile, spec) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  const candidates = [[base, "exact"]];
  const js = /\.(m?js|jsx)$/.exec(base);
  if (js) {
    const stem = base.slice(0, -js[0].length);
    for (const ext of [".ts", ".tsx", ".d.ts"]) candidates.push([`${stem}${ext}`, "swap"]);
  }
  for (const ext of [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mjs", ".json"]) candidates.push([`${base}${ext}`, "ext"]);
  for (const ext of [".ts", ".tsx", ".js"]) candidates.push([`${base}/index${ext}`, "index"]);
  for (const [c, kind] of candidates) {
    try {
      if (fs.statSync(path.join(ROOT, c)).isFile()) return { file: c, kind };
    } catch { /* not there */ }
  }
  return null;
}

/** The new text of a module path, in the same style the old one was written in. */
function newSpecifier(spec, resolved, fromNew, targetNew) {
  const fromDir = path.posix.dirname(fromNew);
  const stripExt = (p) => p.replace(/\.d\.ts$|\.(tsx?|jsx?|mjs)$/, "");
  switch (resolved.kind) {
    case "exact":
      return relSpec(fromDir, targetNew);
    case "swap": {
      const jsExt = /\.(m?js|jsx)$/.exec(spec)[0];
      return relSpec(fromDir, `${stripExt(targetNew)}${jsExt}`);
    }
    case "index":
      if (/^index\.[a-z]+$/.test(path.posix.basename(targetNew))) return relSpec(fromDir, path.posix.dirname(targetNew));
      return relSpec(fromDir, stripExt(targetNew));
    default:
      return relSpec(fromDir, stripExt(targetNew));
  }
}

/** Every module path written as a string literal in a source file, with its position. */
function findSpecifiers(sourceFile) {
  const found = [];
  const push = (lit) => {
    if (!lit) return;
    const kind = lit.getKind();
    if (kind !== SyntaxKind.StringLiteral && kind !== SyntaxKind.NoSubstitutionTemplateLiteral) return;
    found.push({ start: lit.getStart() + 1, end: lit.getEnd() - 1, text: lit.getLiteralText() });
  };
  sourceFile.forEachDescendant((node) => {
    switch (node.getKind()) {
      case SyntaxKind.ImportDeclaration:
      case SyntaxKind.ExportDeclaration:
        push(node.getModuleSpecifier?.());
        break;
      case SyntaxKind.ExternalModuleReference:
        push(node.getExpression?.());
        break;
      case SyntaxKind.ImportType: {
        const arg = node.getArgument();
        push(arg.getFirstDescendantByKind(SyntaxKind.StringLiteral));
        break;
      }
      case SyntaxKind.CallExpression: {
        const callee = node.getExpression();
        const ck = callee.getKind();
        const first = node.getArguments()[0];
        if (ck === SyntaxKind.ImportKeyword) push(first);
        else if (ck === SyntaxKind.Identifier && callee.getText() === "require") push(first);
        else if (ck === SyntaxKind.PropertyAccessExpression) {
          const obj = callee.getExpression().getText();
          if ((obj === "vi" || obj === "jest") && MOCK_METHODS.has(callee.getName())) push(first);
        }
        break;
      }
      default:
    }
  });
  return found;
}

const project = new Project({
  tsConfigFilePath: path.join(ROOT, "tsconfig.json"),
  skipFileDependencyResolution: true,
  skipLoadingLibFiles: true,
});
for (const extra of ["src/**/*.ts", "src/**/*.tsx"]) project.addSourceFilesAtPaths(`${posix(ROOT)}/${extra}`);

/** rel path -> new text, for every file whose content changes (keyed by OLD path). */
const newContent = new Map();
const rawOf = new Map();
const unresolvedInMoved = [];
const warnings = [];

function readRaw(rel) {
  if (!rawOf.has(rel)) rawOf.set(rel, fs.readFileSync(path.join(ROOT, rel), "utf8"));
  return rawOf.get(rel);
}

for (const sf of project.getSourceFiles()) {
  const rel = posix(path.relative(ROOT, sf.getFilePath()));
  if (rel.startsWith("..") || rel.includes("node_modules/") || isGenerated(rel)) continue;
  const untracked = !tracked.has(rel);
  const fileMoves = moves.has(rel);
  const specs = findSpecifiers(sf).filter((s) => s.text.startsWith("."));
  if (specs.length === 0) continue;
  const edits = [];
  for (const s of specs) {
    const resolved = resolveSpec(rel, s.text);
    if (!resolved) {
      if (fileMoves) unresolvedInMoved.push(`${rel}: "${s.text}"`);
      continue;
    }
    const targetMoves = moves.has(resolved.file);
    if (!fileMoves && !targetMoves) continue;
    if (untracked) {
      warnings.push(`${rel}: is not tracked by git, so it was NOT updated, but it names a moved file ("${s.text}")`);
      continue;
    }
    const next = newSpecifier(s.text, resolved, finalPath(rel), finalPath(resolved.file));
    if (next !== s.text) edits.push({ ...s, next });
  }
  if (edits.length === 0) continue;
  let text = sf.getFullText();
  for (const e of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, e.start) + e.next + text.slice(e.end);
  const raw = readRaw(rel);
  newContent.set(rel, raw.startsWith("﻿") ? `﻿${text}` : text);
}
if (unresolvedInMoved.length) {
  console.error("move_screen_file: refusing, nothing changed. A moved file has relative module paths that point at nothing, so they cannot be rewritten safely:");
  for (const u of unresolvedInMoved) console.error(`  - ${u}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// Mentions in text: links, repo paths, bare names

const movedOldPaths = [...moves.keys()].sort((a, b) => b.length - a.length);
const pathRe = new RegExp(
  `(?<![\\w@-])(?<![\\w@-]/)(${movedOldPaths.map(escapeRe).join("|")})(?![\\w-])`,
  "g",
);

const renamedBases = new Map(); // old base file name -> new base file name, only when unambiguous
{
  const baseCount = new Map();
  for (const t of tracked) {
    const b = path.posix.basename(t);
    baseCount.set(b, (baseCount.get(b) ?? 0) + 1);
  }
  for (const [from, to] of moves) {
    const ob = path.posix.basename(from);
    const nb = path.posix.basename(to);
    if (ob !== nb && baseCount.get(ob) === 1) renamedBases.set(ob, nb);
  }
}
const bareRe = renamedBases.size
  ? new RegExp(`(?<![\\w/.@-])(${[...renamedBases.keys()].sort((a, b) => b.length - a.length).map(escapeRe).join("|")})(?![\\w-])`, "g")
  : null;
const noExtRe = new RegExp(
  `(?<![\\w@-])(?<![\\w@-]/)(${movedOldPaths.map((p) => escapeRe(p.replace(/\.[^./]+$/, ""))).join("|")})(?![\\w/.-])`,
  "g",
);

const MD_INLINE = /(\]\()([^)\s<>]+)((?:\s+"[^"]*")?\))/g;
const MD_REFDEF = /^(\s*\[[^\]]+\]:\s*)(\S+)/gm;

function rewriteMarkdownLinks(rel, text) {
  const fix = (target) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target.startsWith("/")) return target;
    const m = /^([^#?]*)([#?].*)?$/.exec(target);
    const linkPath = m[1];
    if (!linkPath) return target;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(rel), linkPath));
    const docMoves = moves.has(rel);
    const targetMoves = moves.has(resolved);
    if (!docMoves && !targetMoves) return target;
    if (!onDisk(resolved)) return target;
    let next = posix(path.posix.relative(path.posix.dirname(finalPath(rel)), finalPath(resolved)));
    if (linkPath.startsWith("./") && !next.startsWith(".")) next = `./${next}`;
    return next + (m[2] ?? "");
  };
  return text
    .replace(MD_INLINE, (all, a, target, c) => `${a}${fix(target)}${c}`)
    .replace(MD_REFDEF, (all, a, target) => `${a}${fix(target)}`);
}

const textFiles = [...tracked].filter((rel) => {
  if (isGenerated(rel) || isHistory(rel) || rel === "pnpm-lock.yaml") return false;
  if (opts.leave.some((prefix) => rel === prefix || rel.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`))) return false;
  return true;
});

for (const rel of textFiles) {
  const abs = path.join(ROOT, rel);
  let stat;
  try { stat = fs.statSync(abs); } catch { continue; }
  if (!stat.isFile() || stat.size > TEXT_SIZE_LIMIT) continue;
  let text = newContent.has(rel) ? newContent.get(rel) : null;
  let raw = null;
  if (text === null) {
    raw = fs.readFileSync(abs);
    if (raw.subarray(0, 8000).includes(0)) continue;
    text = raw.toString("utf8");
    rawOf.set(rel, text);
  }
  const before = text;
  if (/\.md$/i.test(rel)) text = rewriteMarkdownLinks(rel, text);
  text = text.replace(pathRe, (m) => moves.get(m) ?? m);
  if (bareRe) text = text.replace(bareRe, (m) => renamedBases.get(m) ?? m);
  if (text !== before || newContent.has(rel)) newContent.set(rel, text);
  if (!moves.has(rel)) {
    for (const [i, line] of text.split("\n").entries()) {
      noExtRe.lastIndex = 0;
      if (noExtRe.test(line)) warnings.push(`${rel}:${i + 1}: names a moved file without its extension: ${line.trim().slice(0, 120)}`);
    }
  }
}

// Only keep files whose content truly differs.
for (const [rel, text] of [...newContent]) if (text === rawOf.get(rel)) newContent.delete(rel);

// ---------------------------------------------------------------------------------------------
// Report, dry-run stop, safety check, then do it

function describeEdits() {
  const lines = [];
  for (const [from, to] of moves) lines.push(`MOVE  ${from}  ->  ${to}`);
  for (const rel of [...newContent.keys()].sort()) {
    const a = rawOf.get(rel).split("\n");
    const b = newContent.get(rel).split("\n");
    const where = moves.has(rel) ? `${rel} (moves to ${moves.get(rel)})` : rel;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) lines.push(`EDIT  ${where}:${i + 1}\n        - ${(a[i] ?? "").trim().slice(0, 160)}\n        + ${(b[i] ?? "").trim().slice(0, 160)}`);
    }
  }
  return lines;
}

const report = describeEdits();
if (opts.dryRun) {
  console.log(report.join("\n"));
  for (const w of warnings) console.log(`WARN  ${w}`);
  console.log(`\ndry run: ${moves.size} file(s) would move, ${newContent.size} file(s) would be edited. Nothing changed.`);
  process.exit(0);
}

// Refuse when any file we would touch already has uncommitted changes: the move commit must
// hold the move and nothing else.
const touched = new Set([...moves.keys(), ...newContent.keys()]);
const dirty = [];
for (const entry of git(["status", "--porcelain", "-z", "--no-renames", "--untracked-files=no"]).split("\0").filter(Boolean)) {
  const file = entry.slice(3);
  if (touched.has(file)) dirty.push(file);
}
if (dirty.length) {
  console.error("move_screen_file: refusing, nothing changed. These files already have uncommitted changes, and the move commit must hold only the move:");
  for (const d of dirty) console.error(`  - ${d}`);
  process.exit(1);
}

const done = [];
try {
  for (const [from, to] of moves) {
    fs.mkdirSync(path.join(ROOT, path.posix.dirname(to)), { recursive: true });
    git(["mv", "--", from, to]);
    done.push([from, to]);
  }
} catch (err) {
  for (const [from, to] of done.reverse()) {
    try { git(["mv", "--", to, from]); } catch { /* best effort */ }
  }
  fail(`git mv failed (${String(err.message).split("\n")[0]}). The moves done so far were put back.`);
}
for (const [rel, text] of newContent) fs.writeFileSync(path.join(ROOT, finalPath(rel)), text);

if (opts.stage) {
  const paths = [...newContent.keys()].map(finalPath);
  for (let i = 0; i < paths.length; i += 100) git(["add", "--", ...paths.slice(i, i + 100)]);
}

console.log(report.length > 400 ? `${report.slice(0, 400).join("\n")}\n... (${report.length - 400} more lines)` : report.join("\n"));
for (const w of warnings) console.log(`WARN  ${w}`);
console.log(`\nmoved ${moves.size} file(s), edited ${newContent.size} file(s)${opts.stage ? " (staged)" : " (edits not staged)"}.`);
console.log("Next: python scripts/check_move_commit.py HEAD   (after you commit)");
