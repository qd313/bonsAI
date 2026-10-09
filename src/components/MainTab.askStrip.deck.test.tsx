/**
 * Title: The ask box's strip on the Main tab (plan 84 step 2)
 * Purpose: Pin plan 84 step 2 at the level the Deck checks look at (rows P84-ASK-01 and P84-ASK-02): what the
 *          dock under the answer shows, what the question box's bottom strip shows and in which order, what the
 *          small ASK button does when pressed and while an answer is being written, and where the ring goes on
 *          every D-pad press in and around the strip. The real MainTab is drawn inside a pane shaped like the
 *          Deck's own screen, the way DetailsSlot.deck.test.tsx draws it.
 * Used for: MainTab.tsx (the context line is gone), MainTabUnifiedAskBar.tsx, AskStripGameTag.tsx and
 *           AskStripSendButtons.tsx (the strip), useMainTabAskBarFocus.ts (Down from the box). The routes being
 *           pinned are written down in docs/focus-graph.md, "The ask box's strip (plan 84)".
 * Solves: jsdom has no layout, so every box is given in the Deck's own numbers (points on the handheld: the pane
 *         from y 88 to 454, the dock from 349 once the two rows are gone, the strip along its bottom) and the
 *         pane's scrollTop moves the boxes outside the dock. A press runs the move handler of the element that
 *         holds the ring, then its containers', as Steam does; a move no handler claims takes Steam's own step
 *         (Up or Down: the nearest stop that way; Left or Right: none, every strip edge is claimed). Steam's
 *         transfer (`navRef.TakeFocus`) is recorded, so a test can tell the ring was carried into the box by
 *         Steam. After every landing Steam's own scroll-into-view runs (the "top" rule of deckAnswerWalk.ts:
 *         a stop not wholly in the reading band is brought to its top) and the plugin's own lift off the dock
 *         runs (useDockClearanceOnFocus, mounted by the real MainTab).
 * Does not: Measure heights or pixels. That the answer area is about 57 points taller, and that each strip stop
 *           is fully visible on the handheld, is the Deck's check (the probe, P84-HEIGHT-01 and P84-ASK-02). What
 *           this file can prove about visibility is that no press, scroll-into-view or lift moves anything while
 *           the ring walks the strip, which sits in the fixed dock.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

import { MainTab } from "./MainTab";
import type { MainTabProps } from "./MainTab";
import type { OllamaContextUi } from "../types/bonsaiUi";
import { resetUiDocument } from "../utils/uiDocument";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";

type HandlerKey = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight" | "onOKButton";
type Handlers = Partial<Record<HandlerKey, (e?: unknown) => unknown>>;
type NavEl = HTMLElement & { __nav?: Handlers };

const hoisted = vi.hoisted(() => ({ transfers: [] as HTMLElement[] }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  /* Keeps the move and A handlers on the element, and gives `navRef` Steam's TakeFocus: the ring goes to the
     container's first live child, or the container itself. Every transfer is recorded. Buttons are wrapped
     too, because the strip's Left and Right sit on its buttons (the Deck showed those working). */
  const withNav = (Base: React.ElementType) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(function NavStub(props, ref) {
      const { navRef, ...rest } = props as Record<string, unknown> & { navRef?: { current: unknown } };
      const setRef = (el: HTMLElement | null) => {
        if (el) {
          const p = props as Handlers;
          (el as NavEl).__nav = {
            onMoveUp: p.onMoveUp, onMoveDown: p.onMoveDown, onMoveLeft: p.onMoveLeft,
            onMoveRight: p.onMoveRight, onOKButton: p.onOKButton,
          };
          if (navRef) {
            navRef.current = {
              TakeFocus: () => {
                const target = el.querySelector<HTMLElement>("button:not([disabled]), [tabindex]") ?? el;
                target.focus();
                hoisted.transfers.push(target);
                return true;
              },
            };
          }
        }
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = el;
      };
      return <Base {...rest} ref={setRef} />;
    });
  return {
    ...stubs,
    Focusable: withNav(stubs.Focusable),
    TextField: withNav(stubs.TextField),
    Button: withNav(stubs.Button),
  };
});

/* ---------- the Deck's own screen, in points ---------- */
const PANE_TOP = 88;
const PANE_BOTTOM = 454;
/** The dock once the ASK row and the context line are gone: chips 30 + gap 2 + box 73. */
const DOCK_TOP = PANE_BOTTOM - 105;
type Box = [number, number];
const CHIPS: Box = [DOCK_TOP, DOCK_TOP + 30];
const QUESTION_BOX: Box = [DOCK_TOP + 32, PANE_BOTTOM - 29];
const STRIP: Box = [PANE_BOTTOM - 27, PANE_BOTTOM - 5];

let pane: HTMLDivElement;

function rect([top, bottom]: Box): DOMRect {
  return { top, bottom, left: 0, right: 300, width: 300, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}
/** The box the Deck would give `el`: fixed inside the dock, scrolling everywhere else. */
function screenBox(el: Element): Box {
  if (el === pane) return [PANE_TOP, PANE_BOTTOM];
  const dock = el.closest(".bonsai-main-tab-dock");
  if (dock) {
    if (el === dock) return [DOCK_TOP, PANE_BOTTOM];
    if (el.closest(".bonsai-preset-row-host")) return CHIPS;
    if (el.closest(".bonsai-unified-input-bottom-actions")) return STRIP;
    return QUESTION_BOX;
  }
  return [PANE_TOP - pane.scrollTop, PANE_TOP + 20 - pane.scrollTop];
}
function setScroll(y: number) {
  pane.scrollTop = Math.max(0, Math.min(1000, y));
}
/** Steam's scroll-into-view after a landing ("top": a stop not wholly in the reading band goes to its top). */
function steamGlide(el: Element | null) {
  if (!el || !pane.contains(el) || el.closest(".bonsai-main-tab-dock")) return;
  const [top, bottom] = screenBox(el);
  if (top >= PANE_TOP && bottom <= DOCK_TOP) return;
  setScroll(pane.scrollTop + top - PANE_TOP);
}
function settle(ms = 1000) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const NO_GAME: OllamaContextUi = { app_id: "", app_context: "none" };
const HOLLOW_KNIGHT: OllamaContextUi = { app_id: "367520", app_context: "active", app_name: "Hollow Knight" };

function Harness({ context, over }: { context: OllamaContextUi | Record<string, never>; over: Partial<MainTabProps> }) {
  const props = {
    fullBleedRowStyle: {}, isAsking: false, selectedAttachment: null, ollamaContext: context, unifiedInput: "",
    showSlowWarning: false, latencyWarningSeconds: 30, ollamaResponse: "", elapsedSeconds: null,
    lastApplied: null, canSaveDesktopNote: false, onOpenDesktopNoteSave: () => {}, askMode: "strategy",
    askThreadCollapsed: [], expandedTurnKey: "live", askThreadDisplayQuestion: "",
    lastExchange: null, transparencySnapshot: null,
    liveReplyFeedbackRating: null, onReplyFeedback: () => {}, onReplyMicroAction: () => {},
    onAskOllama: async () => {}, onTurnActivate: () => {}, onRetryLastResponse: () => {},
    suggestedPrompts: [{ text: "How can I optimize for battery life?" }], showPluginHelpChip: false,
    presetChipAnimation: "static", filteredSettings: [], recentScreenshots: [],
    setUnifiedInput: () => {}, presetCarouselInject: null, setIsUnifiedInputFocused: () => {},
    isUnifiedInputFocused: false, onSettingClick: () => {}, ollamaIp: "127.0.0.1",
    onOpenScreenshotBrowser: () => {}, onTakeScreenshot: () => {}, onCancelAsk: () => {}, onMicInput: () => {},
    setSelectedAttachment: () => {}, clearUnifiedInput: () => {}, showSearchClearButton: false, mediaError: "",
    onAskModeChange: () => {}, isQamSetting: () => false, unifiedInputSurfacePx: 60, usesNativeMultilineField: true,
    unifiedInputHostRef: { current: null }, unifiedInputFieldLayerRef: { current: null },
    unifiedInputMeasureRef: { current: null }, attachActionHostRef: { current: null },
    askBarHostRef: { current: null }, screenshotBrowserHostRef: { current: null },
    ...over,
  } as unknown as MainTabProps;
  return <MainTab {...props} />;
}

/** Words in the box: the X shows beside ASK (the caller's showSearchClearButton is "the box has words"). */
const WITH_WORDS: Partial<MainTabProps> = { unifiedInput: "how do I parry", showSearchClearButton: true };

function renderMain(context: OllamaContextUi | Record<string, never>, over: Partial<MainTabProps> = {}) {
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  pane = document.createElement("div");
  pane.className = "TabContentsScroll";
  Object.defineProperty(pane, "clientHeight", { value: PANE_BOTTOM - PANE_TOP, configurable: true });
  Object.defineProperty(pane, "scrollHeight", { value: 1000 + PANE_BOTTOM - PANE_TOP, configurable: true });
  scope.appendChild(pane);
  document.body.appendChild(scope);
  const view = render(<Harness context={context} over={over} />, { container: pane });
  /* Decky stamps tabindex on what Steam navigates; the stubs do not, so give the field its own. */
  pane.querySelectorAll<HTMLElement>('[data-decky-ui="TextField"]').forEach((el) => el.setAttribute("tabindex", "0"));
  settle(400);
  return view;
}

/* ---------- what a person sees ---------- */
function dock(): HTMLElement {
  return pane.querySelector<HTMLElement>(".bonsai-main-tab-dock")!;
}
/** The strip's own row: what a person sees along the bottom of the question box, left to right. */
function stripRow(): HTMLElement {
  return pane.querySelector<HTMLElement>(".bonsai-unified-input-actions-row")!;
}
function gameTag(): HTMLElement | null {
  return stripRow().querySelector<HTMLElement>(".bonsai-ask-strip-game");
}
function questionBox(): HTMLElement {
  return pane.querySelector<HTMLElement>('[data-decky-ui="TextField"]')!;
}
function byLabel(label: string): HTMLElement {
  const el = stripRow().querySelector<HTMLElement>(`button[aria-label="${label}"]`);
  expect(el, `no "${label}" in the strip`).toBeTruthy();
  return el!;
}
/** The strip, left to right, as words: every button by its label, and the game tag by what it says. */
function stripReads(): string[] {
  return Array.from(stripRow().querySelectorAll<HTMLElement>("button, .bonsai-ask-strip-game")).map((el) =>
    el.matches("button") ? (el.getAttribute("aria-label") ?? "?") : `tag: ${el.textContent}`,
  );
}
/** The strip's stops: what the ring can land on, left to right. */
function stripStops(): string[] {
  return Array.from(stripRow().querySelectorAll<HTMLButtonElement>("button:not([disabled])")).map(
    (el) => el.getAttribute("aria-label") ?? "?",
  );
}
function ring(): HTMLElement | null {
  const el = document.activeElement as HTMLElement | null;
  return el && el !== document.body ? el : null;
}
function nameOf(el: Element | null): string {
  if (!el) return "nothing";
  if (el === questionBox()) return "question box";
  return el.getAttribute("aria-label") ?? el.className;
}
/** The ring is on something a person can see: in the dock, or wholly inside the reading band. */
function ringVisible(): boolean {
  const el = ring();
  if (!el) return false;
  if (el.closest(".bonsai-main-tab-dock")) return true;
  const [top, bottom] = screenBox(el);
  return top >= PANE_TOP && bottom <= DOCK_TOP;
}

/* ---------- presses, as Steam delivers them ---------- */
/** Steam's own Up or Down step when no handler claims the press: the nearest stop that way, if any. */
function steamOwnStep(dir: "up" | "down") {
  const from = ring();
  if (!from) return;
  const [fromTop, fromBottom] = screenBox(from);
  const candidates = Array.from(pane.querySelectorAll<HTMLElement>("button:not([disabled]), [tabindex]"))
    .filter((el) => el !== from && !from.contains(el) && !el.contains(from))
    .map((el) => ({ el, box: screenBox(el) }))
    .filter(({ box }) => (dir === "up" ? box[1] <= fromTop : box[0] >= fromBottom))
    .sort((a, b) => (dir === "up" ? b.box[1] - a.box[1] : a.box[0] - b.box[0]));
  const next = candidates[0]?.el;
  if (next) act(() => next.focus());
}
/** One press: the ring's own handler first, then each container's; a move nobody claims is Steam's own. */
function press(key: HandlerKey): boolean {
  let el = ring() as NavEl | null;
  let claimed = false;
  act(() => {
    while (el) {
      const h = el.__nav?.[key];
      if (h && (h({ stopPropagation: () => {} }) === true || key === "onOKButton")) {
        claimed = true;
        return;
      }
      el = el.parentElement as NavEl | null;
    }
  });
  if (!claimed && key === "onMoveUp") steamOwnStep("up");
  if (!claimed && key === "onMoveDown") steamOwnStep("down");
  steamGlide(ring());
  settle();
  return claimed;
}
function putRingOn(el: HTMLElement) {
  act(() => el.focus());
  settle();
}

/**
 * A bounded walk: press `key` until the ring stops moving, recording each stop. Fails on a stop seen twice,
 * on a stop a person could not see, and on any scroll while the ring is in the fixed dock.
 */
function walk(key: HandlerKey, limit = 8): string[] {
  const seen = [nameOf(ring())];
  for (let i = 0; i < limit; i++) {
    const before = ring();
    press(key);
    expect(pane.scrollTop).toBe(0);
    expect(ringVisible()).toBe(true);
    if (ring() === before) return seen;
    const name = nameOf(ring());
    expect(seen, `"${name}" visited twice walking ${key}`).not.toContain(name);
    seen.push(name);
  }
  throw new Error(`walk ${key} did not stop within ${limit} presses: ${seen.join(" -> ")}`);
}

const PAPERCLIP = "Attach screenshot to Ask";
const MODE = "Inference mode: Strategy. Open to change.";
const MIC = "Voice input";
const STOP = "Stop generation";
const CLEAR = "Clear";
const ASK = "Ask";

beforeEach(() => {
  vi.useFakeTimers();
  resetUiDocument();
  resetNavFocusRegistry();
  hoisted.transfers = [];
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (!pane || !pane.contains(this)) return rect([0, 0]);
    return rect(screenBox(this));
  };
  Element.prototype.scrollIntoView = function () {
    /* The lift's own request; nothing in the dock moves, and the walk asserts the pane never scrolls. */
  };
});
afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("the context line under the ask area is gone (plan 84 step 2)", () => {
  it("draws no 'Context: …' line anywhere on the Main tab, with or without a game", () => {
    for (const context of [NO_GAME, HOLLOW_KNIGHT]) {
      renderMain(context);
      expect(dock()).toBeTruthy();
      expect(pane.textContent).not.toContain("Context:");
      expect(pane.querySelector(".bonsai-context-footnote")).toBeNull();
      cleanup();
      document.body.innerHTML = "";
    }
  });
});

describe("the game tag in the box's strip carries what the context line said", () => {
  it("sits right after the paperclip, inside the strip, and says 'No game' when none is running", () => {
    renderMain(NO_GAME);
    const row = stripRow();
    const kids = Array.from(row.children) as HTMLElement[];
    expect(kids[0]?.getAttribute("aria-label")).toBe(PAPERCLIP);
    expect(kids[1]).toBe(gameTag());
    expect(gameTag()?.textContent).toBe("No game");
  });

  it("shows the running game's name", () => {
    renderMain(HOLLOW_KNIGHT);
    expect(gameTag()?.textContent).toBe("Hollow Knight");
  });

  it("falls back to the game's number when the name is missing, as the context line did", () => {
    renderMain({ app_id: "367520", app_context: "active", app_name: "  " });
    expect(gameTag()?.textContent).toBe("AppID 367520");
  });

  it("says 'No game' for a context with no game in it (the line's 'no active game detected')", () => {
    renderMain({});
    expect(gameTag()?.textContent).toBe("No game");
  });

  it("is a label, not a stop: nothing in it can take the ring", () => {
    renderMain(HOLLOW_KNIGHT);
    const tag = gameTag()!;
    expect(tag.tagName).not.toBe("BUTTON");
    expect(tag.hasAttribute("tabindex")).toBe(false);
    expect(tag.querySelector("button, [tabindex]")).toBeNull();
  });

  it("keeps the name in the context line's colour and italics, cut short with an ellipsis when long", () => {
    renderMain(HOLLOW_KNIGHT);
    const tag = gameTag()!;
    expect(tag.style.color).toBe("rgb(143, 168, 196)");
    expect(tag.style.fontStyle).toBe("italic");
    const name = tag.querySelector<HTMLElement>(".bonsai-ask-strip-game__name")!;
    expect(name.style.textOverflow).toBe("ellipsis");
    expect(name.style.overflow).toBe("hidden");
    expect(name.style.whiteSpace).toBe("nowrap");
  });
});

describe("the big ASK button is gone; a small ASK sits at the strip's right end", () => {
  it("draws no ASK row under the box, and exactly one ASK: the last thing in the box's strip", () => {
    renderMain(NO_GAME);
    expect(pane.querySelector(".bonsai-askbar-merged")).toBeNull();
    expect(pane.querySelector(".bonsai-ask-row")).toBeNull();
    const asks = pane.querySelectorAll(".bonsai-ask-primary");
    expect(asks.length).toBe(1);
    expect(stripRow().contains(asks[0]!)).toBe(true);
    expect(stripReads()).toEqual([PAPERCLIP, "tag: No game", MODE, MIC, ASK]);
    expect(stripStops()).toEqual([PAPERCLIP, MODE, MIC, ASK]);
  });

  it("adds the X that empties the box just left of ASK, only while the box has words", () => {
    renderMain(HOLLOW_KNIGHT, WITH_WORDS);
    expect(stripReads()).toEqual([PAPERCLIP, "tag: Hollow Knight", MODE, MIC, CLEAR, ASK]);
    // Nothing of the old X is left under the box either.
    expect(pane.querySelectorAll('button[aria-label="Clear"]').length).toBe(1);
  });

  it("while an answer is being written: Stop in the mic's place, ASK still last, resting", () => {
    renderMain(NO_GAME, { isAsking: true });
    expect(stripReads()).toEqual([PAPERCLIP, "tag: No game", MODE, STOP, ASK]);
    // The paperclip rests too during an answer, as it did before plan 84; ASK joins it.
    expect(stripStops()).toEqual([MODE, STOP]);
  });
});

describe("P84-ASK-01: the small ASK asks; while an answer is being written it rests and Stop stops it", () => {
  it("A on ASK asks, and the ring goes to the question box by Steam's transfer", () => {
    const onAskOllama = vi.fn();
    renderMain(NO_GAME, { ...WITH_WORDS, onAskOllama });
    putRingOn(byLabel(ASK));

    press("onOKButton");

    expect(onAskOllama).toHaveBeenCalledTimes(1);
    expect(ring()).toBe(questionBox());
    expect(hoisted.transfers).toContain(questionBox());
  });

  it("a tap on ASK asks too", () => {
    const onAskOllama = vi.fn();
    renderMain(NO_GAME, { ...WITH_WORDS, onAskOllama });
    act(() => {
      fireEvent.click(byLabel(ASK));
    });
    expect(onAskOllama).toHaveBeenCalledTimes(1);
  });

  it("rests while an answer is being written: dimmed with the real stylesheet, and neither A nor a tap asks", () => {
    const style = document.createElement("style");
    style.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(style);
    const onAskOllama = vi.fn();
    const view = renderMain(NO_GAME, { ...WITH_WORDS, onAskOllama });
    expect(getComputedStyle(byLabel(ASK)).opacity).not.toBe("0.38");

    view.rerender(<Harness context={NO_GAME} over={{ ...WITH_WORDS, onAskOllama, isAsking: true }} />);
    const ask = byLabel(ASK) as HTMLButtonElement;
    expect(ask.disabled).toBe(true);
    expect(getComputedStyle(ask).opacity).toBe("0.38");
    act(() => {
      fireEvent.click(ask);
      (ask as NavEl).__nav?.onOKButton?.({ stopPropagation: () => {} });
    });
    expect(onAskOllama).not.toHaveBeenCalled();
  });

  it("Stop, in the mic's place, stops the answer and hands the ring to the question box", () => {
    const onCancelAsk = vi.fn();
    renderMain(NO_GAME, { isAsking: true, onCancelAsk });
    putRingOn(questionBox());

    press("onMoveDown");
    expect(nameOf(ring())).toBe(STOP);
    press("onOKButton");

    expect(onCancelAsk).toHaveBeenCalledTimes(1);
    expect(ring()).toBe(questionBox());
  });
});

describe("P84-ASK-02: the D-pad in and around the strip (docs/focus-graph.md, 'The ask box's strip')", () => {
  it("Down from the box lands on ASK; Up from ASK comes back to the box by Steam's transfer", () => {
    renderMain(NO_GAME, WITH_WORDS);
    putRingOn(questionBox());

    expect(press("onMoveDown")).toBe(true);
    expect(nameOf(ring())).toBe(ASK);

    hoisted.transfers = [];
    expect(press("onMoveUp")).toBe(true);
    expect(ring()).toBe(questionBox());
    expect(hoisted.transfers).toEqual([questionBox()]);
  });

  it("walks Left from ASK to the paperclip one stop at a time and holds there, then Right back to ASK and holds", () => {
    renderMain(NO_GAME);
    putRingOn(questionBox());
    press("onMoveDown");

    expect(walk("onMoveLeft")).toEqual([ASK, MIC, MODE, PAPERCLIP]);
    expect(walk("onMoveRight")).toEqual([PAPERCLIP, MODE, MIC, ASK]);
  });

  it("with words in the box the walk takes in the X between the mic and ASK", () => {
    renderMain(HOLLOW_KNIGHT, WITH_WORDS);
    putRingOn(questionBox());
    press("onMoveDown");

    expect(walk("onMoveLeft")).toEqual([ASK, CLEAR, MIC, MODE, PAPERCLIP]);
    expect(walk("onMoveRight")).toEqual([PAPERCLIP, MODE, MIC, CLEAR, ASK]);
  });

  it("Up from every stop in the strip lands on the question box", () => {
    renderMain(NO_GAME, WITH_WORDS);
    for (const label of [PAPERCLIP, MODE, MIC, CLEAR, ASK]) {
      putRingOn(byLabel(label));
      press("onMoveUp");
      expect(nameOf(ring()), `Up from ${label}`).toBe("question box");
    }
  });

  it("Down from the strip is left to Steam, and with nothing under the box the ring stays", () => {
    renderMain(NO_GAME, WITH_WORDS);
    for (const label of [PAPERCLIP, MODE, MIC, CLEAR, ASK]) {
      const stop = byLabel(label);
      putRingOn(stop);
      expect(press("onMoveDown"), `Down from ${label} claimed`).toBe(false);
      expect(ring(), `Down from ${label}`).toBe(stop);
    }
  });

  it("while an answer is being written, Down from the box lands on Stop and no walk lands on the resting ASK", () => {
    renderMain(NO_GAME, { isAsking: true });
    putRingOn(questionBox());
    press("onMoveDown");
    expect(nameOf(ring())).toBe(STOP);

    // The paperclip rests during an answer too (as before plan 84), so the walk's left end is the mode button.
    expect(walk("onMoveRight")).toEqual([STOP]);
    expect(walk("onMoveLeft")).toEqual([STOP, MODE]);
    expect(walk("onMoveRight")).toEqual([MODE, STOP]);
  });

  it("while an answer is being written with words in the box, the walk ends on the X", () => {
    renderMain(NO_GAME, { ...WITH_WORDS, isAsking: true });
    putRingOn(questionBox());
    press("onMoveDown");

    expect(walk("onMoveRight")).toEqual([STOP, CLEAR]);
    expect(walk("onMoveLeft")).toEqual([CLEAR, STOP, MODE]);
  });
});
