/**
 * Title: Did this answer use that note? -- checks against real saved answers
 * Purpose: Pin the rule that decides when the gold "From the notes" block shows (roadmap: "The
 *          gold notes block sits under every answer, used or not"). Every case is a real turn
 *          from the maintainer's own saved chats on the Deck, 2026-09-24 -- question, answer and
 *          the notes the search attached, word for word -- because a rule tuned on invented text
 *          passes its own tests and misses the real shape (lessons-learned, section 2).
 * Used for: kbNoteUsedByAnswer.ts.
 * Does not: Judge whether an answer is right. The shotgun case below is answered with the Gravity
 *           Gun note's facts; the block showing that note is correct, because it is honest about
 *           where the words came from.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { countedWords, kbNotesUsedByAnswer } from "./kbNoteUsedByAnswer";
import type { KbAttachedNote } from "./inputTransparency";

type Case = { source: string; why: string; question: string; answer: string; notes: Partial<KbAttachedNote>[] };

// Read rather than import, as bonsaiSettingsContract.test.ts does: no resolveJsonModule needed.
const fixtures = JSON.parse(
  readFileSync(resolve(__dirname, "kbNoteUsedByAnswer.fixtures.json"), "utf-8")
) as Case[];

function usedNames(c: Case): string[] {
  const notes = c.notes as KbAttachedNote[];
  return kbNotesUsedByAnswer(notes, c.answer, c.question).map((n) => n.name);
}

function byWhy(start: string): Case {
  const hit = (fixtures as Case[]).find((c) => c.why.startsWith(start));
  expect(hit, `no fixture starting "${start}"`).toBeTruthy();
  return hit!;
}

describe("the gold notes block shows only the notes an answer actually used (real saved turns)", () => {
  it("shows the note whose advice the answer repeats, and the one it names, not the one it never touches", () => {
    expect(usedNames(byWhy("Driller upgrades"))).toEqual(["Upgrades and overclocks", "Exploder"]);
  });

  it("shows nothing under an answer none of its notes informed", () => {
    expect(usedNames(byWhy("taming a horse"))).toEqual([]);
    expect(usedNames(byWhy("a crash question that got three Half-Life"))).toEqual([]);
  });

  it("picks the one note an answer followed out of three on the same game", () => {
    expect(usedNames(byWhy("electrified water"))).toEqual(["Crossing the electrified waste pools"]);
  });

  it("counts a boss the answer names from the notes when the question only described it", () => {
    expect(usedNames(byWhy("the boss past the crystal spike area"))).toEqual(["Broken Vessel"]);
  });

  it("does not count a note whose name is just the question's own word", () => {
    expect(usedNames(byWhy("the antlion guard"))).toEqual(["Pheropod (bugbait)"]);
  });

  it("judges shared troubleshooting tips by what they say, never by their one-word topic name", () => {
    const c = byWhy("a crash question with three shared troubleshooting tips");
    const used = kbNotesUsedByAnswer(c.notes as KbAttachedNote[], c.answer, c.question);
    expect(used).toHaveLength(2);
    expect(used.map((n) => n.card).some((card) => /overlay/i.test(card))).toBe(true);
  });

  it("shows the note an answer restated even under the no-close-match footer, whose own words never count", () => {
    const c = byWhy("the shotgun question");
    expect(c.answer).toContain("No close match in my notes");
    expect(usedNames(c)).toEqual(["Gravity Gun"]);
  });

  it("the footer alone cannot make a note count", () => {
    const note = { name: "Knowledge", domain: "strategy", card: "The model leans on close notes and knowledge." } as KbAttachedNote;
    const footerOnly = "Try again later.\n\n—\n*No close match in my notes, this answer leans on the model's own knowledge.*";
    expect(kbNotesUsedByAnswer([note], footerOnly, "anything")).toEqual([]);
  });

  it("shows nothing before any answer text has arrived", () => {
    const c = byWhy("electrified water");
    expect(kbNotesUsedByAnswer(c.notes as KbAttachedNote[], "", c.question)).toEqual([]);
  });

  it("folds plurals and drops everyday words before counting", () => {
    expect([...countedWords("The Antlions attack; an antlion guard")].sort()).toEqual(["antlion", "guard"]);
  });
});
