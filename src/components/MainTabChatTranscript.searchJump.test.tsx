/**
 * Title: A jump from a Search match opens the chat on that question, with a way back (plan 92, lane N3b)
 * Purpose: Pin what the Deck check of block 5 looks at, on the real transcript: a match in a long chat (28
 *          questions over five days, the match on day two, question nine of that day) opens "N earlier", opens
 *          that day, shows enough questions (one "Show N more" press) and puts Steam's ring on the question
 *          through its nav node; a match among the newest questions is reached where it is; the "‹ Back to where
 *          you were" line is the first stop above "N earlier" (Down goes to "N earlier", Up comes back, Up from
 *          it leaves for the tab bar, Left and Right hold still) and a walk over the whole list visits no stop
 *          twice; A on it ends the jump and switches to the Search tab with the word, the game and the match
 *          remembered; and the memory survives the Main tab being thrown away and drawn again (lessons § 3).
 * Used for: searchJumpStore.ts, useEarlierTurnsPill.ts, buildEarlierList.tsx, SearchBackLine.tsx.
 * Does not: Press anything on the Search tab itself (SearchTab.jump.test.tsx does).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { resetUiDocument } from "../utils/uiDocument";
import {
  NOW, LINE, activate, chatProps, focusOn, lines, nameOf, press, renderChat as renderChatWith, rowTexts, seconds, taken, turn, walk,
  type NavEl,
} from "./earlierListTestKit";
import {
  getSearchJump, pendingJumpReveal, registerSearchTabSwitch, resetSearchJump, startSearchJump, peekSearchArrival,
} from "../features/search-tab/searchJumpStore";
import { readSearchSaved, resetSearchSaved } from "../features/search-tab/searchTabStore";

vi.mock("@decky/ui", async () => (await import("./earlierListNavStub")).deckyUiWithNavNodes());

/** 28 questions over five days: 4, 9, 7, 5 and 3 (the last of day five is the newest turn, always on screen). */
const DAY_SIZES = [4, 9, 7, 5, 3];
const TURNS: AskThreadCollapsedTurn[] = DAY_SIZES.flatMap((count, d) =>
  Array.from({ length: count }, (_, i) =>
    turn(`d${d + 1}q${i + 1}`, `day ${d + 1} question ${i + 1} about the mantis`, seconds(8, 20 + d, 6 + i)),
  ),
);
const NEWEST = TURNS[TURNS.length - 1]!.id;

const renderChat = (turns = TURNS) => renderChatWith({}, turns, NEWEST);

const BACK = ".bonsai-search-back-row";

function start(turnId: string, extra: { word?: string; game?: string | null } = {}) {
  startSearchJump({ slotId: "chat-1", turnId, matchKey: `chat:chat-1:${turnId}`, word: extra.word ?? "mantis", game: extra.game ?? null });
}

/** The container the last transfer onto a nav node was asked for, as the words on it. */
const lastTaken = () => taken[taken.length - 1]?.textContent ?? "";

function dayLine(container: HTMLElement, label: string): HTMLElement {
  const found = Array.from(container.querySelectorAll<HTMLElement>(LINE)).find((el) => el.textContent?.includes(label));
  if (!found) throw new Error(`no day line holds "${label}": ${JSON.stringify(lines(container))}`);
  return found;
}

beforeEach(() => {
  resetUiDocument();
  resetNavFocusRegistry();
  resetSearchJump();
  resetSearchSaved();
  taken.length = 0;
  vi.useFakeTimers({ toFake: ["Date", "setTimeout"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the jump into a long chat", () => {
  it("opens N earlier, opens day two, shows question nine and puts the ring on it through its nav node", () => {
    start("d2q9");
    const { container } = renderChat();
    expect(lines(container)[0]).toBe("27 earlier");
    expect(dayLine(container, "· 9").getAttribute("aria-expanded")).toBe("true");
    expect(dayLine(container, "· 4").getAttribute("aria-expanded")).toBe("false");
    /* Six questions show at first; the press of "Show N more" brought the other three. */
    expect(rowTexts(container)).toHaveLength(9);
    expect(rowTexts(container)[8]).toContain("day 2 question 9");
    expect(lastTaken()).toContain("day 2 question 9");
    expect(document.activeElement).not.toBeNull();
    expect(taken[taken.length - 1]!.contains(document.activeElement)).toBe(true);
  });

  it("a question among the first six of its day needs no press, and the other days stay shut", () => {
    start("d3q2");
    const { container } = renderChat();
    expect(rowTexts(container)).toHaveLength(6);
    expect(rowTexts(container)[1]).toContain("day 3 question 2");
    expect(container.textContent).toContain("Show 1 more");
    expect(lastTaken()).toContain("day 3 question 2");
  });

  it("is done once: the jump is no longer waiting, and closing the day afterwards is the person's own choice", () => {
    start("d2q9");
    const { container } = renderChat();
    expect(pendingJumpReveal()).toBeNull();
    expect(getSearchJump()).not.toBeNull();
    activate(dayLine(container, "· 9"));
    expect(dayLine(container, "· 9").getAttribute("aria-expanded")).toBe("false");
    expect(rowTexts(container)).toEqual([]);
  });

  it("among the newest questions the ring goes to it where it is, and N earlier stays closed", () => {
    start(NEWEST);
    const { container } = renderChat();
    expect(lines(container)).toEqual(["27 earlier"]);
    expect(container.querySelector(LINE)!.getAttribute("aria-expanded")).toBe("false");
    expect(lastTaken()).toContain("day 5 question 3");
  });

  it("in a chat too short for an N earlier line, the first question gets the ring and the Back line sits over it", () => {
    start("d1q1");
    const { container } = renderChat(TURNS.slice(0, 2));
    expect(container.querySelector(LINE)).toBeNull();
    expect(lastTaken()).toContain("day 1 question 1");
    const column = container.querySelector(".bonsai-chat-transcript")!;
    expect(column.firstElementChild?.matches(BACK)).toBe(true);
  });

  it("waits for its chat: a question not in the chat yet is revealed when the chat arrives", () => {
    start("d2q9");
    const { container, rerender } = renderChat([]);
    expect(pendingJumpReveal()).not.toBeNull();
    expect(container.querySelector(LINE)).toBeNull();
    rerender(<MainTabChatTranscript {...chatProps({}, TURNS, NEWEST)} />);
    expect(pendingJumpReveal()).toBeNull();
    expect(rowTexts(container)[8]).toContain("day 2 question 9");
    expect(lastTaken()).toContain("day 2 question 9");
  });
});

describe("the Back line", () => {
  it("is the first thing in the transcript, above N earlier, and says where it goes", () => {
    start("d2q9");
    const { container } = renderChat();
    const column = container.querySelector(".bonsai-chat-transcript")!;
    expect(column.firstElementChild?.matches(BACK)).toBe(true);
    expect(column.firstElementChild?.textContent).toBe("‹ Back to where you were");
    expect(column.children[2]!.matches(LINE)).toBe(true);
  });

  it("is not drawn when no jump is live", () => {
    const { container } = renderChat();
    expect(container.querySelector(BACK)).toBeNull();
  });

  it("is not drawn over a chat that does not hold the jump's question", () => {
    start("somewhere-else");
    const { container } = renderChat();
    expect(container.querySelector(BACK)).toBeNull();
  });

  it("Down goes to N earlier, Up from N earlier comes back, and Up from the Back line leaves for the tab bar", () => {
    const tabBar = { current: { TakeFocus: vi.fn(() => true) } };
    registerNavFocus("tab-bar", tabBar);
    start("d2q9");
    const { container } = renderChat();
    focusOn(container.querySelector<HTMLElement>(BACK)!);
    expect(press(container, "Down")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:27 earlier");
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("back");
    expect(tabBar.current.TakeFocus).not.toHaveBeenCalled();
    expect(press(container, "Up")).toBe(true);
    expect(tabBar.current.TakeFocus).toHaveBeenCalledTimes(1);
  });

  it("Left and Right hold still on it, so neither carries the ring out of the plugin", () => {
    start("d2q9");
    const { container } = renderChat();
    const back = container.querySelector<HTMLElement>(BACK)!;
    focusOn(back);
    expect(press(container, "Left")).toBe(true);
    expect(press(container, "Right")).toBe(true);
    expect(document.activeElement).toBe(back);
    expect((back as NavEl).__nav?.onCancelButton).toBeUndefined();
  });

  it("a walk Down over the Back line, N earlier, the days and the open day's questions visits no stop twice, and Up walks it back", () => {
    start("d2q9");
    const { container } = renderChat();
    focusOn(container.querySelector<HTMLElement>(BACK)!);
    const down = walk(container, "Down");
    expect(down.slice(0, 4)).toEqual(["back", "line:27 earlier", expect.stringMatching(/^line:.*· 4$/), expect.stringMatching(/^line:.*· 9$/)]);
    expect(down.filter((n) => n.startsWith("row:"))).toHaveLength(9);
    expect(new Set(down).size).toBe(down.length);
    expect(down.length).toBeGreaterThan(14);
    const up = walk(container, "Up");
    expect(up[up.length - 1]).toBe("back");
    expect(new Set(up).size).toBe(up.length);
  });

  it("in a short chat Down goes to the first question and Up from it comes back to the Back line", () => {
    start("d1q1");
    const { container } = renderChat(TURNS.slice(0, 2));
    focusOn(container.querySelector<HTMLElement>(BACK)!);
    expect(press(container, "Down")).toBe(true);
    expect(nameOf(document.activeElement)).toContain("row:day 1 question 1");
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("back");
  });
});

describe("A on the Back line", () => {
  it("ends the jump, remembers the word and game, and switches to the Search tab with the ring waiting for the match", () => {
    const switched: string[] = [];
    registerSearchTabSwitch((tab) => switched.push(tab));
    start("d2q9", { word: "mantis", game: "Hollow Knight" });
    const { container } = renderChat();
    activate(container.querySelector<HTMLElement>(BACK)!);
    expect(switched).toEqual(["search"]);
    expect(getSearchJump()).toBeNull();
    expect(container.querySelector(BACK)).toBeNull();
    expect(readSearchSaved()).toMatchObject({ typed: "mantis", game: "Hollow Knight" });
    expect(peekSearchArrival()).toEqual({ key: "chat:chat-1:d2q9" });
  });

  it("does nothing when the tab switch is not there, so the line stays", () => {
    start("d2q9");
    const { container } = renderChat();
    activate(container.querySelector<HTMLElement>(BACK)!);
    expect(container.querySelector(BACK)).not.toBeNull();
    expect(getSearchJump()).not.toBeNull();
  });
});

describe("the jump's memory survives the Main tab being drawn again", () => {
  it("the Back line comes back after an unmount and a remount, and still returns to the same match", () => {
    const switched: string[] = [];
    registerSearchTabSwitch((tab) => switched.push(tab));
    start("d2q9", { word: "mantis" });
    const first = renderChat();
    expect(first.container.querySelector(BACK)).not.toBeNull();
    first.unmount();
    const second = renderChat();
    expect(second.container.querySelector(BACK)).not.toBeNull();
    act(() => {
      (second.container.querySelector<HTMLElement>(BACK) as NavEl).__nav?.onActivate?.();
    });
    expect(switched).toEqual(["search"]);
    expect(peekSearchArrival()).toEqual({ key: "chat:chat-1:d2q9" });
  });

  it("a jump started before the Main tab existed is still waiting for it when it is drawn", () => {
    start("d2q9");
    expect(pendingJumpReveal()).toEqual({ slotId: "chat-1", turnId: "d2q9" });
    const { container } = renderChat();
    expect(rowTexts(container)[8]).toContain("day 2 question 9");
  });
});
