/**
 * Title: No font size in the source skips the Text size setting
 * Purpose: Read every source file under src/ (not the tests, not the test harness) and fail on a font size
 *          that does not go through `textPx`: an inline `fontSize` that is not `textPx(...)`, or a
 *          stylesheet `font-size` that is a plain number of pixels. A new word added tomorrow at a plain 11
 *          would stay 11 on Large; this catches it the day it is written.
 * Used for: plan 89 S1, Text size changes every word.
 * Solves: The rendered-surface tests (textSizeSurfaces.test.tsx, textSizeEverywhere.test.tsx) only see the
 *         pieces they draw; this sees all of them, including a screen nobody rendered.
 * Does not: Judge whether a size SHOULD scale. The few that stay plain on purpose are listed below with the
 *           reason, and each is a decision someone made, not an oversight.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { findFirstSrcFile, repoRoot } from "../test-harness/repoPaths";

const SRC = join(repoRoot(), "src");

/**
 * Plain on purpose: the file's base name (a list when the file changes name, first found wins), the one
 * kind of line allowed there, and why.
 */
const PLAIN_ON_PURPOSE: Array<{ files: string[]; line: RegExp; why: string }> = [
  { files: ["CharacterRoleplayEmoticon.tsx"], line: /fontSize/, why: "the roleplay character's emoticon is drawn art sized to its own box, like an icon" },
  { files: ["tabIndicatorBarStyles.ts", "tabIndicatorBarStyles.ts"], line: /TAB_BAR_SHOULDER_MARK_PX/, why: "LB and RB: button marks in a fixed-width box, like icons" },
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "test-harness") continue;
      sourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("every font size in the source follows the Text size setting", () => {
  const files = sourceFiles(SRC);

  it("looks at the whole source tree", () => {
    expect(files.length).toBeGreaterThan(300);
  });

  it("has no inline fontSize that skips textPx, and no stylesheet font-size in plain pixels", () => {
    const loose: string[] = [];
    for (const file of files) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (/^\s*(\*|\/\/)/.test(line)) return; // comments
          if (PLAIN_ON_PURPOSE.some((p) => p.files.includes(basename(file)) && p.line.test(line))) return;
          if (/\bfontSize\s*:/.test(line) && !/textPx\(/.test(line)) loose.push(`${rel}:${i + 1}: ${line.trim()}`);
          if (/\bfont-size\s*:/.test(line) && !/textPx\(|calc\(1em \* var\(|:\s*(inherit|[\d.]+em)\b/.test(line)) {
            loose.push(`${rel}:${i + 1}: ${line.trim()}`);
          }
        });
    }
    expect(loose, "a font size that does not follow the Text size setting").toEqual([]);
  });

  it("keeps the plain-on-purpose list honest: each file named in it still has a plain size", () => {
    for (const { files, line } of PLAIN_ON_PURPOSE) {
      const lines = readFileSync(findFirstSrcFile(files), "utf8").split(/\r?\n/);
      expect(lines.some((l) => line.test(l) && /font-?[sS]ize/.test(l)), files[0]).toBe(true);
    }
  });
});
