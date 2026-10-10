/**
 * Title: The chat's name in Decky's bar, as the Deck shows it
 * Purpose: Pin plan 84 step 5's name row (rows P84-NAME-01, P84-NAME-03 and the LT/RT half of
 *          P84-HINTS-01) at the level the Deck check looks at: the words on the row, where the name's
 *          box sits against a 300-point panel with Decky's own 40-point back arrow, how much room the
 *          words get, LT and RT's drawn opacity with the ring off and on, and the name sliding once
 *          while the ring is on it.
 * Used for: ChatTitleView.tsx, ChatNameWords.tsx, nameRowBalance.ts, chatTitleStyles.ts.
 * Solves: jsdom lays nothing out, so the boxes are given by hand in the Deck's measured numbers (the
 *         bar 0 to 300 with 16 points of padding each side and the back arrow 16 to 56, plan 84 § 4)
 *         and the name's box and room are worked out from them the way the browser's row does. The
 *         words' own width cannot be measured here: the drawing measured "Second boss, phase t" (20
 *         characters) at 139 points in the Deck's type, so the test asks for at least 139 points of
 *         room, and the Deck row (P84-NAME-03) measures the real words.
 * Does not: Switch chats or open the menu (later steps).
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

type NavEl = HTMLElement & { __nav?: Record<string, unknown> };

const hoisted = vi.hoisted(() => ({ tabBarTakes: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  /* Keeps the move handlers on the element and gives `navRef` Steam's TakeFocus. */
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function NavFocusable(props, ref) {
    const { onMoveUp, onMoveDown, onMoveLeft, onMoveRight, navRef, ...rest } = props as Record<string, unknown> & {
      navRef?: { current: unknown };
    };
    const setRef = (el: HTMLDivElement | null) => {
      if (el) {
        (el as NavEl).__nav = { onMoveUp, onMoveDown, onMoveLeft, onMoveRight };
        el.setAttribute("tabindex", "0");
        if (navRef) navRef.current = { TakeFocus: () => (el.focus(), true) };
      }
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };
    return <Base {...rest} ref={setRef} />;
  });
  return { ...stubs, Focusable: NavFocusable };
});
vi.mock("../../utils/navFocusRegistry", async (orig) => {
  const real = await orig<typeof import("../../utils/navFocusRegistry")>();
  return {
    ...real,
    /* The tab bar is not drawn here: a take onto it is counted and reported as landed. Every other id
       (the name's own, "chat-name") is the real transfer. */
    takeNavFocus: (id: Parameters<typeof real.takeNavFocus>[0]) => {
      if (id !== "tab-bar") return real.takeNavFocus(id);
      hoisted.tabBarTakes += 1;
      return true;
    },
  };
});

import { ChatTitleView, chatCountLine } from "./ChatTitleView";
import { chatNameHasRing, resetChatNameNav, takeChatNameFocus } from "./chatNameNav";
import { publishChatTitle, resetChatTitleStore, setChatTitleTab, type ChatTitleChat } from "./chatTitleStore";
import { balanceWidth, nameRowGeometry } from "./nameRowBalance";
import { DECKY_BACK_ARROW_W_PX, KEY_DIM_OPACITY } from "./chatTitleStyles";
import { presetScrollPlan } from "../preset-carousel/presetRowLayout";

const ACTIONS = { previous: () => {}, next: () => {}, takeFirstStop: () => false };
const LONG = "Second boss, phase two strategy";

function chat(over: Partial<ChatTitleChat> = {}): ChatTitleChat {
  return { name: "Boss help", place: 2, count: 5, unsaved: false, answerInFlight: false, chats: [], ...over };
}

/** Decky's title bar, with bonsAI's view as its last child, as Decky Loader's TitleView.tsx draws it. */
function renderInDeckyBar(c: ChatTitleChat | null, tab = "main") {
  setChatTitleTab(tab);
  if (c) publishChatTitle({}, c, ACTIONS);
  return render(
    <div data-testid="decky-bar">
      <button data-testid="decky-back">←</button>
      <ChatTitleView />
    </div>,
  );
}

function rect(left: number, right: number): DOMRect {
  return { left, right, width: right - left, top: 6, bottom: 34, height: 28, x: left, y: 6, toJSON: () => ({}) } as DOMRect;
}

const nameEl = (c: HTMLElement) => c.querySelector<HTMLElement>(".bonsai-chat-title__name")!;

beforeEach(() => {
  resetChatTitleStore();
  resetChatNameNav();
  hoisted.tabBarTakes = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the words on the name row", () => {
  it("shows the chat's name and 'LT chat 2 of 5 RT' under it", () => {
    const { container } = renderInDeckyBar(chat());
    expect(container.querySelector(".bonsai-chat-title__words")?.textContent).toBe("Boss help");
    const keys = Array.from(container.querySelectorAll(".bonsai-chat-title__sub > *")).map((el) => el.textContent);
    expect(keys).toEqual(["LT", "chat 2 of 5", "RT"]);
    expect(container.querySelector(".bonsai-chat-title__caret svg")).not.toBeNull();
  });

  it("an empty chat reads 'New chat' and 'not saved yet'", () => {
    const { container } = renderInDeckyBar(chat({ name: "New chat", place: 0, unsaved: true }));
    expect(container.querySelector(".bonsai-chat-title__words")?.textContent).toBe("New chat");
    expect(container.querySelector(".bonsai-chat-title__count")?.textContent).toBe("not saved yet");
    expect(chatCountLine({ unsaved: true, place: 3, count: 4 })).toBe("not saved yet");
  });

  it("other tabs show the plain bonsAI wordmark, no name row", () => {
    const { container } = renderInDeckyBar(chat(), "settings");
    expect(container.querySelector(".bonsai-chat-title__name")).toBeNull();
    expect(container.querySelector(".bonsai-chat-title__wordmark")?.textContent?.startsWith("bonsAI")).toBe(true);
  });

  it("before the Main tab says which chat is open, the wordmark", () => {
    const { container } = renderInDeckyBar(null);
    expect(container.querySelector(".bonsai-chat-title__wordmark")).not.toBeNull();
  });
});

describe("the name on the panel's centre line, at 300 points wide", () => {
  /* The Deck's bar: 0 to 300, padding 16 each side, back arrow 16 to 56 (plan 84 § 4). */
  const BAR = { left: 0, right: 300 };
  for (const gap of [0, 6, 10, 12]) {
    it(`with ${gap} points between Decky's arrow and the view, the name's centre is within 1 point of 150`, () => {
      const root = { left: 16 + DECKY_BACK_ARROW_W_PX + gap, right: 284 };
      const w = balanceWidth(BAR, root);
      expect(w).toBe(DECKY_BACK_ARROW_W_PX + gap);
      const g = nameRowGeometry(BAR, root, w!);
      expect(Math.abs(g.centre - g.panelCentre)).toBeLessThanOrEqual(1);
    });
  }

  it("the drawn empty space takes the measured width, so the drawn name box is centred", () => {
    /* Decky lays its bar out; here the bar is 0 to 300 and the view starts 10 points after the arrow. */
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute("data-testid") === "decky-bar") return rect(0, 300);
      if (this.classList.contains("bonsai-chat-title")) return rect(66, 284);
      return rect(0, 0);
    });
    const { container } = renderInDeckyBar(chat());
    const mirror = container.querySelector<HTMLElement>(".bonsai-chat-title__mirror")!;
    expect(mirror.style.width).toBe("50px");
    /* The name's box is the view less the empty space: 66 to 234, centred on 150. */
    const g = nameRowGeometry({ left: 0, right: 300 }, { left: 66, right: 284 }, parseFloat(mirror.style.width));
    expect(g.nameLeft).toBe(66);
    expect(g.nameRight).toBe(234);
    expect(Math.abs(g.centre - 150)).toBeLessThanOrEqual(1);
  });

  it("about 20 characters fit: at least the 139 points the drawing measured for 'Second boss, phase t'", () => {
    const BARS = [0, 6, 10].map((gap) => ({ left: 16 + DECKY_BACK_ARROW_W_PX + gap, right: 284 }));
    for (const root of BARS) {
      const g = nameRowGeometry(BAR, root, balanceWidth(BAR, root)!);
      expect(g.wordsRoom).toBeGreaterThanOrEqual(139);
    }
    expect(LONG.slice(0, 20)).toBe("Second boss, phase t");
  });

  it("with no back arrow (a pinned Quick Tab) the empty space is dropped", () => {
    expect(balanceWidth({ left: 0, right: 300 }, { left: 16, right: 284 })).toBe(0);
  });

  it("an unusable measurement keeps the drawing's 40", () => {
    expect(balanceWidth({ left: 0, right: 0 }, { left: 0, right: 0 })).toBeNull();
    const { container } = renderInDeckyBar(chat());
    expect(container.querySelector<HTMLElement>(".bonsai-chat-title__mirror")!.style.width).toBe("40px");
  });
});

describe("LT and RT dim unless the ring is on the name", () => {
  function keyOpacity(container: HTMLElement): string {
    const key = container.querySelector<HTMLElement>(".bonsai-chat-title__key")!;
    return getComputedStyle(key).opacity;
  }

  it(`draws LT and RT at ${KEY_DIM_OPACITY} with the ring elsewhere`, () => {
    const { container } = renderInDeckyBar(chat());
    expect(keyOpacity(container)).toBe(String(KEY_DIM_OPACITY));
  });

  it("draws them at full strength when Steam's ring is on the name", () => {
    const { container } = renderInDeckyBar(chat());
    nameEl(container).classList.add("gpfocus");
    expect(keyOpacity(container)).toBe("1");
  });

  it("dims them again when the ring leaves", () => {
    const { container } = renderInDeckyBar(chat());
    act(() => nameEl(container).focus());
    expect(keyOpacity(container)).toBe("1");
    act(() => nameEl(container).blur());
    expect(keyOpacity(container)).toBe(String(KEY_DIM_OPACITY));
  });
});

describe("the name's own D-pad moves", () => {
  it("Down hands the ring to the tab bar right below, by Steam's transfer", () => {
    const { container } = renderInDeckyBar(chat());
    const nav = (nameEl(container) as NavEl).__nav!;
    expect((nav.onMoveDown as () => boolean)()).toBe(true);
    expect(hoisted.tabBarTakes).toBe(1);
  });

  it("Right goes to the delete icon and holds; Left goes to the +; Up is Steam's own (plan 87 F5)", () => {
    const { container } = renderInDeckyBar(chat());
    const nav = (nameEl(container) as NavEl).__nav!;
    expect((nav.onMoveRight as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".bonsai-chat-title__icon--delete"));
    expect((nav.onMoveLeft as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".bonsai-chat-title__icon--new"));
    expect(nav.onMoveUp).toBeUndefined();
  });

  it("is reachable by Steam's transfer from inside bonsAI (the name's nav node)", () => {
    const { container } = renderInDeckyBar(chat());
    expect(takeChatNameFocus()).toBe(true);
    expect(document.activeElement).toBe(nameEl(container));
    expect(chatNameHasRing()).toBe(true);
  });
});

describe("a long name slides once while the ring is on it", () => {
  /** jsdom lays nothing out: give the words box the Deck's room and the long name its overflow. */
  function sizeWords(room: number, words: number) {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("bonsai-chat-title__words") ? room : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("bonsai-chat-title__words") ? words : 0;
    });
  }
  const phase = (c: HTMLElement) => c.querySelector(".bonsai-chat-title__words")?.getAttribute("data-scroll-phase");
  const run = (c: HTMLElement) => c.querySelector<HTMLElement>(".bonsai-chat-title__run");

  it("at rest it is cut short and still", () => {
    sizeWords(142, 212);
    const { container } = renderInDeckyBar(chat({ name: LONG }));
    expect(phase(container)).toBe("rest");
    expect(run(container)).toBeNull();
  });

  it("with the ring on it: waits, slides to the end, waits, slides back, then stays still", () => {
    vi.useFakeTimers();
    sizeWords(142, 212);
    const { container } = renderInDeckyBar(chat({ name: LONG }));
    act(() => nameEl(container).focus());
    const plan = presetScrollPlan(70)!;
    expect(phase(container)).toBe("waiting");
    act(() => vi.advanceTimersByTime(plan.delayMs));
    expect(phase(container)).toBe("out");
    expect(run(container)!.style.transform).toBe("translateX(-70px)");
    act(() => vi.advanceTimersByTime(plan.crawlMs));
    expect(phase(container)).toBe("end");
    act(() => vi.advanceTimersByTime(plan.pauseMs));
    expect(phase(container)).toBe("back");
    expect(run(container)!.style.transform).toBe("translateX(0px)");
    act(() => vi.advanceTimersByTime(plan.crawlMs));
    expect(phase(container)).toBe("rest");
    /* Once: nothing moves again while the ring stays. */
    act(() => vi.advanceTimersByTime(60_000));
    expect(phase(container)).toBe("rest");
  });

  it("stops and goes back to rest when the ring leaves mid-slide", () => {
    vi.useFakeTimers();
    sizeWords(142, 212);
    const { container } = renderInDeckyBar(chat({ name: LONG }));
    act(() => nameEl(container).focus());
    act(() => vi.advanceTimersByTime(presetScrollPlan(70)!.delayMs));
    act(() => nameEl(container).blur());
    expect(phase(container)).toBe("rest");
  });

  it("a name that fits never moves", () => {
    sizeWords(142, 60);
    const { container } = renderInDeckyBar(chat());
    act(() => nameEl(container).focus());
    expect(phase(container)).toBe("fits");
  });

  it("does not move for someone who asked for less motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    sizeWords(142, 212);
    const { container } = renderInDeckyBar(chat({ name: LONG }));
    act(() => nameEl(container).focus());
    expect(phase(container)).toBe("rest");
    expect(run(container)).toBeNull();
  });
});
