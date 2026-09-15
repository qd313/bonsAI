#!/usr/bin/env node
/**
 * Title: TypeScript comment stripper
 *
 * Purpose: Prints one TypeScript or TSX file with every comment removed and the
 * code itself left in a fixed, predictable form. It exists to answer one
 * question for `scripts/comment_only_check.py`: if you take the comments out of
 * two versions of the same file, is what remains exactly the same? When it is,
 * the only thing that changed between those versions was the explaining.
 *
 * Used for: `scripts/comment_only_check.py`, once per changed front-end file.
 * Nothing else calls it.
 *
 * Solves: Reading a diff by eye to decide whether a "comments only" change
 * really was comments only. That judgement is slow, and it is exactly the kind
 * a person skims when there are ninety files of it.
 *
 * Does not: Type-check, or look at any other file. It reads the one file it is
 * given and prints the result, and never writes anything.
 *
 * Gotchas: The output is not meant to be run or read by a person. It is a
 * fingerprint — only ever compared against another run of this same script.
 */
import ts from "typescript";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/strip_ts_comments.mjs <file.ts|file.tsx>");
  process.exit(2);
}

const source = readFileSync(file, "utf8");

/*
 * removeComments does the real work. The rest of the settings only pin the
 * output down so that two runs over the same code cannot differ for reasons
 * that have nothing to do with comments: no down-levelling, JSX left as it was
 * written, no module rewriting.
 */
const out = ts.transpileModule(source, {
  fileName: file,
  reportDiagnostics: false,
  compilerOptions: {
    removeComments: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.Preserve,
    newLine: ts.NewLineKind.LineFeed,
    isolatedModules: true,
  },
});

/* Blank lines left behind where comments used to be are not a code change. */
process.stdout.write(
  out.outputText
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line !== "")
    .join("\n")
);
