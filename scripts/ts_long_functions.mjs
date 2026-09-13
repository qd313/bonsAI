#!/usr/bin/env node
/**
 * Title: Front-end long-function scanner
 * Purpose: Count outermost front-end functions longer than 60 lines that have no
 *   leading comment above them.
 * Used for: `scripts/ratchet.py measure`, metric `fe_long_functions_uncommented` —
 *   one of the numbers the phase 0 refactor ratchet is not allowed to make worse.
 * Solves: There was no automatic way to see whether "long functions are getting a
 *   short explanation above them" was improving or slipping backward across the
 *   whole frontend.
 * Does not: Judge whether a comment is a *good* explanation — only whether one is
 *   present immediately above the function. Does not check the backend (see
 *   `be_long_functions_no_docstring` in `scripts/ratchet.py`, which uses Python's
 *   own `ast` module instead).
 *
 * What counts as "outermost": a function that is not itself written inside another
 * function. A method on a class declared at the top of a file counts (the class
 * itself does not count as a "function" for this purpose), but a function typed
 * out inside another function's body does not — the outer function is already the
 * one being measured, so its inner helpers are not counted a second time.
 *
 * Usage: node scripts/ts_long_functions.mjs [--json]
 *   --json   print one JSON object (default) — {count, threshold, scannedFiles, violations}
 *   (no other flags exist; this script has exactly one caller, scripts/ratchet.py)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const LENGTH_THRESHOLD = 60;

const IS_TEST_FILE = /\.test\.[jt]sx?$/;

/** Forward slashes always, so the same output reads the same on Windows and Linux. */
function rel(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join("/");
}

function findSourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "test-harness") continue;
      findSourceFiles(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (IS_TEST_FILE.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

const FUNCTION_LIKE_CHECKS = [
  ts.isFunctionDeclaration,
  ts.isFunctionExpression,
  ts.isArrowFunction,
  ts.isMethodDeclaration,
  ts.isConstructorDeclaration,
  ts.isGetAccessorDeclaration,
  ts.isSetAccessorDeclaration,
];

function isFunctionLikeWithBody(node) {
  return FUNCTION_LIKE_CHECKS.some((check) => check(node)) && Boolean(node.body);
}

/** Best-effort readable name for a report line; not used for matching logic. */
function nameOf(node) {
  if (node.name && (ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name))) {
    return node.name.text;
  }
  let n = node;
  while (n.parent) {
    const p = n.parent;
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
    if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) return p.name.text;
    if (
      ts.isParenthesizedExpression(p) ||
      ts.isAsExpression(p) ||
      ts.isCallExpression(p) ||
      (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(p))
    ) {
      n = p;
      continue;
    }
    break;
  }
  return "<anonymous>";
}

/**
 * A `const useFoo = () => {...}` has no leading trivia of its own — the leading
 * comment, if any, sits above the `const` (or `export const`) statement, not above
 * the arrow function that starts partway through the line. This walks up through
 * the wrapping declaration/call/parenthesization to find the statement a comment
 * would actually be written above.
 */
function docAnchor(node) {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  ) {
    return node;
  }
  let n = node;
  while (n.parent) {
    const p = n.parent;
    if (
      ts.isVariableDeclaration(p) ||
      ts.isParenthesizedExpression(p) ||
      ts.isAsExpression(p) ||
      ts.isCallExpression(p) ||
      ts.isPropertyAssignment(p) ||
      (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(p))
    ) {
      n = p;
      continue;
    }
    break;
  }
  if (n.parent && (ts.isVariableStatement(n.parent) || ts.isExpressionStatement(n.parent) || ts.isExportAssignment(n.parent))) {
    return n.parent;
  }
  return n;
}

function hasLeadingComment(anchor, fullText) {
  const ranges = ts.getLeadingCommentRanges(fullText, anchor.getFullStart());
  return Boolean(ranges && ranges.length > 0);
}

function scanFile(absPath, violations) {
  const text = fs.readFileSync(absPath, "utf8");
  const relPath = rel(absPath);
  const sf = ts.createSourceFile(
    absPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    /\.tsx$/.test(absPath) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node) {
    if (isFunctionLikeWithBody(node)) {
      const startLine = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      const endLine = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      const length = endLine - startLine + 1;
      if (length > LENGTH_THRESHOLD) {
        const anchor = docAnchor(node);
        if (!hasLeadingComment(anchor, text)) {
          violations.push({ file: relPath, name: nameOf(node), line: startLine, length });
        }
      }
      // Do not recurse into a function's body: anything declared inside it is not
      // "outermost", so it is not a separate finding.
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
}

function main() {
  const files = findSourceFiles(SRC);
  const violations = [];
  for (const file of files) {
    scanFile(file, violations);
  }
  violations.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  const result = {
    count: violations.length,
    threshold: LENGTH_THRESHOLD,
    scannedFiles: files.length,
    violations,
  };
  process.stdout.write(JSON.stringify(result));
}

main();
