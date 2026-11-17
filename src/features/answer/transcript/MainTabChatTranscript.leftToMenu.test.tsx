/**
 * Title: Left out to Steam's menu from the chat's dead ends (plan 105, lane C5)
 * Purpose: Pin what row P105-LEFT-TO-MENU-01 reads on Main, on the real transcript: where bonsAI holds Left (an
 *          answer's sections, the "N earlier" line, a day line, the game buttons' All), the first and second Left in a
 *          row leave the ring where it was and the third puts it on Steam's menu. On "N earlier" with two or more
 *          games, the first and second Left flip the list (so it ends as it was) and the third goes out; Right still
 *          flips; a Left held down flips once and never leaves. A bounded Up walk from the newest answer to the top,
 *          with Steam's scroll modelled three ways, presses Left at every stop: each stop moves the ring inside
 *          bonsAI or reaches Steam's menu within three Lefts, and no stop holds it for ever.
 * Used for: chatTranscriptNavHelpers.ts (the shared hold, the flip), buildAnswerBubbleElement.tsx (the sections),
 *           leftEdge.ts.
 * Does not: Know where Steam's own Left goes beyond a row: steamLeftPress.ts stands Steam's side menu in for
 *           everything outside the plugin, which is where the Deck put the ring from every left edge it measured
 *           (workshop:test-evidence/plan105-P105-M-LEFT-EDGES.json).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";

import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";
import { resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";
import { resetUiDocument } from "../../../shared/dpad/uiDocument";
import { resetEarlierGrouping } from "./useEarlierTurnsPill";
import {
  GAME, LINE, NOW, activate, focusOn, lineEl, nameOf, openEarlier, press, renderChat, seconds, steamScroll, turn,
  type ScrollRule,
} from "../../../test-harness/earlierListTestKit";
import { DIR_RIGHT, hearPress, leftsAt, pressLeft, type LeftResult } from "../../../test-harness/steamLeftPress";

vi.mock("@decky/ui", async () => (await import("../../../test-harness/earlierListNavStub")).deckyUiWithNavNodes());

const about = (game: string, id: string, at: number): AskThreadCollapsedTurn => ({ ...turn(id, `${game} question ${id}`, at), appName: game });
const NEWEST = about("Hades", "n1", seconds(9, 2, 11));
/** Three older Hades questions: one game, so "N earlier" does not flip. */
const ONE_GAME = [about("Hades", "a1", seconds(9, 1, 8)), about("Hades", "a2", seconds(9, 1, 9)), about("Hades", "a3", seconds(9, 2, 8)), NEWEST];
/** Yesterday mixes two games (its open day starts with game buttons); today one more. */
const MIXED = [
  about("Hades", "m1", seconds(9, 1, 8)),
  about("Hollow Knight", "m2", seconds(9, 1, 9)),
  about("Hades", "m3", seconds(9, 1, 10)),
  about("Hollow Knight", "m4", seconds(9, 2, 8)),
  NEWEST,
];
const DAY = "Yesterday · 3";

const world = {
  ring: () => {
    // focus-patterns-allow: these stand-ins move the page's focus as Steam's ring.
    const el = document.activeElement as HTMLElement | null;
    return el && el !== document.body ? el : null;
  },
  move: (el: HTMLElement) => el.focus(),
};

/** Lefts at `stop` until the ring moves or leaves, then back on `stop` (steamLeftPress.ts); Decky's tabindex after. */
function leftsHere(stop: HTMLElement, stamp: () => void): LeftResult[] {
  const out = leftsAt(stop, world);
  stamp();
  return out;
}
const top = (container: HTMLElement) => container.querySelector<HTMLElement>(LINE)!;
const topWords = (container: HTMLElement) => top(container).querySelector(".bonsai-chat-earlier-pill")?.textContent ?? "";
const gameButton = (container: HTMLElement, name: string) =>
  Array.from(container.querySelectorAll<HTMLElement>(GAME)).find((b) => b.querySelector(".bonsai-chat-earlier-game-name")?.textContent === name)!;
const DEAD_END = ["held", "held", "out"];

beforeEach(() => {
  resetUiDocument();
  resetNavFocusRegistry();
  resetEarlierGrouping();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the \"N earlier\" line", () => {
  it("about one game: two Lefts hold and the third reaches Steam's menu", () => {
    const { container, stamp } = renderChat({}, ONE_GAME, null);
    focusOn(top(container));
    expect(leftsHere(top(container), stamp)).toEqual(DEAD_END);
  });

  it("about two games: the first and second Left flip the list, which ends as it was, and the third reaches Steam's menu", () => {
    const { container, stamp } = renderChat({}, MIXED, null);
    const line = top(container);
    focusOn(line);
    expect(topWords(container)).toContain("by day");
    const words: string[] = [];
    for (let i = 0; i < 2; i++) {
      act(() => void pressLeft(world));
      words.push(topWords(container));
    }
    expect(words.map((w) => w.split(" · ")[1])).toEqual(["by game", "by day"]);
    let third: LeftResult = "held";
    act(() => {
      third = pressLeft(world).result;
    });
    expect(third).toBe("out");
    expect(topWords(container)).toContain("by day");
    act(() => line.focus());
    expect(leftsHere(line, stamp)).toEqual(DEAD_END);
  });

  it("a Left held down flips once and never leaves", () => {
    const { container, stamp } = renderChat({}, MIXED, null);
    focusOn(top(container));
    const out: LeftResult[] = [];
    for (let i = 0; i < 20; i++) act(() => void out.push(pressLeft(world, i > 0).result));
    stamp();
    expect(out).toEqual(Array(20).fill("held"));
    expect(topWords(container)).toContain("by game");
  });

  it("Right still flips, and a Right between Lefts starts the run again", () => {
    const { container } = renderChat({}, MIXED, null);
    const line = top(container);
    focusOn(line);
    act(() => void pressLeft(world));
    act(() => void pressLeft(world));
    act(() => {
      hearPress(line, DIR_RIGHT);
      (line as HTMLElement & { __nav?: Record<string, () => unknown> }).__nav?.onMoveRight?.();
    });
    expect(topWords(container)).toContain("by game");
    const after: LeftResult[] = [];
    for (let i = 0; i < 3; i++) act(() => void after.push(pressLeft(world).result));
    expect(after).toEqual(DEAD_END);
  });
});

describe("an open day", () => {
  it("its day line and the game buttons' All hold twice and hand the third Left to Steam; Left from another button moves along the row", () => {
    const { container, stamp } = renderChat({}, MIXED, null);
    openEarlier(container, stamp);
    activate(lineEl(container, DAY));
    stamp();
    const day = lineEl(container, DAY);
    focusOn(day);
    expect(leftsHere(day, stamp)).toEqual(DEAD_END);
    const all = gameButton(container, "All");
    focusOn(all);
    expect(leftsHere(all, stamp)).toEqual(DEAD_END);
    const hades = gameButton(container, "Hades");
    focusOn(hades);
    expect(leftsHere(hades, stamp)).toEqual(["moved"]);
  });
});

describe("a bounded Up walk from the newest answer to the top, with Steam's own scroll modelled", () => {
  it.each<ScrollRule>(["top", "padded", "center"])("under the %s rule: every stop moves the ring or reaches Steam's menu within three Lefts", (rule) => {
    const { container, stamp } = renderChat({}, MIXED, NEWEST.id);
    openEarlier(container, stamp);
    activate(lineEl(container, DAY));
    stamp();
    const scroll = steamScroll(container, rule);
    const sections = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-answer-stop"));
    expect(sections.length).toBeGreaterThan(0);
    focusOn(sections[sections.length - 1]!);
    const visited = new Set<HTMLElement>();
    const outcomes: Array<[string, string]> = [];
    for (let i = 0; i < 40; i++) {
      const here = world.ring()!;
      expect(visited.has(here), `${nameOf(here)} visited twice`).toBe(false);
      visited.add(here);
      outcomes.push([nameOf(here), leftsHere(here, stamp).join(" ")]);
      if (!press(container, "Up", scroll.after) || world.ring() === here) break;
    }
    const said = outcomes.map(([n, o]) => `${n}: ${o}`).join("\n");
    for (const [, o] of outcomes) expect(["moved", "out", "held held out"], said).toContain(o);
    const of = (prefix: string) => outcomes.filter(([n]) => n.startsWith(prefix)).map(([, o]) => o);
    expect(of("answer:"), said).toEqual(Array(sections.length).fill("held held out"));
    expect(of(`line:${DAY}`), said).toEqual(["held held out"]);
    expect(of("game:All"), said).toEqual(["held held out"]);
    expect(outcomes[outcomes.length - 1]![1], said).toBe("held held out");
    expect(topWords(container)).toContain("by day");
  });
});
