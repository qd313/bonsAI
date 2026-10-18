/**
 * Title: Opening "N earlier" shows one line per day, and the D-pad walks them both ways (plan 79)
 * Purpose: Pin roadmap Feature "Opening 'N earlier' floods a long chat with rows". On the Deck, opening
 *          the line brought back every earlier question as its own row (42 or 88 in one chat). The
 *          maintainer's pick (2026-10-02, the drawing's option 2, grouped by day): opening it shows one
 *          line per day ("Today · 3"), oldest day first so the newest sits nearest the newest turn,
 *          and each day line opens on its own to show that day's questions as today's rows.
 * Used for: MainTabChatTranscript.tsx, EarlierListLine.tsx, earlierTurnsByDay.ts and
 *           chatTranscriptNavHelpers.ts together -- the real rendered transcript.
 * Solves: Opening the line and counting what is on screen (a handful of day lines, not a row per
 *         question); a day line opening and closing; and bounded Down and Up walks over the earlier
 *         line, three day lines (one opened) and the newest turn, with Steam's own scroll-into-view
 *         modelled in three rules. The walk visits the same stops both ways, none twice, and never
 *         lands on the question's Retry.
 * Does not: Model Steam's real geometry choice for an unclaimed Up or Down; that is the stop-order
 *           stand-in the Retry walk (MainTabChatTranscript.retryNotAStop.test.tsx) already uses.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";

import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";
import { registerNavFocus, resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";
import { resetUiDocument } from "../../../shared/dpad/uiDocument";
import {
  NOW, ROW, LINE, activate, focusOn, isRetry, lineEl, lines, nameOf, openEarlier,
  press, renderChat as renderChatWith, rowTexts, seconds, steamScroll, turn, walk,
  type NavEl, type ScrollRule,
} from "../../../test-harness/earlierListTestKit";
import { chipRowExitUp } from "../../preset-carousel/presetRowFocusNav";

vi.mock("@decky/ui", async () => (await import("../../../test-harness/earlierListNavStub")).deckyUiWithNavNodes());

/** Five questions on Monday, three yesterday, three today, then the newest (also today). */
const TURNS: AskThreadCollapsedTurn[] = [
  ...[1, 2, 3, 4, 5].map((n) => turn(`m${n}`, `monday question ${n}`, seconds(8, 28, 8 + n))),
  ...[1, 2, 3].map((n) => turn(`y${n}`, `yesterday question ${n}`, seconds(9, 1, 8 + n))),
  ...[1, 2, 3].map((n) => turn(`d${n}`, `today question ${n}`, seconds(9, 2, 6 + n))),
  turn("n1", "what is a good first upgrade in Hollow Knight", seconds(9, 2, 11), true),
];

const renderChat = (extra: Partial<MainTabChatTranscriptProps> = {}, turns = TURNS, open: string | null = "n1") =>
  renderChatWith(extra, turns, open);


describe('"N earlier" opens as one line per day (plan 79)', () => {
  beforeEach(() => {
    resetUiDocument();
    resetNavFocusRegistry();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("closed, the page shows only the line and the newest turn", () => {
    const { container } = renderChat();
    expect(lines(container)).toEqual(["11 earlier"]);
    expect(rowTexts(container)).toEqual([]);
  });

  it("opening it shows a line per day, oldest first, and no row per question", () => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    expect(lines(container)).toEqual(["11 earlier", "Mon 28 Sep · 5", "Yesterday · 3", "Today · 3"]);
    /* Eleven earlier questions, none of them drawn as a row yet. */
    expect(rowTexts(container)).toEqual([]);
    expect(container.querySelectorAll(".bonsai-chat-turn-slot")).toHaveLength(1);
    expect(container.textContent).toContain("what is a good first upgrade in Hollow Knight");
  });

  it("a day line opens on its own to that day's questions, and closes again", () => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    activate(lineEl(container, "Yesterday · 3"));
    stamp();
    expect(rowTexts(container)).toEqual(["yesterday question 1", "yesterday question 2", "yesterday question 3"]);
    expect(lineEl(container, "Yesterday · 3").getAttribute("aria-expanded")).toBe("true");
    expect(lineEl(container, "Today · 3").getAttribute("aria-expanded")).toBe("false");
    /* The questions sit right under their own day line, before the next day's line. */
    const order = Array.from(container.querySelectorAll(`${LINE}, ${ROW}`)).map((el) =>
      el.matches(LINE) ? `line:${el.querySelector(".bonsai-chat-earlier-pill")?.textContent}` : `row:${el.textContent}`,
    );
    expect(order).toEqual([
      "line:11 earlier",
      "line:Mon 28 Sep · 5",
      "line:Yesterday · 3",
      "row:yesterday question 1",
      "row:yesterday question 2",
      "row:yesterday question 3",
      "line:Today · 3",
    ]);

    activate(lineEl(container, "Yesterday · 3"));
    stamp();
    expect(rowTexts(container)).toEqual([]);
  });

  it("B closes an open day line and is not claimed by a closed one", () => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    expect((lineEl(container, "Today · 3") as NavEl).__nav?.onCancelButton).toBeUndefined();
    activate(lineEl(container, "Today · 3"));
    stamp();
    expect(rowTexts(container)).toHaveLength(3);
    const open = lineEl(container, "Today · 3") as NavEl;
    expect(open.__nav?.onCancelButton).toBeTypeOf("function");
    act(() => {
      open.__nav?.onCancelButton?.({ preventDefault: () => {} });
    });
    expect(rowTexts(container)).toEqual([]);
  });

  it("closing the day that holds the open question opens the newest answer again", () => {
    const onTurnActivate = vi.fn();
    const { container, stamp } = renderChat({ onTurnActivate }, TURNS, "y2");
    openEarlier(container, stamp);
    activate(lineEl(container, "Yesterday · 3"));
    stamp();
    expect(onTurnActivate).not.toHaveBeenCalled();
    activate(lineEl(container, "Yesterday · 3"));
    expect(onTurnActivate).toHaveBeenCalledWith("n1");
  });

  it("a question with no saved date goes under 'Earlier'; one minted this session goes under its own day", () => {
    const minted = turn(`turn-${new Date(2026, 9, 2, 9).getTime()}-3`, "asked a moment ago");
    const undated = turn("old1", "from before dates were kept");
    const { container, stamp } = renderChat({}, [undated, turn("old2", "also undated"), minted, TURNS[11]!], "n1");
    openEarlier(container, stamp);
    expect(lines(container)).toEqual(["3 earlier", "Earlier · 2", "Today · 1"]);
  });

  it("a short chat with one earlier question has no line at all", () => {
    const { container } = renderChat({}, [TURNS[0]!, TURNS[11]!]);
    expect(container.querySelector(LINE)).toBeNull();
    expect(rowTexts(container)).toEqual(["monday question 1"]);
  });
});

describe("the D-pad over the opened list (plan 79)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetNavFocusRegistry();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("Down walks line, three day lines (Yesterday open) and the newest turn; Up walks the same stops back; Retry is never a landing", () => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    activate(lineEl(container, "Yesterday · 3"));
    stamp();
    focusOn(lineEl(container, "11 earlier"));

    const down = walk(container, "Down");
    expect(down.slice(0, 8)).toEqual([
      "line:11 earlier",
      "line:Mon 28 Sep · 5",
      "line:Yesterday · 3",
      "row:yesterday question 1",
      "row:yesterday question 2",
      "row:yesterday question 3",
      "line:Today · 3",
      "question:what is a good first upgrade in Hollow Knight",
    ]);
    expect(down).not.toContain("RETRY");
    expect(new Set(down).size).toBe(down.length);
    expect(down.length).toBeGreaterThan(9);

    const up = walk(container, "Up");
    expect(up).not.toContain("RETRY");
    expect(new Set(up).size).toBe(up.length);
    expect(up[up.length - 1]).toBe("line:11 earlier");
    /* The stops Down visited, in reverse, back to the line: Up skips nothing Down stopped on. */
    expect(up).toEqual([...down.slice(0, down.indexOf(up[0]!) + 1)].reverse());
  });

  it("Down from the Today line lands on the question text, not Retry, and Up comes back to the line", () => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    focusOn(lineEl(container, "Today · 3"));
    expect(press(container, "Down")).toBe(true);
    expect(isRetry(document.activeElement)).toBe(false);
    expect(nameOf(document.activeElement)).toBe("question:what is a good first upgrade in Hollow Knight");
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Today · 3");
  });

  it("Down from the last question of an opened day goes to the next day line, and Up goes back to that question", () => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    activate(lineEl(container, "Yesterday · 3"));
    stamp();
    const rows = container.querySelectorAll<HTMLElement>(`.bonsai-chat-turn-slot ${ROW}`);
    focusOn(rows[2]!);
    expect(press(container, "Down")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Today · 3");
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("row:yesterday question 3");
  });

  it("Up from the first question of an opened day is its day line, not the tab bar above the chat", () => {
    const slotRow = { current: { TakeFocus: vi.fn(() => true) } };
    registerNavFocus("tab-bar", slotRow);
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    activate(lineEl(container, "Mon 28 Sep · 5"));
    stamp();
    focusOn(container.querySelector<HTMLElement>(`.bonsai-chat-turn-slot ${ROW}`)!);
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Mon 28 Sep · 5");
    expect(slotRow.current.TakeFocus).not.toHaveBeenCalled();
  });

  it("Up from the 'N earlier' line takes the tab bar above the chat (the saved-chats row is gone), opened or closed", () => {
    const slotRow = { current: { TakeFocus: vi.fn(() => true) } };
    registerNavFocus("tab-bar", slotRow);
    const { container, stamp } = renderChat();
    focusOn(container.querySelector<HTMLElement>(LINE)!);
    expect(press(container, "Up")).toBe(true);
    expect(slotRow.current.TakeFocus).toHaveBeenCalledTimes(1);
    openEarlier(container, stamp);
    focusOn(container.querySelector<HTMLElement>(LINE)!);
    expect(press(container, "Up")).toBe(true);
    expect(slotRow.current.TakeFocus).toHaveBeenCalledTimes(2);
  });

  it("Left on a day line holds still, so it cannot throw the ring out of the plugin", () => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    focusOn(lineEl(container, "Yesterday · 3"));
    expect(press(container, "Left")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Yesterday · 3");
  });
});

describe("A or B on a line keeps Steam's ring on that same line (plan 79)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetNavFocusRegistry();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  /* The Deck found the ring owned by nothing after A or B on a day line (plan79-P79-EARLIER-BY-DAY.json):
     the line was a different element afterwards, so the one that held the ring was gone and the next
     press only put it back. Here: the very element that held it still holds it, and Down moves. */
  function stillTheSameLine(container: HTMLElement, line: HTMLElement, text: string): void {
    expect(lineEl(container, text)).toBe(line);
    expect(line.isConnected).toBe(true);
    expect(document.activeElement).toBe(line);
  }

  const days = ["Mon 28 Sep · 5", "Yesterday · 3", "Today · 3"];

  it.each(days)("A opens and A closes %s without the ring leaving it, and the next Down moves", (text) => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    const line = lineEl(container, text);
    focusOn(line);
    activate(line);
    stamp();
    stillTheSameLine(container, line, text);
    expect(press(container, "Down")).toBe(true);
    expect(document.activeElement).not.toBe(line);
    focusOn(line);
    activate(line);
    stamp();
    stillTheSameLine(container, line, text);
    expect(press(container, "Down")).toBe(true);
    expect(document.activeElement).not.toBe(line);
  });

  it.each(days)("B closes an open %s without the ring leaving it, and the next Up moves", (text) => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    activate(lineEl(container, text));
    stamp();
    const line = lineEl(container, text);
    focusOn(line);
    act(() => {
      (line as NavEl).__nav?.onCancelButton?.({ preventDefault: () => {} });
    });
    stamp();
    stillTheSameLine(container, line, text);
    expect(press(container, "Up")).toBe(true);
    expect(document.activeElement).not.toBe(line);
  });

  it("the 'N earlier' line keeps the ring through A to open it, A to close it, and B", () => {
    const { container, stamp } = renderChat();
    const line = lineEl(container, "11 earlier");
    focusOn(line);
    activate(line);
    stamp();
    stillTheSameLine(container, line, "11 earlier");
    activate(line);
    stamp();
    stillTheSameLine(container, line, "11 earlier");
    activate(line);
    stamp();
    act(() => {
      (lineEl(container, "11 earlier") as NavEl).__nav?.onCancelButton?.({ preventDefault: () => {} });
    });
    stillTheSameLine(container, line, "11 earlier");
  });

  it("with a live question the day lines trail the rows, and they keep the ring too", () => {
    const { container, stamp } = renderChat(
      { askThreadDisplayQuestion: "a live question", isAsking: true },
      TURNS.slice(0, 11),
      "live",
    );
    openEarlier(container, stamp);
    const line = lineEl(container, "Today · 3");
    focusOn(line);
    activate(line);
    stamp();
    stillTheSameLine(container, line, "Today · 3");
    activate(line);
    stamp();
    stillTheSameLine(container, line, "Today · 3");
  });
});

describe("Up from the open question's text goes to whatever is drawn right over its row (plan 79)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetNavFocusRegistry();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  function questionText(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>(".bonsai-chat-turn-row-body")!;
  }

  it("lands on the day line right over the question, not the 'N earlier' line and not Retry", () => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    focusOn(questionText(container));
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Today · 3");
    /* Each line has a node of its own: the next one up is not the line the first Up came from. */
    activate(lineEl(container, "Yesterday · 3"));
    stamp();
    focusOn(questionText(container));
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Today · 3");
  });

  it("lands on the day line over it whichever day is last, with the days in different states", () => {
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    activate(lineEl(container, "Mon 28 Sep · 5"));
    activate(lineEl(container, "Yesterday · 3"));
    activate(lineEl(container, "Today · 3"));
    stamp();
    /* Today is open now, so the question just under it is the closed row of today question 3. */
    focusOn(questionText(container));
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("row:today question 3");
    expect(isRetry(document.activeElement)).toBe(false);
  });

  it("lands on the 'N earlier' line when it is closed, and on the tab bar above the chat when no line is drawn", () => {
    const slotRow = { current: { TakeFocus: vi.fn(() => true) } };
    registerNavFocus("tab-bar", slotRow);
    const closed = renderChat();
    focusOn(questionText(closed.container));
    expect(press(closed.container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:11 earlier");
    cleanup();
    const short = renderChat({}, [TURNS[11]!], "n1");
    focusOn(questionText(short.container));
    expect(press(short.container, "Up")).toBe(true);
    expect(slotRow.current.TakeFocus).toHaveBeenCalledTimes(1);
  });

  it("the live question's Up goes to the day line over it too", () => {
    const { container, stamp } = renderChat(
      { askThreadDisplayQuestion: "a live question", isAsking: true, onRetryLastResponse: () => {} },
      TURNS.slice(0, 11),
      "live",
    );
    openEarlier(container, stamp);
    focusOn(questionText(container));
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Today · 3");
  });
});

describe("the walk with Steam's own scroll modelled (plan 79)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetNavFocusRegistry();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const RULES: ScrollRule[] = ["top", "padded", "center"];

  it.each(RULES)(
    "under the %s rule every landing ends wholly on screen and Down then Up visits the same stops, none twice",
    (rule) => {
      /* Every question closed, so the whole list is lines and one-line rows. */
      const { container, stamp } = renderChat({}, TURNS, null);
      openEarlier(container, stamp);
      activate(lineEl(container, "Yesterday · 3"));
      activate(lineEl(container, "Today · 3"));
      stamp();
      const model = steamScroll(container, rule);
      focusOn(lineEl(container, "11 earlier"));
      model.after();

      const seenVisible: boolean[] = [];
      const after = () => {
        model.after();
        seenVisible.push(model.visible(document.activeElement!));
      };
      const down = walk(container, "Down", after);
      /* Line, Mon, Yesterday + its 3, Today + its 3, the newest question: eleven stops, none twice. */
      expect(down).toHaveLength(11);
      expect(new Set(down).size).toBe(down.length);
      expect(down[down.length - 1]).toBe("row:what is a good first upgrade in Hollow Knight");
      const up = walk(container, "Up", after);
      expect(up).toEqual([...down].reverse());
      expect(seenVisible.every(Boolean)).toBe(true);
    },
  );
});

/*
 * Plan 79 helper AC, bug 2 (helper Y, 2026-10-02; roadmap "With 'N earlier' opened, Up from the chip row
 * jumps to the open turn at the top", plan79-ONBUTTONDOWN-AUDIT-01.json): with the newest question closed
 * and an older one open, Up from the suggestion chip (and so from the question box, whose Up goes through
 * the chip) landed on the open older question's Show details. The exit asked for the newest reply's bottom
 * row, and Show details is found by name, not by turn, so it found the older one, skipping the day lines
 * and the newest question that Down visits one by one. The chip's Up is `chipRowExitUp`, called here as
 * Steam calls the chip's own onMoveUp; past that the walk is this file's Steam model.
 */
describe("Up from the chip with the newest question closed and an older one open (plan 79)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetNavFocusRegistry();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  /** Yesterday's day opened and its second question open; Monday and Today closed; the newest closed. */
  function olderOpen() {
    const out = renderChat({}, TURNS, "y2");
    openEarlier(out.container, out.stamp);
    activate(lineEl(out.container, "Yesterday · 3"));
    out.stamp();
    return out;
  }

  it("the chip's Up lands on the newest question's row, not on the open older question's Show details", () => {
    olderOpen();
    let handled = false;
    act(() => {
      handled = chipRowExitUp();
    });
    expect(handled).toBe(true);
    expect(nameOf(document.activeElement)).toBe("row:what is a good first upgrade in Hollow Knight");
  });

  it.each(["top", "padded", "center"] as ScrollRule[])(
    "under the %s rule, Up press by press from the chip visits the stops Down visits from the line, in reverse",
    (rule) => {
      const { container } = olderOpen();
      const model = steamScroll(container, rule);
      focusOn(lineEl(container, "11 earlier"));
      model.after();
      const down = walk(container, "Down", model.after);
      if (process.env.WALK_DEBUG) console.log("DOWN", rule, down.join(" > "));
      expect(down[down.length - 1]).toBe("row:what is a good first upgrade in Hollow Knight");
      expect(down).toContain("line:Today · 3");
      expect(new Set(down).size).toBe(down.length);

      act(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
      act(() => {
        chipRowExitUp();
      });
      model.after();
      const up = walk(container, "Up", model.after);
      expect(new Set(up).size).toBe(up.length);
      expect(up).toEqual([...down].reverse());
    },
  );
});

/*
 * Open them a few at a time (roadmap, Bugs: "A day line in the 'N earlier' list opens all of that day's
 * questions at once"). A day line shows the day's first six questions; a "Show N more" line at the end of
 * the group adds the next six under them and puts the ring on the first new question; closing the day or
 * the whole list starts it over at six. Rendered through the real transcript, D-pad by D-pad.
 */
describe("a day opens six questions at a time (Show N more)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetNavFocusRegistry();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  /** `n` questions on Monday 28 Sep, one a minute from 08:00. */
  const monday = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      turn(`m${i + 1}`, `monday question ${i + 1}`, new Date(2026, 8, 28, 8, i).getTime() / 1000),
    );
  /** Monday's `n`, then Yesterday's three, then the newest question (today). */
  const chat = (n: number) => [...monday(n), ...TURNS.slice(5, 8), TURNS[11]!];
  const dayText = (n: number) => `Mon 28 Sep · ${n}`;
  const mondayRows = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => `monday question ${from + i}`);
  const NEWEST = "what is a good first upgrade in Hollow Knight";

  function openDay(n: number, open: string | null = "n1", turns = chat(n)) {
    const out = renderChat({}, turns, open);
    openEarlier(out.container, out.stamp);
    activate(lineEl(out.container, dayText(n)));
    out.stamp();
    return out;
  }
  const showLine = (container: HTMLElement) => lines(container).find((text) => text.startsWith("Show ")) ?? null;
  const showLineEl = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>(LINE)).find((el) => el.textContent?.startsWith("Show "))!;
  const pressShowMore = (container: HTMLElement, stamp: () => void) => {
    const line = showLineEl(container);
    focusOn(line);
    activate(line);
    stamp();
  };

  it.each([
    [1, 1, null],
    [6, 6, null],
    [7, 6, "Show 1 more"],
    [13, 6, "Show 6 more"],
    [100, 6, "Show 6 more"],
  ] as const)("a day of %i opens to %i rows with the line %j", (n, rows, line) => {
    const { container } = openDay(n);
    expect(rowTexts(container)).toEqual(mondayRows(1, rows));
    expect(showLine(container)).toBe(line);
    /* The day line's own text still counts every question of the day. */
    expect(lines(container)).toContain(dayText(n));
  });

  it("A on the line adds the next questions under the ones shown, the ring lands on the first new one, and the line goes when nothing is left", () => {
    const { container, stamp } = openDay(13);
    expect(rowTexts(container)).toHaveLength(6);

    pressShowMore(container, stamp);
    expect(rowTexts(container)).toEqual(mondayRows(1, 12));
    expect(showLine(container)).toBe("Show 1 more");
    expect(nameOf(document.activeElement)).toBe("row:monday question 7");

    pressShowMore(container, stamp);
    expect(rowTexts(container)).toEqual(mondayRows(1, 13));
    expect(showLine(container)).toBeNull();
    expect(nameOf(document.activeElement)).toBe("row:monday question 13");
    /* Still in the order they were asked, under the day line and before the next day's. */
    const order = Array.from(container.querySelectorAll(`${LINE}, ${ROW}`)).map((el) =>
      el.matches(LINE) ? `line:${el.querySelector(".bonsai-chat-earlier-pill")?.textContent}` : "row",
    );
    expect(order).toEqual(["line:16 earlier", `line:${dayText(13)}`, ...Array(13).fill("row"), "line:Yesterday · 3"]);
  });

  it("the new line leaves B to Steam, as a question row does, and is not an open-or-closed line", () => {
    const { container } = openDay(13);
    const line = lineEl(container, "Show 6 more") as NavEl;
    expect(line.__nav?.onCancelButton).toBeUndefined();
    expect(line.getAttribute("aria-expanded")).toBeNull();
    expect(line.querySelector(".bonsai-chat-earlier-chev")).toBeNull();
    expect(line.__nav?.onActivate).toBeTypeOf("function");
  });

  it("closing the day with A or with B starts it over at six when it opens again", () => {
    const { container, stamp } = openDay(13);
    pressShowMore(container, stamp);
    expect(rowTexts(container)).toHaveLength(12);

    activate(lineEl(container, dayText(13)));
    stamp();
    expect(rowTexts(container)).toEqual([]);
    expect(showLine(container)).toBeNull();
    activate(lineEl(container, dayText(13)));
    stamp();
    expect(rowTexts(container)).toEqual(mondayRows(1, 6));
    expect(showLine(container)).toBe("Show 6 more");

    pressShowMore(container, stamp);
    act(() => {
      (lineEl(container, dayText(13)) as NavEl).__nav?.onCancelButton?.({ preventDefault: () => {} });
    });
    stamp();
    expect(rowTexts(container)).toEqual([]);
    activate(lineEl(container, dayText(13)));
    stamp();
    expect(rowTexts(container)).toEqual(mondayRows(1, 6));
  });

  it("closing 'N earlier' starts every day over at six, and a hundred questions come six at a time", () => {
    const { container, stamp } = openDay(100);
    pressShowMore(container, stamp);
    pressShowMore(container, stamp);
    pressShowMore(container, stamp);
    expect(rowTexts(container)).toHaveLength(24);
    expect(showLine(container)).toBe("Show 6 more");

    activate(lineEl(container, "103 earlier"));
    stamp();
    expect(lines(container)).toEqual(["103 earlier"]);
    activate(lineEl(container, "103 earlier"));
    stamp();
    activate(lineEl(container, dayText(100)));
    stamp();
    expect(rowTexts(container)).toEqual(mondayRows(1, 6));
    expect(showLine(container)).toBe("Show 6 more");
  });

  it("closing a day while the open question sits in a part brought in by Show N more opens the newest answer again", () => {
    const onTurnActivate = vi.fn();
    const out = renderChat({ onTurnActivate }, chat(13), "m9");
    openEarlier(out.container, out.stamp);
    activate(lineEl(out.container, dayText(13)));
    out.stamp();
    /* The newest question is closed here, so its row counts too. */
    expect(rowTexts(out.container)).toHaveLength(7);
    pressShowMore(out.container, out.stamp);
    expect(rowTexts(out.container)).toHaveLength(13);
    activate(lineEl(out.container, dayText(13)));
    expect(onTurnActivate).toHaveBeenCalledWith("n1");
  });

  it("Down from the day line walks its six questions, the new line, then the next day line; Up walks it back", () => {
    const { container } = openDay(13, null);
    focusOn(lineEl(container, dayText(13)));
    const down = walk(container, "Down");
    expect(down.slice(0, 11)).toEqual([
      `line:${dayText(13)}`,
      ...mondayRows(1, 6).map((q) => `row:${q}`),
      "line:Show 6 more",
      "line:Yesterday · 3",
      `row:${NEWEST}`,
    ].slice(0, 11));
    expect(down).not.toContain("RETRY");
    expect(new Set(down).size).toBe(down.length);
    const up = walk(container, "Up");
    expect(up).toEqual([...[...down].reverse(), "line:16 earlier"]);
  });

  it("Down from the new line goes to the question under it, not its Retry, and Up from there comes back to the line", () => {
    const { container } = openDay(7, "n1", [...monday(7), TURNS[11]!]);
    focusOn(lineEl(container, "Show 1 more"));
    expect(press(container, "Down")).toBe(true);
    expect(nameOf(document.activeElement)).toBe(`question:${NEWEST}`);
    expect(isRetry(document.activeElement)).toBe(false);
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Show 1 more");
  });

  it("Down from the last shown question reaches the new line, and Up from the line reaches that question", () => {
    const { container } = openDay(13, null);
    const rows = container.querySelectorAll<HTMLElement>(`.bonsai-chat-turn-slot ${ROW}`);
    focusOn(rows[5]!);
    expect(press(container, "Down")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Show 6 more");
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("row:monday question 6");
  });

  it.each(["top", "padded", "center"] as ScrollRule[])(
    "under the %s scroll rule the group, with a press of Show N more between, walks Down and Up with no stop twice and every landing on screen",
    (rule) => {
      const { container, stamp } = openDay(13, null);
      pressShowMore(container, stamp);
      const model = steamScroll(container, rule);
      focusOn(lineEl(container, dayText(13)));
      model.after();
      const seenVisible: boolean[] = [];
      const after = () => {
        model.after();
        seenVisible.push(model.visible(document.activeElement!));
      };
      const down = walk(container, "Down", after, 60);
      /* Day line, twelve rows, Show 1 more, Yesterday's line, the newest question. */
      expect(down.indexOf("line:Show 1 more")).toBe(13);
      expect(down.slice(13)).toEqual(["line:Show 1 more", "line:Yesterday · 3", `row:${NEWEST}`]);
      expect(new Set(down).size).toBe(down.length);
      const up = walk(container, "Up", after, 60);
      expect(up).toEqual([...[...down].reverse(), "line:16 earlier"]);
      expect(new Set(up).size).toBe(up.length);
      expect(seenVisible.every(Boolean)).toBe(true);
    },
  );

  it("a day of six or fewer walks exactly as it did before the new line existed", () => {
    const { container } = openDay(6, null);
    focusOn(lineEl(container, dayText(6)));
    const down = walk(container, "Down");
    expect(down.slice(0, 9)).toEqual([
      `line:${dayText(6)}`,
      ...mondayRows(1, 6).map((q) => `row:${q}`),
      "line:Yesterday · 3",
      `row:${NEWEST}`,
    ]);
    expect(down.some((name) => name.startsWith("line:Show"))).toBe(false);
  });
});
