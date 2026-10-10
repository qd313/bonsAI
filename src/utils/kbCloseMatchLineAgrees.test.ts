/**
 * Title: The "No close match" line leaves when a note was used -- unit checks
 * Purpose: Pin what kbCloseMatchLineAgrees.ts cuts and what it leaves alone, on real saved
 *          answers (kbNoteUsedByAnswer.fixtures.json) so the footer shape is the one the back end
 *          really writes.
 * Used for: kbCloseMatchLineAgrees.ts.
 * Does not: Render anything; MainTabChatTranscript.closeMatchLine.test.tsx does that.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { answerWithoutContradictedCloseMatchLine } from "./kbCloseMatchLineAgrees";
import type { KbAttachedNote } from "./inputTransparency";

type Case = { why: string; question: string; answer: string; notes: Partial<KbAttachedNote>[] };
const fixtures = JSON.parse(
  readFileSync(resolve(__dirname, "kbNoteUsedByAnswer.fixtures.json"), "utf-8")
) as Case[];
const byWhy = (start: string) => fixtures.find((c) => c.why.startsWith(start))!;
const LINE = "No close match in my notes";

describe("answerWithoutContradictedCloseMatchLine", () => {
  it("cuts the whole footer, rule line included, when a note was used", () => {
    const c = byWhy("the shotgun question");
    const out = answerWithoutContradictedCloseMatchLine(c.answer, c.question, c.notes as KbAttachedNote[]);
    expect(out).not.toContain(LINE);
    expect(out.endsWith("strategically.")).toBe(true);
    expect(out).not.toMatch(/—\s*$/);
  });

  it("leaves the answer alone when no note was used", () => {
    const c = byWhy("taming a horse");
    expect(answerWithoutContradictedCloseMatchLine(c.answer, c.question, c.notes as KbAttachedNote[])).toBe(c.answer);
  });

  it("leaves an answer with no footer alone", () => {
    const c = byWhy("electrified water");
    expect(answerWithoutContradictedCloseMatchLine(c.answer, c.question, c.notes as KbAttachedNote[])).toBe(c.answer);
  });

  it("leaves it alone when nothing was attached", () => {
    const c = byWhy("the shotgun question");
    expect(answerWithoutContradictedCloseMatchLine(c.answer, c.question, [])).toBe(c.answer);
  });

  it("keeps a different footer that stands before the line", () => {
    const c = byWhy("the shotgun question");
    const body = c.answer.split("\n\n—\n")[0]!;
    const answer = `${body}\n\n—\n*Not in my notes — this answer is from the model's own knowledge.*\n\n—\n*${LINE}, this answer leans on the model's own knowledge.*`;
    const out = answerWithoutContradictedCloseMatchLine(answer, c.question, c.notes as KbAttachedNote[]);
    expect(out).toContain("Not in my notes");
    expect(out).not.toContain(LINE);
  });
});
