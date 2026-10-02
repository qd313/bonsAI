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
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { resetUiDocument } from "../utils/uiDocument";

type Dir = "Up" | "Down" | "Left" | "Right";
type NavHandlers = Partial<Record<`onMove${Dir}` | "onActivate" | "onCancelButton", (e?: unknown) => unknown>>;
type NavEl = HTMLElement & { __nav?: NavHandlers };

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  /* Keeps the move, activate and cancel handlers on the element and gives `navRef` Steam's
     TakeFocus: the ring goes to the container's first live child. */
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function NavFocusable(props, ref) {
      const { onMoveUp, onMoveDown, onMoveLeft, onMoveRight, onActivate, onCancelButton, navRef, ...rest } =
        props as Record<string, unknown> & NavHandlers & { navRef?: { current: unknown } };
      const setRef = (el: HTMLDivElement | null) => {
        if (el) {
          (el as NavEl).__nav = { onMoveUp, onMoveDown, onMoveLeft, onMoveRight, onActivate, onCancelButton };
          if (navRef) {
            navRef.current = {
              TakeFocus: () => {
                const first = el.querySelector<HTMLElement>("button:not([disabled]), [tabindex]");
                (first ?? el).focus();
                return true;
              },
            };
          }
        }
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      };
      return <Base {...rest} ref={setRef} />;
    },
  );
  return { ...stubs, Focusable: NavFocusable };
});

const ANSWER = ["First paragraph of the answer.", "Second paragraph of the answer."].join("\n\n");

function snapshot(): TransparencySnapshot {
  return {
    route: "ollama",
    raw_question: "q",
    sanitizer_action: "none",
    sanitizer_reason_codes: [],
    text_after_sanitizer: "q",
    ollama_model: "llama3:8b",
    system_prompt: null,
    user_text_for_model: null,
    user_image_count: 0,
    attachment_paths: [],
    assistant_raw: null,
    assistant_after_attachment_format: null,
    final_response: ANSWER,
    applied: null,
    success: true,
    app_id: "",
    app_name: "",
    pc_ip: "",
    error_message: "",
    elapsed_seconds: 1.2,
    context_chips: [],
    ask_diagnostics: null,
  } as TransparencySnapshot;
}

/** The Deck's local day: Friday 2 October 2026, noon. Monday 28 September is the oldest day. */
const NOW = new Date(2026, 9, 2, 12, 0, 0);
const seconds = (month: number, day: number, hour = 9) => new Date(2026, month, day, hour).getTime() / 1000;

function turn(id: string, question: string, createdAt?: number, reasoning = false): AskThreadCollapsedTurn {
  return {
    id,
    question,
    answer: ANSWER,
    transparency: snapshot(),
    createdAt,
    reasoning: reasoning ? { text: "They want a plan.", seconds: 18, tokens: 40 } : undefined,
  };
}

/** Five questions on Monday, three yesterday, three today, then the newest (also today). */
const TURNS: AskThreadCollapsedTurn[] = [
  ...[1, 2, 3, 4, 5].map((n) => turn(`m${n}`, `monday question ${n}`, seconds(8, 28, 8 + n))),
  ...[1, 2, 3].map((n) => turn(`y${n}`, `yesterday question ${n}`, seconds(9, 1, 8 + n))),
  ...[1, 2, 3].map((n) => turn(`d${n}`, `today question ${n}`, seconds(9, 2, 6 + n))),
  turn("n1", "what is a good first upgrade in Hollow Knight", seconds(9, 2, 11), true),
];

function renderChat(extra: Partial<MainTabChatTranscriptProps> = {}, turns = TURNS, open: string | null = "n1") {
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadCollapsed: turns,
    expandedTurnKey: open,
    askThreadDisplayQuestion: "",
    lastExchange: { question: "q", answer: ANSWER },
    transparencySnapshot: snapshot(),
    liveReplyFeedbackRating: "up",
    onReplyFeedback: () => {},
    onReplyMicroAction: () => {},
    onAskOllama: async () => {},
    onTurnActivate: () => {},
    ...extra,
  };
  const out = render(<MainTabChatTranscript {...props} />);
  /* Decky stamps tabindex="0" on the nodes Steam navigates. */
  const stamp = () =>
    out.container
      .querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"]')
      .forEach((el) => el.setAttribute("tabindex", "0"));
  stamp();
  return { ...out, stamp };
}

const LINE = ".bonsai-chat-earlier-pill-row";
const ROW = ".bonsai-chat-turn-row-header:not(.bonsai-chat-turn-row-header--with-retry)";

/** The controls the ring can sit on: the stops Steam walks, not the containers around them. */
const STOP_SELECTOR = [
  "button:not([disabled])",
  LINE,
  ROW,
  ".bonsai-chat-turn-row-body",
  ".bonsai-answer-stop",
  ".bonsai-chat-reasoning-fold",
].join(", ");

function stops(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(STOP_SELECTOR));
}

function lines(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(LINE)).map(
    (el) => el.querySelector(".bonsai-chat-earlier-pill")?.textContent ?? "",
  );
}

function lineEl(container: HTMLElement, text: string): HTMLElement {
  const found = Array.from(container.querySelectorAll<HTMLElement>(LINE)).find(
    (el) => el.querySelector(".bonsai-chat-earlier-pill")?.textContent === text,
  );
  if (!found) throw new Error(`no line reads "${text}"; the lines are ${JSON.stringify(lines(container))}`);
  return found;
}

function rowTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(`.bonsai-chat-turn-slot ${ROW}`)).map((el) => el.textContent ?? "");
}

function isRetry(el: Element | null): boolean {
  return Boolean(el?.matches?.('[aria-label="Retry same prompt"]'));
}

function nameOf(el: Element | null): string {
  if (!el) return "nothing";
  const h = el as HTMLElement;
  if (isRetry(h)) return "RETRY";
  if (h.matches(LINE)) return `line:${h.querySelector(".bonsai-chat-earlier-pill")?.textContent}`;
  if (h.classList.contains("bonsai-chat-turn-row-body")) return `question:${h.textContent}`;
  if (h.classList.contains("bonsai-chat-turn-row-header")) return `row:${h.textContent}`;
  if (h.classList.contains("bonsai-chat-reasoning-fold")) return "reasoning-line";
  if (h.classList.contains("bonsai-answer-stop")) return `answer:${h.textContent?.slice(0, 12)}`;
  return h.getAttribute("aria-label") ?? h.textContent?.trim() ?? h.className;
}

/** The row Steam never steps sideways inside on a vertical press. */
function rowOf(el: Element | null): Element | null {
  return el?.closest?.(".bonsai-chat-turn-row-header--with-retry") ?? null;
}

/** A on a stop: its own activate handler, as Steam calls it. */
function activate(el: HTMLElement): void {
  act(() => {
    (el as NavEl).__nav?.onActivate?.();
  });
}

/**
 * One press: the focused element's move handler first, then each containing Focusable's, until one
 * claims it. An unclaimed Up/Down is Steam's own move, modelled as in the Retry walk: it never steps
 * sideways inside the question's row, entering a row from above lands on its first control (Retry)
 * and from below on its last. `after` runs once a landing is made (the scroll model hooks in there).
 */
function press(container: HTMLElement, dir: Dir, after?: () => void): boolean {
  const key = `onMove${dir}` as const;
  let el = document.activeElement as NavEl | null;
  const start = document.activeElement;
  let claimed = false;
  act(() => {
    while (el) {
      const h = el.__nav?.[key];
      if (h && h() === true) {
        claimed = true;
        return;
      }
      el = el.parentElement as NavEl | null;
    }
  });
  if (claimed) {
    after?.();
    return true;
  }
  if (dir === "Left" || dir === "Right") return false;
  const all = stops(container);
  const here = all.indexOf(start as HTMLElement);
  /* Past the last stop the model knows, Steam leaves the transcript: the walk is over. */
  if (here < 0) return false;
  const from = rowOf(start);
  const rest = dir === "Down" ? all.slice(here + 1) : all.slice(0, here).reverse();
  const candidates = rest.filter((c) => !from || rowOf(c) !== from);
  if (!candidates.length) return false;
  let target = candidates[0]!;
  const entered = rowOf(target);
  if (entered && dir === "Up") {
    const inRow = candidates.filter((c) => rowOf(c) === entered);
    target = inRow[inRow.length - 1]!;
  }
  act(() => target.focus());
  after?.();
  return true;
}

function focusOn(el: HTMLElement): void {
  act(() => el.focus());
  expect(document.activeElement).toBe(el);
}

/** Press `dir` until nothing moves (or the cap), returning every landing in order. */
function walk(container: HTMLElement, dir: "Up" | "Down", after?: () => void, cap = 40): string[] {
  const seen: string[] = [nameOf(document.activeElement)];
  for (let i = 0; i < cap; i += 1) {
    const before = document.activeElement;
    if (!press(container, dir, after) || document.activeElement === before) break;
    seen.push(nameOf(document.activeElement));
  }
  return seen;
}

/** Open "4 earlier"'s list: the line is the first stop, A opens it. */
function openEarlier(container: HTMLElement, stamp: () => void): void {
  activate(container.querySelector<HTMLElement>(LINE)!);
  stamp();
}

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

  it("Up from the first question of an opened day is its day line, not the chat slot row", () => {
    const slotRow = { current: { TakeFocus: vi.fn(() => true) } };
    registerNavFocus("chat-slot-row", slotRow);
    const { container, stamp } = renderChat();
    openEarlier(container, stamp);
    activate(lineEl(container, "Mon 28 Sep · 5"));
    stamp();
    focusOn(container.querySelector<HTMLElement>(`.bonsai-chat-turn-slot ${ROW}`)!);
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:Mon 28 Sep · 5");
    expect(slotRow.current.TakeFocus).not.toHaveBeenCalled();
  });

  it("Up from the 'N earlier' line takes the chat slot row, opened or closed", () => {
    const slotRow = { current: { TakeFocus: vi.fn(() => true) } };
    registerNavFocus("chat-slot-row", slotRow);
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

/* ---- Steam's scroll-into-view, modelled on the Deck's Quick Access numbers ---- */
const PANE_TOP = 88;
const DOCK_TOP = 290;
type ScrollRule = "top" | "padded" | "center";

/**
 * Lays the stops out in one column and scrolls like Steam after each landing: "top" aligns a stop that
 * is not wholly in the readable band to the pane's top, "padded" puts it 116 px below, "center" also
 * re-centres a stop that was already on screen. Boxes follow the scroll, as on the Deck.
 */
function steamScroll(container: HTMLElement, rule: ScrollRule) {
  const state = { scrollTop: 0 };
  const boxes = new Map<Element, [number, number]>();
  let y = PANE_TOP;
  for (const el of stops(container)) {
    const h = el.matches(LINE) ? 26 : 34;
    boxes.set(el, [y, y + h]);
    y += h + 8;
  }
  const rectOf = (el: Element): [number, number] => {
    const [top, bottom] = boxes.get(el)!;
    return [top - state.scrollTop, bottom - state.scrollTop];
  };
  const after = () => {
    const el = document.activeElement;
    if (!el || !boxes.has(el)) return;
    const [top, bottom] = rectOf(el);
    const onScreen = top >= PANE_TOP && bottom <= DOCK_TOP;
    if (rule === "top" && !onScreen) state.scrollTop += top - PANE_TOP;
    if (rule === "padded" && !onScreen) state.scrollTop += top - (PANE_TOP + 116);
    if (rule === "center") state.scrollTop += (top + bottom) / 2 - (PANE_TOP + DOCK_TOP) / 2;
    state.scrollTop = Math.max(0, state.scrollTop);
  };
  const visible = (el: Element) => {
    const [top, bottom] = rectOf(el);
    return top >= PANE_TOP && bottom <= DOCK_TOP;
  };
  return { after, visible };
}

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
