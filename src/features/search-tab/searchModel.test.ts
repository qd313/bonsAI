/**
 * Title: The Search tab's rules, tested without a screen
 * Purpose: Pin the word rule (which eight words get a button, and what count they show), the matching
 *          for each of the four groups, the game narrowing, the day label and the spoiler title rule for a
 *          game note. Questions are real-looking ones from a Hollow Knight chat.
 * Used for: searchModel.ts (plan 90 § 3d, plan 92 lane N3).
 * Does not: Draw anything or call the back end.
 */
import { describe, expect, it } from "vitest";

import {
  dayLabel,
  flattenQuestions,
  gameNoteLabel,
  highlightParts,
  matchCountLine,
  matchNotes,
  matchQuestions,
  matchSettings,
  narrowNotes,
  narrowQuestions,
  searchGames,
  searchWords,
  splitSetting,
} from "./searchModel";
import type { GameNote, SearchChat, UserNote } from "./searchTypes";

const QUESTIONS = [
  "What does the Dream Nail do?",
  "Where do I find the Mantis Claw?",
  "How do I beat the False Knight, quick tips please",
  "Which charms are best early on?",
  "Where is the Stag Station in Greenpath?",
  "Is Greenpath safe before I have the Mantis Claw?",
  "Where do I buy more map pieces?",
  "How do I beat the Mantis Lords?",
  "Where is the entrance to Crystal Peak?",
  "What are good early upgrades for the Nail?",
  "Which charm should I use for the Mantis Lords?",
  "Why does the game stutter in Greenpath?",
  "Does the Soul Master drop a charm?",
  "How much battery does Hollow Knight use?",
  "Can I save battery with a frame limit?",
  "How do I get more soul quickly?",
];

describe("the word rule", () => {
  it("picks the eight words in the most questions, counts first, then the alphabet", () => {
    expect(searchWords(QUESTIONS)).toEqual([
      { word: "mantis", count: 4 },
      { word: "charm", count: 3 },
      { word: "greenpath", count: 3 },
      { word: "battery", count: 2 },
      { word: "claw", count: 2 },
      { word: "knight", count: 2 },
      { word: "lords", count: 2 },
      { word: "nail", count: 2 },
    ]);
  });

  it("counts 'charms' with 'charm' when both are there", () => {
    const words = searchWords(["Which charms are best?", "Is this charm good?", "My charm broke"]);
    expect(words).toContainEqual({ word: "charm", count: 3 });
    expect(words.find((w) => w.word === "charms")).toBeUndefined();
  });

  it("keeps a plural on its own when the singular is not there", () => {
    expect(searchWords(["Which charms are best?"]).map((w) => w.word)).toContain("charms");
  });

  it("counts a word once per question however often it is repeated", () => {
    expect(searchWords(["mantis mantis mantis", "mantis"])).toEqual([{ word: "mantis", count: 2 }]);
  });

  it("skips words under four letters and the everyday ones", () => {
    const words = searchWords(["How do I beat the map quick tips please which where find with this"]).map((w) => w.word);
    expect(words).toEqual([]);
  });

  it("takes only the number asked for", () => {
    expect(searchWords(QUESTIONS, 3).map((w) => w.word)).toEqual(["mantis", "charm", "greenpath"]);
  });

  it("gives no words for no questions", () => {
    expect(searchWords([])).toEqual([]);
  });
});

const CHATS: SearchChat[] = [
  {
    slot_id: "a",
    label: "Hollow Knight help",
    updated_at: 1_800_000_000,
    questions: [
      { turn_id: "a1", text: "Where do I find the Mantis Claw?", created_at: 1_799_990_000, app_id: "367520", game_title: "Hollow Knight" },
      { turn_id: "a2", text: "How do I beat the Mantis Lords?", created_at: 1_799_995_000, app_id: "367520", game_title: "Hollow Knight" },
    ],
  },
  {
    slot_id: "b",
    label: "Hades run",
    updated_at: 1_799_000_000,
    questions: [
      { turn_id: "b1", text: "Is the mantis build any good?", created_at: 1_798_000_000, app_id: "1145360", game_title: "Hades" },
      { turn_id: "b2", text: "Why does the game stutter?", created_at: 1_798_100_000, app_id: "", game_title: "" },
    ],
  },
];

describe("the questions", () => {
  const flat = flattenQuestions(CHATS);

  it("lists every question with its chat, in the chats' own order", () => {
    expect(flat.map((q) => q.turnId)).toEqual(["a1", "a2", "b1", "b2"]);
    expect(flat[0]).toMatchObject({ slotId: "a", chatLabel: "Hollow Knight help", gameTitle: "Hollow Knight" });
  });

  it("finds a word in any case, anywhere in the question", () => {
    expect(matchQuestions(flat, "mantis").map((q) => q.turnId)).toEqual(["a1", "a2", "b1"]);
    expect(matchQuestions(flat, "MANTIS")).toHaveLength(3);
    expect(matchQuestions(flat, "lord").map((q) => q.turnId)).toEqual(["a2"]);
    expect(matchQuestions(flat, "")).toEqual([]);
  });

  it("makes the game row from the games the chats mention, the most asked about first", () => {
    expect(searchGames(flat)).toEqual(["Hollow Knight", "Hades"]);
  });

  it("narrows the questions to one game, and All leaves them alone", () => {
    expect(narrowQuestions(flat, null)).toHaveLength(4);
    expect(narrowQuestions(flat, "Hollow Knight").map((q) => q.turnId)).toEqual(["a1", "a2"]);
    expect(narrowQuestions(flat, "hades").map((q) => q.turnId)).toEqual(["b1"]);
    expect(matchQuestions(narrowQuestions(flat, "Hades"), "mantis").map((q) => q.turnId)).toEqual(["b1"]);
  });
});

function note(over: Partial<UserNote>): UserNote {
  return { id: "n-1", text: "x", app_id: "", game_title: "", on: true, created_at: "2026-10-12T03:15:00Z", source_turn_id: "", ...over };
}
const NOTES: UserNote[] = [
  note({ id: "n-3", text: "I'm on a Steel Soul run (one life).", game_title: "Hollow Knight", app_id: "367520" }),
  note({ id: "n-2", text: "Skip the story bits; I've seen them.", game_title: "Hades" }),
  note({ id: "n-1", text: "I play with the back buttons mapped to dash.", on: false }),
];

describe("the notes", () => {
  it("narrows to a game, and keeps the notes for every game", () => {
    expect(narrowNotes(NOTES, null).map((n) => n.id)).toEqual(["n-3", "n-2", "n-1"]);
    expect(narrowNotes(NOTES, "Hollow Knight").map((n) => n.id)).toEqual(["n-3", "n-1"]);
    expect(narrowNotes(NOTES, "hades").map((n) => n.id)).toEqual(["n-2", "n-1"]);
  });

  it("finds a word in a note, switched on or off", () => {
    expect(matchNotes(NOTES, "soul").map((n) => n.id)).toEqual(["n-3"]);
    expect(matchNotes(NOTES, "DASH").map((n) => n.id)).toEqual(["n-1"]);
    expect(matchNotes(NOTES, "mantis")).toEqual([]);
  });
});

describe("the settings", () => {
  it("finds a setting by its name and splits it the way the old card drew it", () => {
    const found = matchSettings("brightness", null);
    expect(found.length).toBeGreaterThan(0);
    const plain = found.find((s) => s.path === "Settings > Display > Brightness")!;
    expect(plain).toMatchObject({ title: "Brightness", breadcrumb: "Settings > Display", qam: false });
  });

  it("splits a Quick Access setting the old way", () => {
    expect(splitSetting("QAM > Performance > Frame rate limit")).toEqual({
      path: "QAM > Performance > Frame rate limit",
      title: "Frame rate limit",
      breadcrumb: "QAM > Performance",
      qam: true,
    });
  });

  it("finds nothing for a word that names no setting, or for one letter", () => {
    expect(matchSettings("mantis", null)).toEqual([]);
    expect(matchSettings("b", null)).toEqual([]);
  });

  it("uses the intent pack's other names, as the card did", () => {
    const index = { aliasSynonym: [{ term: "mantis", target: "Settings > Display > Brightness", kind: "alias" as const }], expansion: [] };
    expect(matchSettings("mantis", index).map((s) => s.path)).toEqual(["Settings > Display > Brightness"]);
  });
});

describe("the game notes", () => {
  const named: GameNote = { name: "Mantis Lords", kind: "boss", game_title: "Hollow Knight", snippet: "Three lords, two at once.", text: "The Mantis Lords...", name_matches: true };
  const unnamed: GameNote = { name: "Sanctum", kind: "boss", game_title: "Hollow Knight", snippet: "The mantis wait here too.", text: "Sanctum...", name_matches: false };
  const help: GameNote = { name: "Stuttering in Proton", kind: "help", game_title: "", snippet: "Try a frame limit.", text: "Help...", name_matches: false };

  it("shows a note whose name holds the word with its name and snippet", () => {
    expect(gameNoteLabel(named)).toEqual({ title: "Mantis Lords", snippet: "Three lords, two at once.", hidden: false });
  });

  it("hides the name and snippet of a note whose name does not hold the word, until A opens it", () => {
    expect(gameNoteLabel(unnamed)).toEqual({ title: "A boss note · Hollow Knight", snippet: "", hidden: true });
  });

  it("says An before a vowel sound and A before the rest, and reads a kind's underscore as a space", () => {
    const kind = (k: string) => gameNoteLabel({ ...unnamed, kind: k }).title;
    expect(kind("item")).toBe("An item note · Hollow Knight");
    expect(kind("area")).toBe("An area note · Hollow Knight");
    expect(kind("encounter")).toBe("An encounter note · Hollow Knight");
    expect(kind("upgrade")).toBe("An upgrade note · Hollow Knight");
    expect(kind("unique item")).toBe("A unique item note · Hollow Knight");
    expect(kind("quest")).toBe("A quest note · Hollow Knight");
    expect(kind("starting_out")).toBe("A starting out note · Hollow Knight");
    expect(kind("  ")).toBe("A game note · Hollow Knight");
  });

  it("calls a note with no game one for every game", () => {
    expect(gameNoteLabel(help).title).toBe("A help note · every game");
  });
});

describe("the small pieces", () => {
  it("splits a line round the word so it can be lit, in any case", () => {
    expect(highlightParts("Where do I find the Mantis Claw?", "mantis")).toEqual([
      { text: "Where do I find the ", hit: false },
      { text: "Mantis", hit: true },
      { text: " Claw?", hit: false },
    ]);
    expect(highlightParts("no match here", "mantis")).toEqual([{ text: "no match here", hit: false }]);
    expect(highlightParts("anything", "")).toEqual([{ text: "anything", hit: false }]);
  });

  it("does not trip on characters that mean something in a pattern", () => {
    expect(highlightParts("a (b) c", "(b)")).toEqual([
      { text: "a ", hit: false },
      { text: "(b)", hit: true },
      { text: " c", hit: false },
    ]);
  });

  it("words the count line", () => {
    expect(matchCountLine(5, "mantis")).toBe("5 matches for “mantis”");
    expect(matchCountLine(1, "mantis")).toBe("1 match for “mantis”");
    expect(matchCountLine(0, "mantis")).toBe("Nothing has “mantis”");
  });

  it("labels the day Today, Yesterday, or the date", () => {
    const now = new Date(2026, 9, 12, 15, 0, 0).getTime();
    const at = (y: number, m: number, d: number) => new Date(y, m, d, 9, 30, 0).getTime() / 1000;
    expect(dayLabel(at(2026, 9, 12), now)).toBe("Today");
    expect(dayLabel(at(2026, 9, 11), now)).toBe("Yesterday");
    expect(dayLabel(at(2026, 9, 5), now)).toBe("Mon 5 Oct");
    expect(dayLabel(0, now)).toBe("");
  });
});
