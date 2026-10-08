/**
 * Title: Earlier questions grouped by day: the grouping and the layout
 * Purpose: Pin the day names ("Today", "Yesterday", "Mon 28 Sep", "Earlier"), the Deck's local-day
 * boundary, the order (oldest day first), and which day lines sit in front of which shown question.
 * Used for: earlierTurnsByDay.ts, which MainTabChatTranscript.tsx draws the opened "N earlier" list from.
 * Does not: Draw or walk anything; MainTabChatTranscript.earlierByDay.test.tsx does that.
 */
import { describe, expect, it } from "vitest";

import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import {
  dayLineText,
  groupEarlierTurnsByDay,
  layoutEarlierByDay,
  moreLineText,
  turnAskedAtMs,
} from "./earlierTurnsByDay";

const NOW = new Date(2026, 9, 2, 12, 0, 0);
const at = (y: number, m: number, d: number, h = 9, min = 0) => new Date(y, m, d, h, min).getTime() / 1000;

function turn(id: string, createdAt?: number): AskThreadCollapsedTurn {
  return { id, question: `question ${id}`, answer: `answer ${id}`, createdAt };
}

describe("groupEarlierTurnsByDay", () => {
  it("names the days and keeps the oldest first", () => {
    const days = groupEarlierTurnsByDay(
      [turn("a", at(2026, 8, 28)), turn("b", at(2026, 9, 1)), turn("c", at(2026, 9, 2, 8))],
      NOW,
    );
    expect(days.map(dayLineText)).toEqual(["Mon 28 Sep · 1", "Yesterday · 1", "Today · 1"]);
  });

  it("splits at the Deck's local midnight, not at a fixed offset", () => {
    const days = groupEarlierTurnsByDay(
      [turn("late", at(2026, 9, 1, 23, 50)), turn("early", at(2026, 9, 2, 0, 10)), turn("noon", at(2026, 9, 2, 12))],
      NOW,
    );
    expect(days.map(dayLineText)).toEqual(["Yesterday · 1", "Today · 2"]);
  });

  it("adds the year to a day from another year", () => {
    const [day] = groupEarlierTurnsByDay([turn("old", at(2025, 11, 25))], NOW);
    expect(day!.label).toBe("Thu 25 Dec 2025");
  });

  it("counts every question of a day and keeps them in the order they were asked", () => {
    const [day] = groupEarlierTurnsByDay([turn("a", at(2026, 8, 28, 8)), turn("b", at(2026, 8, 28, 9)), turn("c", at(2026, 8, 28, 22))], NOW);
    expect(day!.turns.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(dayLineText(day!)).toBe("Mon 28 Sep · 3");
  });

  it("puts a question with no date under 'Earlier', and reads a session-minted id as its time", () => {
    const minted = turn(`turn-${new Date(2026, 9, 2, 9).getTime()}-4`);
    expect(turnAskedAtMs(minted)).toBe(new Date(2026, 9, 2, 9).getTime());
    expect(turnAskedAtMs(turn("plain"))).toBeNull();
    const days = groupEarlierTurnsByDay([turn("plain"), turn("also"), minted], NOW);
    expect(days.map(dayLineText)).toEqual(["Earlier · 2", "Today · 1"]);
  });
});

describe("layoutEarlierByDay", () => {
  const turns = [
    turn("a1", at(2026, 8, 28)),
    turn("a2", at(2026, 8, 28, 10)),
    turn("b1", at(2026, 9, 1)),
    turn("c1", at(2026, 9, 2, 8)),
    turn("newest", at(2026, 9, 2, 11)),
  ];

  it("with every day closed, shows only the turns after the earlier ones, and lines in front of them", () => {
    const layout = layoutEarlierByDay({ turns, earlierCount: 4, openDays: new Set(), now: NOW });
    expect(layout.shown.map((t) => t.id)).toEqual(["newest"]);
    expect(layout.daysBefore.get("newest")?.map((d) => d.label)).toEqual(["Mon 28 Sep", "Yesterday", "Today"]);
    expect(layout.trailingDays).toEqual([]);
  });

  it("an open day shows its questions right after its own line, before the next day's", () => {
    const layout = layoutEarlierByDay({ turns, earlierCount: 4, openDays: new Set(["2026-10-01"]), now: NOW });
    expect(layout.shown.map((t) => t.id)).toEqual(["b1", "newest"]);
    expect(layout.daysBefore.get("b1")?.map((d) => d.label)).toEqual(["Mon 28 Sep", "Yesterday"]);
    expect(layout.daysBefore.get("newest")?.map((d) => d.label)).toEqual(["Today"]);
  });

  it("with a live turn there is no archived turn after the earlier ones, so the lines trail", () => {
    const layout = layoutEarlierByDay({ turns, earlierCount: 5, openDays: new Set(), now: NOW });
    expect(layout.shown).toEqual([]);
    expect(layout.trailingDays.map((d) => d.label)).toEqual(["Mon 28 Sep", "Yesterday", "Today"]);
  });
});

describe("an open day shows six questions, then six more per press (roadmap: open them a few at a time)", () => {
  /** `n` questions asked today, one a minute from 08:00, then the newest turn after them. */
  function dayOf(n: number): AskThreadCollapsedTurn[] {
    const questions = Array.from({ length: n }, (_, i) => turn(`q${i + 1}`, at(2026, 9, 2, 8, i)));
    return [...questions, turn("newest", at(2026, 9, 2, 11))];
  }
  const TODAY = "2026-10-02";

  /** What is drawn for a day of `n` questions after `presses` presses of "Show N more". */
  function after(n: number, presses: number, open = true) {
    const turns = dayOf(n);
    const layout = layoutEarlierByDay({
      turns,
      earlierCount: n,
      openDays: new Set(open ? [TODAY] : []),
      morePresses: new Map(presses ? [[TODAY, presses]] : []),
      now: NOW,
    });
    const more = [...layout.moreAfter.values()][0];
    return {
      ids: layout.shown.map((t) => t.id).filter((id) => id !== "newest"),
      line: more ? moreLineText(more.add) : null,
      more,
      layout,
    };
  }
  const ids = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `q${from + i}`);

  it.each([
    /* n, closed, opened, after one press, after two presses */
    [1, [], ids(1, 1), null, ids(1, 1), null, ids(1, 1), null],
    [6, [], ids(1, 6), null, ids(1, 6), null, ids(1, 6), null],
    [7, [], ids(1, 6), "Show 1 more", ids(1, 7), null, ids(1, 7), null],
    [13, [], ids(1, 6), "Show 6 more", ids(1, 12), "Show 1 more", ids(1, 13), null],
    [100, [], ids(1, 6), "Show 6 more", ids(1, 12), "Show 6 more", ids(1, 18), "Show 6 more"],
  ] as const)(
    "a day of %i: closed shows %j, opened shows its first six with %j, one press %j with %j, two presses %j with %j",
    (n, closed, opened, openedLine, one, oneLine, two, twoLine) => {
      expect(after(n, 0, false).ids).toEqual([...closed]);
      expect(after(n, 0, false).line).toBeNull();
      expect(after(n, 0).ids).toEqual([...opened]);
      expect(after(n, 0).line).toBe(openedLine);
      expect(after(n, 1).ids).toEqual([...one]);
      expect(after(n, 1).line).toBe(oneLine);
      expect(after(n, 2).ids).toEqual([...two]);
      expect(after(n, 2).line).toBe(twoLine);
    },
  );

  it("a day of none has no day line to open", () => {
    const layout = layoutEarlierByDay({ turns: dayOf(0), earlierCount: 0, openDays: new Set([TODAY]), now: NOW });
    expect(layout.days).toEqual([]);
    expect(layout.moreAfter.size).toBe(0);
  });

  it("the day line still counts every question, however many show", () => {
    expect(dayLineText(after(100, 0).layout.days[0]!)).toBe("Today · 100");
    expect(dayLineText(after(13, 2).layout.days[0]!)).toBe("Today · 13");
  });

  it("the line sits under the last shown question and names the first one the press brings in", () => {
    const { more } = after(13, 1);
    expect(more?.lastShownId).toBe("q12");
    expect(more?.firstNewId).toBe("q13");
    expect(more?.add).toBe(1);
  });

  it("a hundred questions are exhausted in sixteen presses, six at a time, the last adding four", () => {
    let seen = 6;
    let presses = 0;
    for (; presses < 40; presses += 1) {
      const { more, ids: shown } = after(100, presses);
      expect(shown).toHaveLength(seen);
      if (!more) break;
      seen += more.add;
    }
    expect(presses).toBe(16);
    expect(seen).toBe(100);
    expect(after(100, 15).more?.add).toBe(4);
  });

  it("only the open day grows; another open day keeps its own six", () => {
    const turns = [
      ...Array.from({ length: 8 }, (_, i) => turn(`m${i + 1}`, at(2026, 8, 28, 8, i))),
      ...Array.from({ length: 8 }, (_, i) => turn(`t${i + 1}`, at(2026, 9, 2, 8, i))),
      turn("newest", at(2026, 9, 2, 11)),
    ];
    const layout = layoutEarlierByDay({
      turns,
      earlierCount: 16,
      openDays: new Set(["2026-09-28", TODAY]),
      morePresses: new Map([[TODAY, 1]]),
      now: NOW,
    });
    expect(layout.shown.map((t) => t.id)).toEqual([
      ...ids(1, 6).map((id) => id.replace("q", "m")),
      ...ids(1, 8).map((id) => id.replace("q", "t")),
      "newest",
    ]);
    expect([...layout.moreAfter.keys()]).toEqual(["m6"]);
  });
});
