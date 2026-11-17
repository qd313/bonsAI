/**
 * Title: Earlier questions grouped by game, and a day's game buttons (plan 105, lane A6)
 * Purpose: Pin the pure half of the drawing's options C and Wild (mock-up board, tab 1, round 2): which games a
 * list of older questions holds and in what order ("No game" last, names matched ignoring case), when the list may
 * be flipped (two or more games), which buttons an open day carries (All, its games, No game), what the lit one
 * shows (that game's questions, six at a time), the tag each shown question wears, and where a Search jump finds a
 * question in either grouping.
 * Used for: earlierTurnsByDay.ts.
 * Does not: Draw or walk anything; MainTabChatTranscript.earlierByGame.test.tsx does that.
 */
import { describe, expect, it } from "vitest";

import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";
import {
  ALL_GAMES,
  dayLineText,
  gameChoicesOfDay,
  groupEarlierTurnsByDay,
  groupEarlierTurnsByGame,
  layoutEarlierList,
  locateEarlierTurn,
  moreLineText,
  offersGameGrouping,
} from "./earlierTurnsByDay";

const NOW = new Date(2026, 9, 2, 12, 0, 0);
const at = (m: number, d: number, h = 9, min = 0) => new Date(2026, m, d, h, min).getTime() / 1000;

function turn(id: string, game: string | undefined, createdAt?: number): AskThreadCollapsedTurn {
  return { id, question: `question ${id}`, answer: `answer ${id}`, appName: game, createdAt };
}

/** Saturday mixes three games and no game; Yesterday is Hades alone; then the newest question. */
const SATURDAY: AskThreadCollapsedTurn[] = [
  turn("s1", "Hollow Knight", at(9, 3, 8)),
  turn("s2", "Hades", at(9, 3, 9)),
  turn("s3", "", at(9, 3, 10)),
  turn("s4", "Hollow Knight", at(9, 3, 11)),
  turn("s5", "Deep Rock Galactic: Survivor", at(9, 3, 12)),
  turn("s6", "hollow knight", at(9, 3, 13)),
  turn("s7", "Hades", at(9, 3, 14)),
  turn("s8", "Hollow Knight", at(9, 3, 15)),
  turn("s9", "Hollow Knight", at(9, 3, 16)),
  turn("s10", "Hollow Knight", at(9, 3, 17)),
  turn("s11", "Hollow Knight", at(9, 3, 18)),
  turn("s12", "Hollow Knight", at(9, 3, 19)),
];
const YESTERDAY = [turn("y1", "Hades", at(9, 1, 8)), turn("y2", "Hades", at(9, 1, 9))];
const CHAT = [...SATURDAY, ...YESTERDAY, turn("newest", "Hades", at(9, 2, 11))];
const EARLIER = CHAT.length - 1;
const ids = (turns: AskThreadCollapsedTurn[]) => turns.map((t) => t.id);

describe("grouping by game", () => {
  it("lists the games in the order first asked, No game last, and counts every question under its game", () => {
    const games = groupEarlierTurnsByGame(CHAT.slice(0, EARLIER));
    expect(games.map(dayLineText)).toEqual(["Hollow Knight · 8", "Hades · 4", "Deep Rock Galactic: Survivor · 1", "No game · 1"]);
    expect(ids(games[1]!.turns)).toEqual(["s2", "s7", "y1", "y2"]);
  });

  it("matches names ignoring case and spaces, shows the first spelling, and puts an empty or missing name under No game", () => {
    const games = groupEarlierTurnsByGame([turn("a", "  Hades "), turn("b", "HADES"), turn("c", "  "), turn("d", undefined)]);
    expect(games.map((g) => [g.label, ids(g.turns)])).toEqual([
      ["Hades", ["a", "b"]],
      ["No game", ["c", "d"]],
    ]);
  });

  it("offers the flip only when the older questions are about two or more games, No game counting as one", () => {
    expect(offersGameGrouping(CHAT, EARLIER)).toBe(true);
    expect(offersGameGrouping(YESTERDAY, 2)).toBe(false);
    expect(offersGameGrouping([turn("a", ""), turn("b", undefined)], 2)).toBe(false);
    expect(offersGameGrouping([turn("a", "Hades"), turn("b", "")], 2)).toBe(true);
    /* The newest question is not an earlier one, so it does not count. */
    expect(offersGameGrouping([turn("a", "Hades"), turn("b", "Hades"), turn("c", "Celeste")], 2)).toBe(false);
  });
});

describe("a day's game buttons", () => {
  const [saturday, yesterday] = groupEarlierTurnsByDay(CHAT.slice(0, EARLIER), NOW);

  it("are All first with the day's total, then its games in the order first asked, then No game", () => {
    const choices = gameChoicesOfDay(saturday!);
    expect(choices.map((c) => `${c.name} ${c.count}`)).toEqual([
      "All 12",
      "Hollow Knight 8",
      "Hades 2",
      "Deep Rock… 1",
      "No game 1",
    ]);
    expect(choices.filter((c) => c.picked).map((c) => c.key)).toEqual([ALL_GAMES]);
  });

  it("are none on a day of one game", () => {
    expect(gameChoicesOfDay(yesterday!)).toEqual([]);
  });

  it("light the picked game, and All when the pick is not one the day holds", () => {
    expect(gameChoicesOfDay(saturday!, "game:hades").find((c) => c.picked)?.name).toBe("Hades");
    expect(gameChoicesOfDay(saturday!, "game:celeste").find((c) => c.picked)?.key).toBe(ALL_GAMES);
  });
});

describe("the layout grouped by day, with a game picked", () => {
  const SAT = "2026-10-03";
  const layout = (pick?: string, presses = 0) =>
    layoutEarlierList({
      turns: CHAT,
      earlierCount: EARLIER,
      openDays: new Set([SAT]),
      dayGames: new Map(pick ? [[SAT, pick]] : []),
      morePresses: new Map(presses ? [[SAT, presses]] : []),
      now: NOW,
    });

  it("under All shows the day's first six, each tagged with its game, and keeps the buttons for the day", () => {
    const l = layout();
    expect(ids(l.shown)).toEqual(["s1", "s2", "s3", "s4", "s5", "s6", "newest"]);
    expect(l.tags.get("s2")).toBe("Hades");
    expect(l.tags.get("s3")).toBe("No game");
    expect(l.tags.get("s5")).toBe("Deep Rock…");
    expect(l.tags.has("newest")).toBe(false);
    expect(l.gameChoices.get(SAT)).toHaveLength(5);
    expect(moreLineText(l.moreAfter.get("s6")!.add)).toBe("Show 6 more");
  });

  it("with a game picked shows only that game's questions, untagged, six at a time, and the day line still counts the whole day", () => {
    const l = layout("game:hollow knight");
    expect(ids(l.shown)).toEqual(["s1", "s4", "s6", "s8", "s9", "s10", "newest"]);
    expect(l.tags.size).toBe(0);
    expect(l.moreAfter.get("s10")).toMatchObject({ add: 2, firstNewId: "s11" });
    expect(dayLineText(l.days[0]!)).toBe("Sat 3 Oct · 12");
    expect(ids(layout("game:hollow knight", 1).shown)).toEqual(["s1", "s4", "s6", "s8", "s9", "s10", "s11", "s12", "newest"]);
  });

  it("draws the day lines in front of the right rows: the open day's over its first shown question, the next over the newest", () => {
    const l = layout("game:hades");
    expect(ids(l.shown)).toEqual(["s2", "s7", "newest"]);
    expect(l.daysBefore.get("s2")?.map((d) => d.label)).toEqual(["Sat 3 Oct"]);
    expect(l.daysBefore.get("newest")?.map((d) => d.label)).toEqual(["Yesterday"]);
  });

  it("keeps a day's questions under its own line even when the chat holds them apart", () => {
    const apart = [turn("u1", "Hades"), turn("m1", "Hades", at(8, 28)), turn("u2", "Hades"), turn("newest", "Hades", at(9, 2))];
    const l = layoutEarlierList({ turns: apart, earlierCount: 3, openDays: new Set(["undated"]), now: NOW });
    expect(ids(l.shown)).toEqual(["u1", "u2", "newest"]);
    expect(l.daysBefore.get("u1")?.map((d) => d.label)).toEqual(["Earlier"]);
    expect(l.daysBefore.get("newest")?.map((d) => d.label)).toEqual(["Mon 28 Sep"]);
  });
});

describe("the layout grouped by game", () => {
  const layout = (open: string[], presses = 0) =>
    layoutEarlierList({
      turns: CHAT,
      earlierCount: EARLIER,
      grouping: "game",
      openDays: new Set(open),
      morePresses: new Map(presses ? open.map((k) => [k, presses] as [string, number]) : []),
      now: NOW,
    });

  it("closed, shows one line per game in front of the newest question and no rows", () => {
    const l = layout([]);
    expect(ids(l.shown)).toEqual(["newest"]);
    expect(l.daysBefore.get("newest")?.map(dayLineText)).toEqual([
      "Hollow Knight · 8",
      "Hades · 4",
      "Deep Rock Galactic: Survivor · 1",
      "No game · 1",
    ]);
    expect(l.gameChoices.size).toBe(0);
  });

  it("an open game shows its questions from every day, oldest first, each tagged with its day, six at a time", () => {
    const l = layout(["game:hades"]);
    expect(ids(l.shown)).toEqual(["s2", "s7", "y1", "y2", "newest"]);
    expect(["s2", "s7", "y1"].map((id) => l.tags.get(id))).toEqual(["Sat 3 Oct", "Sat 3 Oct", "Yesterday"]);
    expect(l.daysBefore.get("s2")?.map((d) => d.label)).toEqual(["Hollow Knight", "Hades"]);
    expect(l.daysBefore.get("newest")?.map((d) => d.label)).toEqual(["Deep Rock Galactic: Survivor", "No game"]);
    const knight = layout(["game:hollow knight"]);
    expect(ids(knight.shown)).toEqual(["s1", "s4", "s6", "s8", "s9", "s10", "newest"]);
    expect(knight.moreAfter.get("s10")).toMatchObject({ add: 2, firstNewId: "s11" });
    expect(ids(layout(["game:hollow knight"], 1).shown)).toHaveLength(9);
  });

  it("with a live question after them, the closed lines trail the last row", () => {
    const l = layoutEarlierList({ turns: CHAT, earlierCount: CHAT.length, grouping: "game", openDays: new Set(["game:hades"]), now: NOW });
    expect(ids(l.shown)).toEqual(["s2", "s7", "y1", "y2", "newest"]);
    expect(l.trailingDays.map((d) => d.label)).toEqual(["Deep Rock Galactic: Survivor", "No game"]);
  });
});

describe("where a Search jump finds a question, in either grouping", () => {
  it("by day: its day and the presses counted with All lit", () => {
    expect(locateEarlierTurn(CHAT, EARLIER, "s8", NOW)).toEqual({ dayKey: "2026-10-03", presses: 1 });
  });

  it("by game: its game line and the presses counted within that game", () => {
    expect(locateEarlierTurn(CHAT, EARLIER, "s11", NOW, "game")).toEqual({ dayKey: "game:hollow knight", presses: 1 });
    expect(locateEarlierTurn(CHAT, EARLIER, "y2", NOW, "game")).toEqual({ dayKey: "game:hades", presses: 0 });
    expect(locateEarlierTurn(CHAT, EARLIER, "s3", NOW, "game")).toEqual({ dayKey: "game:", presses: 0 });
    expect(locateEarlierTurn(CHAT, EARLIER, "newest", NOW, "game")).toBeNull();
  });
});
