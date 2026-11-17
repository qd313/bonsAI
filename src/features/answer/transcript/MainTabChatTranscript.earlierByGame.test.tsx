/**
 * Title: "N earlier" by game: the game buttons of an open day, and the list flipped to group by game (plan 105, lane A6)
 * Purpose: Pin what the Deck check P105-EARLIER-BY-GAME-01 looks at, on the real transcript: a day that mixes games
 *          opens with a row of buttons (All, its games in the order first asked, No game last, each with its count);
 *          A on one leaves only that game's questions under the day, six at a time, and the ring stays on the button
 *          (a departure from the drawing, which moved it to the first question); under All each row wears its game;
 *          a day of one game opens as before. The D-pad over the row: Down from the day line to the lit button, Down
 *          from a button to the first question's text (else its row), Up back the same way, Left and Right along the
 *          row holding at both ends, B handing the ring to the day line before the row goes. Bounded walks with
 *          Steam's scroll modelled three ways, with the dock where it is and lifted by a running game: no stop
 *          twice, every landing on screen, Up retracing Down. The flip (the drawing's option Wild): Left or Right on
 *          "N earlier" turns "· by day" to "· by game" with the ring kept on the line, the list then one line per game
 *          across every day (No game last), each question wearing its day; only offered when the older questions are
 *          about two or more games; remembered for the plugin's run.
 * Used for: MainTabChatTranscript.tsx, buildEarlierList.tsx, EarlierListLine.tsx, earlierTurnsByDay.ts,
 *           useEarlierTurnsPill.ts and chatTranscriptNavHelpers.ts together.
 * Does not: Model Steam's real geometry for an unclaimed Up or Down (the kit's stop order stands in, as in
 *           MainTabChatTranscript.earlierByDay.test.tsx).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent } from "@testing-library/react";

import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";
import { resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";
import { resetUiDocument } from "../../../shared/dpad/uiDocument";
import { resetEarlierGrouping } from "./useEarlierTurnsPill";
import { buildQuestionBubbleSection } from "./questionBubble";
import {
  DOCK_TOP_IN_GAME, GAME, LINE, NOW, activate, focusOn, isRetry, lineEl, nameOf, openEarlier, press,
  renderChat as renderChatWith, rowTexts, seconds, steamScroll, taken, turn, walk,
  type NavEl, type ScrollRule,
} from "../../../test-harness/earlierListTestKit";

vi.mock("@decky/ui", async () => (await import("../../../test-harness/earlierListNavStub")).deckyUiWithNavNodes());

const asked = (game: string, id: string, question: string, at: number): AskThreadCollapsedTurn => ({ ...turn(id, question, at), appName: game });

/** Monday: two Hades questions (one game). Yesterday: twelve over three games and none. Today: two, then the newest. */
const MONDAY = [asked("Hades", "m1", "monday hades 1", seconds(8, 28, 8)), asked("Hades", "m2", "monday hades 2", seconds(8, 28, 9))];
const YESTERDAY_GAMES = ["Hollow Knight", "Hades", "", "Hollow Knight", "Deep Rock Galactic: Survivor", "Hollow Knight", "Hades", "Hollow Knight", "Hollow Knight", "Hollow Knight", "Hollow Knight", "Hollow Knight"];
const YESTERDAY = YESTERDAY_GAMES.map((game, i) => asked(game, `y${i + 1}`, `yesterday question ${i + 1}`, seconds(9, 1, 8) + i * 60));
const TODAY = [asked("Hollow Knight", "t1", "today question 1", seconds(9, 2, 8)), asked("Hollow Knight", "t2", "today question 2", seconds(9, 2, 9))];
const NEWEST = asked("Hollow Knight", "n1", "what is a good first upgrade in Hollow Knight", seconds(9, 2, 11));
const CHAT = [...MONDAY, ...YESTERDAY, ...TODAY, NEWEST];
const DAY = "Yesterday · 12";
const KNIGHT = ["yesterday question 1", "yesterday question 4", "yesterday question 6", "yesterday question 8", "yesterday question 9", "yesterday question 10"];

const renderChat = (extra: Partial<MainTabChatTranscriptProps> = {}, turns = CHAT, open: string | null = null) => renderChatWith(extra, turns, open);

const buttons = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>(GAME));
const button = (container: HTMLElement, name: string): HTMLElement => {
  const found = buttons(container).find((b) => b.querySelector(".bonsai-chat-earlier-game-name")?.textContent === name);
  if (!found) throw new Error(`no game button "${name}"`);
  return found;
};
const buttonFaces = (container: HTMLElement) =>
  buttons(container).map((b) => `${b.querySelector(".bonsai-chat-earlier-game-name")?.textContent} ${b.querySelector(".bonsai-chat-earlier-game-count")?.textContent}${b.getAttribute("aria-pressed") === "true" ? " (lit)" : ""}`);
const tags = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".bonsai-chat-turn-slot .bonsai-chat-turn-row-header")).map((row) => row.querySelector(".bonsai-chat-turn-row-tag")?.textContent ?? null);
const showLine = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(LINE)).find((el) => el.textContent?.startsWith("Show ")) ?? null;

/** "N earlier" opened and the mixed day opened, with every question closed unless `open` names one. */
function openDay(extra: Partial<MainTabChatTranscriptProps> = {}, open: string | null = null, turns = CHAT, day = DAY) {
  const out = renderChat(extra, turns, open);
  openEarlier(out.container, out.stamp);
  activate(lineEl(out.container, day));
  out.stamp();
  return out;
}
function pick(container: HTMLElement, stamp: () => void, name: string) {
  activate(button(container, name));
  stamp();
}

beforeEach(() => {
  resetUiDocument();
  resetNavFocusRegistry();
  resetEarlierGrouping();
  taken.length = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("an open day that mixes games starts with a row of game buttons", () => {
  it("All, then its games in the order first asked, then No game, each with its count; All is lit", () => {
    const { container } = openDay();
    expect(buttonFaces(container)).toEqual(["All 12 (lit)", "Hollow Knight 8", "Hades 2", "Deep Rock… 1", "No game 1"]);
    /* The row sits right under its day line, before the day's first question. */
    const row = container.querySelector(".bonsai-chat-earlier-games")!;
    expect(row.previousElementSibling).toBe(lineEl(container, DAY));
    expect(row.nextElementSibling?.querySelector(".bonsai-chat-turn-row-header")?.textContent).toContain("yesterday question 1");
  });

  it("under All the day's first six rows each wear their game, and Show 6 more follows", () => {
    const { container } = openDay();
    expect(rowTexts(container).slice(0, 6)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `yesterday question ${n}`));
    expect(tags(container).slice(0, 6)).toEqual(["Hollow Knight", "Hades", "No game", "Hollow Knight", "Deep Rock…", "Hollow Knight"]);
    expect(showLine(container)?.textContent).toContain("Show 6 more");
    /* The newest question, outside the list, wears nothing. */
    expect(tags(container)[tags(container).length - 1]).toBeNull();
  });

  it("A on Hades leaves only the Hades questions under the day, untagged, and the ring stays on that same button", () => {
    const { container, stamp } = openDay();
    const hades = button(container, "Hades");
    focusOn(hades);
    pick(container, stamp, "Hades");
    expect(rowTexts(container)).toEqual(["yesterday question 2", "yesterday question 7", NEWEST.question]);
    expect(tags(container).every((t) => t === null)).toBe(true);
    expect(button(container, "Hades")).toBe(hades);
    expect(document.activeElement).toBe(hades);
    expect(buttonFaces(container)).toContain("Hades 2 (lit)");
    expect(showLine(container)).toBeNull();
    /* The day line still counts the whole day. */
    expect(lineEl(container, DAY).getAttribute("aria-expanded")).toBe("true");
  });

  it("a game of more than six shows six at a time: Show 2 more adds the last two and the ring lands on the first new one", () => {
    const { container, stamp } = openDay();
    pick(container, stamp, "Hollow Knight");
    expect(rowTexts(container).slice(0, 6)).toEqual(KNIGHT);
    const more = showLine(container)!;
    expect(more.textContent).toContain("Show 2 more");
    focusOn(more);
    activate(more);
    stamp();
    expect(rowTexts(container).slice(0, 8)).toEqual([...KNIGHT, "yesterday question 11", "yesterday question 12"]);
    expect(nameOf(document.activeElement)).toBe("row:yesterday question 11");
  });

  it("A on the button that is already lit does nothing: the questions shown stay as they are", () => {
    const { container, stamp } = openDay();
    pick(container, stamp, "Hollow Knight");
    activate(showLine(container)!);
    stamp();
    expect(rowTexts(container)).toHaveLength(9);
    pick(container, stamp, "Hollow Knight");
    expect(rowTexts(container)).toHaveLength(9);
    pick(container, stamp, "All");
    expect(rowTexts(container)).toHaveLength(7);
  });

  it("a day of one game has no buttons and its rows wear no tag, as before", () => {
    const { container } = openDay({}, null, CHAT, "Mon 28 Sep · 2");
    expect(buttons(container)).toEqual([]);
    expect(rowTexts(container)).toEqual(["monday hades 1", "monday hades 2", NEWEST.question]);
    expect(tags(container).every((t) => t === null)).toBe(true);
  });

  it("closing the day forgets the pick: it opens again on All with six", () => {
    const { container, stamp } = openDay();
    pick(container, stamp, "Hades");
    activate(lineEl(container, DAY));
    stamp();
    expect(buttons(container)).toEqual([]);
    activate(lineEl(container, DAY));
    stamp();
    expect(buttonFaces(container)[0]).toBe("All 12 (lit)");
    expect(rowTexts(container)).toHaveLength(7);
  });

  it("picking a game that hides the open older question opens the newest answer again", () => {
    const onTurnActivate = vi.fn();
    const { container, stamp } = openDay({ onTurnActivate }, "y4");
    pick(container, stamp, "Hollow Knight");
    expect(onTurnActivate).not.toHaveBeenCalled();
    pick(container, stamp, "Hades");
    expect(onTurnActivate).toHaveBeenCalledWith("n1");
  });
});

describe("the D-pad over the game buttons", () => {
  it("Down from the open day's line reaches the lit button; Down from it the first question; Up from there comes back to it; Up from it the day line", () => {
    const { container, stamp } = openDay();
    pick(container, stamp, "Hades");
    focusOn(lineEl(container, DAY));
    expect(press(container, "Down")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("game:Hades");
    expect(press(container, "Down")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("row:yesterday question 2");
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("game:Hades");
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe(`line:${DAY}`);
  });

  it("every hop onto and between the buttons is Steam's own transfer onto the button's nav node", () => {
    const { container } = openDay();
    focusOn(lineEl(container, DAY));
    taken.length = 0;
    press(container, "Down");
    press(container, "Right");
    expect(taken.map((el) => nameOf(el))).toEqual(["game:All", "game:Hollow Knight"]);
  });

  it("Left and Right reach every button in order and hold still at both ends", () => {
    const { container } = openDay();
    focusOn(button(container, "All"));
    expect(press(container, "Left")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("game:All");
    const right: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      expect(press(container, "Right")).toBe(true);
      right.push(nameOf(document.activeElement));
    }
    expect(right).toEqual(["game:Hollow Knight", "game:Hades", "game:Deep Rock…", "game:No game", "game:No game", "game:No game"]);
    const left: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      press(container, "Left");
      left.push(nameOf(document.activeElement));
    }
    expect(left).toEqual(["game:Deep Rock…", "game:Hades", "game:Hollow Knight", "game:All"]);
  });

  it("Up and Down leave the row from any button, whichever band a wrap puts it on", () => {
    const { container } = openDay();
    for (const name of ["All", "Hades", "No game"]) {
      focusOn(button(container, name));
      press(container, "Down");
      expect(nameOf(document.activeElement)).toBe("row:yesterday question 1 [Hollow Knight]");
      focusOn(button(container, name));
      press(container, "Up");
      expect(nameOf(document.activeElement)).toBe(`line:${DAY}`);
    }
  });

  it("B on a button puts the ring on that same day line, then closes the day", () => {
    const { container, stamp } = openDay();
    const line = lineEl(container, DAY);
    const hades = button(container, "Hades") as NavEl;
    focusOn(hades);
    act(() => {
      hades.__nav?.onCancelButton?.({ preventDefault: () => {} });
    });
    stamp();
    expect(document.activeElement).toBe(line);
    expect(lineEl(container, DAY)).toBe(line);
    expect(line.getAttribute("aria-expanded")).toBe("false");
    expect(buttons(container)).toEqual([]);
  });

  it("every button hears A and B", () => {
    const { container } = openDay();
    expect(buttons(container)).toHaveLength(5);
    for (const b of buttons(container) as NavEl[]) {
      expect(b.__nav?.onActivate).toBeTypeOf("function");
      expect(b.__nav?.onCancelButton).toBeTypeOf("function");
    }
  });

  it("Down from a button lands on the first question's text, never its Retry, when that question carries Retry", () => {
    /* While a new answer is written, every finished question is an older one, the newest of them may be open
       with Retry, and here it is the first Hollow Knight question of a day that mixes games. */
    const today = [asked("Hades", "t1", "today hades", seconds(9, 2, 8)), asked("Hollow Knight", "t2", "today knight", seconds(9, 2, 9))];
    const { container, stamp } = openDay(
      { askThreadDisplayQuestion: "a live question", isAsking: true },
      "t2",
      [...MONDAY, ...today],
      "Today · 2",
    );
    pick(container, stamp, "Hollow Knight");
    focusOn(button(container, "Hollow Knight"));
    expect(press(container, "Down")).toBe(true);
    expect(isRetry(document.activeElement)).toBe(false);
    expect(nameOf(document.activeElement)).toBe("question:today knight");
  });
});

/*
 * Lane A5 (landed first): a closed question cut short fades at its right edge while the ring is on it. A row wearing
 * this lane's tag must keep that cue, and the fade must sit on the question's words only, never on the tag.
 */
describe("a tagged closed question keeps the cut question's fade, on its words only", () => {
  const LONG = "how do I get past the second phase of the boss without losing all of my health potions";

  it("the ring on it marks the words as cut, never the tag, and the mark goes when the ring leaves", () => {
    const chat = [
      ...MONDAY,
      asked("Hades", "l1", LONG, seconds(9, 1, 8)),
      asked("", "l2", "a short one", seconds(9, 1, 9)),
      NEWEST,
    ];
    const { container } = openDay({}, null, chat, "Yesterday · 2");
    const header = container.querySelector<HTMLElement>('.bonsai-chat-turn-row-header[data-bonsai-turn-id="l1"]')!;
    expect(header.classList.contains("bonsai-chat-turn-row-header--collapsed")).toBe(true);
    const words = header.querySelector(".bonsai-chat-turn-row-title")!;
    const tag = header.querySelector(".bonsai-chat-turn-row-tag")!;
    expect(tag.textContent).toBe("Hades");
    expect(words.contains(tag)).toBe(false);
    /* jsdom has no layout: the words count as cut because the question was cut at 60 letters. */
    fireEvent.focus(header);
    expect(words.getAttribute("data-bonsai-cut")).toBe("true");
    expect(tag.hasAttribute("data-bonsai-cut")).toBe(false);
    fireEvent.blur(header);
    expect(words.hasAttribute("data-bonsai-cut")).toBe(false);
  });

  it("the stylesheet's fade is keyed on the words alone, so the tag beside them is never faded", () => {
    const css = buildQuestionBubbleSection();
    const fade = css.slice(css.lastIndexOf(".bonsai-scope"));
    expect(fade).toContain(".bonsai-chat-turn-row-title[data-bonsai-cut]");
    expect(fade).toContain("mask-image");
    expect(css).not.toContain("bonsai-chat-turn-row-tag");
  });
});

describe("the walk over a day with its game buttons, with Steam's own scroll modelled", () => {
  const CASES = (["top", "padded", "center"] as ScrollRule[]).flatMap((rule) => [
    [rule, 290],
    [rule, DOCK_TOP_IN_GAME],
  ]) as Array<[ScrollRule, number]>;

  it.each(CASES)("under the %s rule with the dock at %i: Down then Up visit the same stops, none twice, all on screen", (rule, dock) => {
    const { container } = openDay();
    const model = steamScroll(container, rule, dock);
    focusOn(container.querySelector<HTMLElement>(LINE)!);
    model.after();
    const seenVisible: boolean[] = [];
    const after = () => {
      model.after();
      seenVisible.push(model.visible(document.activeElement!));
    };
    const down = walk(container, "Down", after);
    expect(down.slice(1)).toEqual([
      "line:Mon 28 Sep · 2",
      `line:${DAY}`,
      "game:All",
      "row:yesterday question 1 [Hollow Knight]",
      "row:yesterday question 2 [Hades]",
      "row:yesterday question 3 [No game]",
      "row:yesterday question 4 [Hollow Knight]",
      "row:yesterday question 5 [Deep Rock…]",
      "row:yesterday question 6 [Hollow Knight]",
      "line:Show 6 more",
      "line:Today · 2",
      `row:${NEWEST.question}`,
    ]);
    expect(new Set(down).size).toBe(down.length);
    const up = walk(container, "Up", after);
    expect(up).toEqual([...down].reverse());
    expect(seenVisible.every(Boolean)).toBe(true);
  });

  it.each(CASES)("with Hollow Knight lit and Show 2 more pressed, under the %s rule with the dock at %i: no stop twice, all on screen", (rule, dock) => {
    const { container, stamp } = openDay();
    pick(container, stamp, "Hollow Knight");
    activate(showLine(container)!);
    stamp();
    const model = steamScroll(container, rule, dock);
    focusOn(lineEl(container, DAY));
    model.after();
    const seenVisible: boolean[] = [];
    const after = () => {
      model.after();
      seenVisible.push(model.visible(document.activeElement!));
    };
    const down = walk(container, "Down", after);
    expect(down).toEqual([
      `line:${DAY}`,
      "game:Hollow Knight",
      ...[...KNIGHT, "yesterday question 11", "yesterday question 12"].map((q) => `row:${q}`),
      "line:Today · 2",
      `row:${NEWEST.question}`,
    ]);
    const up = walk(container, "Up", after);
    expect(up.slice(0, down.length)).toEqual([...down].reverse());
    expect(new Set(up).size).toBe(up.length);
    expect(seenVisible.every(Boolean)).toBe(true);
  });
});

/* ---- The flip: Left or Right on "N earlier" groups the list by game (the drawing's option Wild) ---- */

const top = (container: HTMLElement) => container.querySelector<HTMLElement>(LINE)!;
const topWords = (container: HTMLElement) => top(container).querySelector(".bonsai-chat-earlier-pill")?.textContent;
const lineWords = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(LINE)).map((el) => el.querySelector(".bonsai-chat-earlier-pill")?.textContent ?? "");
/** The chat's games, by game: Hades first (Monday's), then Hollow Knight, Deep Rock, and No game last. */
const GAME_LINES = ["Hades · 4", "Hollow Knight · 10", "Deep Rock Galactic: Survivor · 1", "No game · 1"];

function flip(container: HTMLElement, dir: "Left" | "Right" = "Left") {
  focusOn(top(container));
  expect(press(container, dir)).toBe(true);
}

describe("Left or Right on 'N earlier' flips the list between days and games", () => {
  it("the line names the grouping and ends in ‹ ›; Left and Right flip it, and the ring stays on that same line", () => {
    const { container } = renderChat();
    const line = top(container);
    expect(topWords(container)).toBe("16 earlier · by day");
    expect(line.querySelector(".bonsai-chat-earlier-flip")?.textContent).toBe("‹ ›");
    flip(container, "Left");
    expect(topWords(container)).toBe("16 earlier · by game");
    expect(document.activeElement).toBe(line);
    expect(top(container)).toBe(line);
    flip(container, "Right");
    expect(topWords(container)).toBe("16 earlier · by day");
    expect(document.activeElement).toBe(line);
  });

  it("flipped while open: one line per game across every day, No game last, every line closed, no buttons", () => {
    const { container, stamp } = openDay();
    pick(container, stamp, "Hades");
    flip(container);
    stamp();
    expect(lineWords(container)).toEqual(["16 earlier · by game", ...GAME_LINES]);
    expect(rowTexts(container)).toEqual([NEWEST.question]);
    expect(buttons(container)).toEqual([]);
    expect(top(container).getAttribute("aria-expanded")).toBe("true");
  });

  it("flipped while closed only the words change; opening then shows the game lines", () => {
    const { container, stamp } = renderChat();
    flip(container);
    expect(lineWords(container)).toEqual(["16 earlier · by game"]);
    openEarlier(container, stamp);
    expect(lineWords(container)).toEqual(["16 earlier · by game", ...GAME_LINES]);
  });

  it("a game line opens its questions from every day, oldest first, each wearing its day, six at a time", () => {
    const { container, stamp } = renderChat();
    flip(container);
    openEarlier(container, stamp);
    activate(lineEl(container, "Hollow Knight · 10"));
    stamp();
    expect(rowTexts(container).slice(0, 6)).toEqual(KNIGHT);
    expect(tags(container).slice(0, 6)).toEqual(Array(6).fill("Yesterday"));
    const more = showLine(container)!;
    expect(more.textContent).toContain("Show 4 more");
    focusOn(more);
    activate(more);
    stamp();
    expect(rowTexts(container).slice(6, 10)).toEqual(["yesterday question 11", "yesterday question 12", "today question 1", "today question 2"]);
    expect(tags(container).slice(6, 10)).toEqual(["Yesterday", "Yesterday", "Today", "Today"]);
    expect(nameOf(document.activeElement)).toBe("row:yesterday question 11 [Yesterday]");
    /* Every line still says how many it holds, and the newest question wears nothing. */
    expect(tags(container)[10]).toBeNull();
  });

  it("a game line hears A and B like a day line, and Left on it holds still", () => {
    const { container, stamp } = renderChat();
    flip(container);
    openEarlier(container, stamp);
    const hades = lineEl(container, "Hades · 4") as NavEl;
    activate(hades);
    stamp();
    expect(hades.getAttribute("aria-expanded")).toBe("true");
    focusOn(hades);
    expect(press(container, "Left")).toBe(true);
    expect(document.activeElement).toBe(hades);
    act(() => {
      hades.__nav?.onCancelButton?.({ preventDefault: () => {} });
    });
    expect(hades.getAttribute("aria-expanded")).toBe("false");
  });

  it("flipping while an older answer is open opens the newest answer again", () => {
    const onTurnActivate = vi.fn();
    const { container } = openDay({ onTurnActivate }, "y4");
    flip(container);
    expect(onTurnActivate).toHaveBeenCalledWith("n1");
  });

  it("a chat whose older questions are all one game: no words, no ‹ ›, and Left and Right do what they did", () => {
    const oneGame = [...MONDAY, asked("Hades", "m3", "monday hades 3", seconds(8, 28, 10)), NEWEST];
    const { container } = renderChat({}, oneGame);
    expect(topWords(container)).toBe("3 earlier");
    expect(top(container).querySelector(".bonsai-chat-earlier-flip")).toBeNull();
    focusOn(top(container));
    expect(press(container, "Left")).toBe(true);
    expect(topWords(container)).toBe("3 earlier");
    /* Right was never claimed on this line, and still is not. */
    expect(press(container, "Right")).toBe(false);
  });

  it("the choice is remembered: the Main tab drawn again opens by game, and a one-game chat still by day", () => {
    const first = renderChat();
    flip(first.container);
    first.unmount();
    const again = renderChat();
    expect(topWords(again.container)).toBe("16 earlier · by game");
    again.unmount();
    const oneGame = renderChat({}, [...MONDAY, asked("Hades", "m3", "monday hades 3", seconds(8, 28, 10)), NEWEST]);
    openEarlier(oneGame.container, oneGame.stamp);
    expect(lineWords(oneGame.container)).toEqual(["3 earlier", "Mon 28 Sep · 3"]);
  });
});

describe("the walk over the list grouped by game, with Steam's own scroll modelled", () => {
  const CASES = (["top", "padded", "center"] as ScrollRule[]).flatMap((rule) => [
    [rule, 290],
    [rule, DOCK_TOP_IN_GAME],
  ]) as Array<[ScrollRule, number]>;

  it.each(CASES)("under the %s rule with the dock at %i: Down then Up visit the same stops, none twice, all on screen", (rule, dock) => {
    const { container, stamp } = renderChat();
    flip(container);
    openEarlier(container, stamp);
    activate(lineEl(container, "Hollow Knight · 10"));
    stamp();
    const model = steamScroll(container, rule, dock);
    focusOn(top(container));
    model.after();
    const seenVisible: boolean[] = [];
    const after = () => {
      model.after();
      seenVisible.push(model.visible(document.activeElement!));
    };
    const down = walk(container, "Down", after);
    expect(down).toEqual([
      "line:16 earlier · by game",
      "line:Hades · 4",
      "line:Hollow Knight · 10",
      ...KNIGHT.map((q) => `row:${q} [Yesterday]`),
      "line:Show 4 more",
      "line:Deep Rock Galactic: Survivor · 1",
      "line:No game · 1",
      `row:${NEWEST.question}`,
    ]);
    const up = walk(container, "Up", after);
    expect(up).toEqual([...down].reverse());
    expect(seenVisible.every(Boolean)).toBe(true);
  });
});
