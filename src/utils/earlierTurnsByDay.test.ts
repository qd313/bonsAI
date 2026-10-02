/**
 * Title: Earlier questions grouped by day: the grouping and the layout
 * Purpose: Pin the day names ("Today", "Yesterday", "Mon 28 Sep", "Earlier"), the Deck's local-day
 * boundary, the order (oldest day first), and which day lines sit in front of which shown question.
 * Used for: earlierTurnsByDay.ts, which MainTabChatTranscript.tsx draws the opened "N earlier" list from.
 * Does not: Draw or walk anything; MainTabChatTranscript.earlierByDay.test.tsx does that.
 */
import { describe, expect, it } from "vitest";

import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { dayLineText, groupEarlierTurnsByDay, layoutEarlierByDay, turnAskedAtMs } from "./earlierTurnsByDay";

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
