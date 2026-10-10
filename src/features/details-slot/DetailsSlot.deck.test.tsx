/**
 * Title: The Show details line takes the chip's place above the question box
 * Purpose: Pin plan 79's feature (roadmap: "While reading an answer, the Show details line takes the
 *          suggestion chip's place above the question box"; drawing details-line-swap.html, way 2). At
 *          the level the Deck check looks at: what the slot above the question box shows (the computed
 *          visibility, with the plugin's real stylesheet) at each place in the chat, where the ring is
 *          after each press, where the real line sits on screen, and whether the details opened in the
 *          chat under the real line.
 * Used for: DetailsSlot.tsx, detailsSlotStore.ts, buildReplyActionsElement.tsx (the real line) and
 *           useMainTabAskBarFocus.ts (Up from the question box), rendered together in the real MainTab.
 * Solves: jsdom has no layout, so every box is given in the Deck's numbers (the pane from y 88 to 366,
 *         the dock from 290, deckAnswerWalk.ts's) and follows the pane's scrollTop; the dock stays put.
 *         Steam's own scroll-into-view after a landing is modelled the harness's two ways ("top" puts a
 *         stop that is not wholly in the reading area at its top, "padded" 116 px below it), and the
 *         plugin's lift off the dock runs as on the Deck. A press runs the move handler of the element
 *         holding focus, then its containers', as Steam does; Steam's transfer (`navRef.TakeFocus`) is
 *         recorded, so a test can tell the ring was carried across by Steam, not by a plain focus().
 * Does not: Prove the fade's look or its timing on screen; the reduced-motion test reads the stylesheet.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { MainTab } from "../../components/MainTab";
import type { MainTabProps } from "../../components/MainTab";
import type { AskThreadCollapsedTurn } from "../../types/bonsaiUi";
import type { TransparencySnapshot } from "../../utils/inputTransparency";
import { resetUiDocument } from "../../utils/uiDocument";
import { resetNavFocusRegistry } from "../../utils/navFocusRegistry";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import { buildDetailsSlotSection } from "../../styles/sections/detailsSlot";
import { PANE_TOP } from "../../test-harness/deckAnswerWalk";
import { resetDetailsSlotStore } from "./detailsSlotStore";

type Handlers = Partial<Record<"onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight" | "onOKButton" | "onCancelButton", (e?: unknown) => unknown>>;
type NavEl = HTMLElement & { __nav?: Handlers };

const hoisted = vi.hoisted(() => ({ transfers: [] as HTMLElement[] }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  /* Keeps the move, A and B handlers on the element, and gives `navRef` Steam's TakeFocus: the ring
     goes to the container's first live child, or the container itself. Every transfer is recorded. */
  const withNav = (Base: React.ElementType) =>
    React.forwardRef<HTMLDivElement, Record<string, unknown>>(function NavStub(props, ref) {
      const { navRef, ...rest } = props as Record<string, unknown> & { navRef?: { current: unknown } };
      const setRef = (el: HTMLDivElement | null) => {
        if (el) {
          const p = props as Handlers;
          (el as NavEl).__nav = {
            onMoveUp: p.onMoveUp, onMoveDown: p.onMoveDown, onMoveLeft: p.onMoveLeft,
            onMoveRight: p.onMoveRight, onOKButton: p.onOKButton, onCancelButton: p.onCancelButton,
          };
          if (navRef) {
            navRef.current = {
              TakeFocus: () => {
                const first = el.querySelector<HTMLElement>("button:not([disabled]), [tabindex]");
                const target = first ?? el;
                target.focus();
                hoisted.transfers.push(target);
                return true;
              },
            };
          }
        }
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      };
      return <Base {...rest} ref={setRef} />;
    });
  return { ...stubs, Focusable: withNav(stubs.Focusable), TextField: withNav(stubs.TextField) };
});

/* ---------- the Deck's numbers ---------- */
const DOCK_TOP = 290;
const PANE_BOTTOM = 366;
const READ_H = DOCK_TOP - PANE_TOP;
type Box = [number, number];
/** Page coordinates with the pane at scrollTop 0 (the harness's convention). */
const HEADER: Box = [100, 130];
const SECTIONS: Box[] = [[140, 320], [328, 508], [516, 696]];
const RATING: Box = [704, 736];
const LINE: Box = [744, 759];
const TABS: Box = [767, 800];
const LADDER: Box = [808, 1100];
const SLOT_FACE: Box = [DOCK_TOP, DOCK_TOP + 30];
const ASK_BAR: Box = [DOCK_TOP + 32, PANE_BOTTOM];

let pane: HTMLDivElement;
/** "nearest" is the Deck's own landing in plan81-QA-FREE-PLAY-01-NOGAME.json: scrolled just enough, the line 2 px above the dock. */
let rule: "top" | "padded" | "nearest" = "top";

function rect(top: number, bottom: number): DOMRect {
  return { top, bottom, left: 0, right: 300, width: 300, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}
function panelOpen(): boolean {
  return Boolean(pane.querySelector(".bonsai-details-tabs-row"));
}
/** The box the Deck would give `el`: fixed in the dock, scrolling everywhere else. */
function screenBox(el: Element): Box {
  if (el === pane) return [PANE_TOP, PANE_BOTTOM];
  const dock = el.closest(".bonsai-main-tab-dock");
  if (dock) {
    if (el === dock) return [DOCK_TOP, PANE_BOTTOM];
    return el.closest(".bonsai-details-slot") ? SLOT_FACE : ASK_BAR;
  }
  const page = pageBox(el);
  return [page[0] - pane.scrollTop, page[1] - pane.scrollTop];
}
function pageBox(el: Element): Box {
  if (el.closest(".bonsai-chat-details-divider")) return LINE;
  if (el.closest(".bonsai-details-tabs-row")) return TABS;
  if (el.closest(".bonsai-chip-ladder")) return LADDER;
  const stop = el.closest(".bonsai-answer-stop");
  if (stop) {
    const all = Array.from(pane.querySelectorAll(".bonsai-answer-stop"));
    return SECTIONS[Math.min(all.indexOf(stop), SECTIONS.length - 1)]!;
  }
  if (el.closest(".bonsai-chat-ai-bubble")) return [SECTIONS[0]![0] - 9, SECTIONS[2]![1] + 9];
  if (el.closest(".bonsai-chat-turn-row-header, .bonsai-chat-turn-row-body")) return HEADER;
  if (el.closest(".bonsai-chat-turn-slot")) {
    if (el.matches(".bonsai-chat-turn-slot")) return [HEADER[0], panelOpen() ? LADDER[1] : LINE[1] + 40];
    return RATING;
  }
  return [0, 20];
}
const MAX_SCROLL = 1300;
function setScroll(y: number) {
  pane.scrollTop = Math.max(0, Math.min(MAX_SCROLL, y));
}

/** Steam's glide after a landing, the harness's two rules; nothing in the dock moves. */
function steamGlide(el: Element | null) {
  if (!el || !pane.contains(el) || el.closest(".bonsai-main-tab-dock")) return;
  const [top, bottom] = screenBox(el);
  if (bottom - top > READ_H) return;
  const inside = top >= PANE_TOP && bottom <= DOCK_TOP;
  if (inside) return;
  if (rule === "nearest" && bottom > DOCK_TOP) {
    setScroll(pane.scrollTop + bottom - (DOCK_TOP - 2));
    return;
  }
  const target = rule === "padded" && bottom - top < 100 ? PANE_TOP + 116 : PANE_TOP;
  setScroll(pane.scrollTop + top - target);
}

/** Let the slot re-measure and every settle pass (150/300/900 ms) run. */
function settle(ms = 1000) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}
function scrollChatTo(y: number) {
  /* A finger or a stick scrolls long after the ring last moved, not in Steam's glide after a landing. */
  act(() => {
    vi.advanceTimersByTime(1300);
  });
  setScroll(y);
  act(() => {
    pane.dispatchEvent(new Event("scroll"));
  });
  settle(400);
}

/* ---------- the chat ---------- */
const ANSWER = [
  "Nail upgrades come from the Nailsmith, and every step costs Geo plus Pale Ore.",
  "Pale Ore is not sold. You find it in hard-to-reach spots and as rewards for tough fights.",
  "Before you spend anything, check your map for markers; the ore is easy to miss.",
].join("\n\n");
const QUESTION = "How do I upgrade my nail?";

function snapshot(): TransparencySnapshot {
  return {
    route: "ollama", raw_question: "q", sanitizer_action: "none", sanitizer_reason_codes: [],
    text_after_sanitizer: "q", ollama_model: "gemma4", system_prompt: null, user_text_for_model: null,
    user_image_count: 0, attachment_paths: [], assistant_raw: null, assistant_after_attachment_format: null,
    final_response: ANSWER, applied: null, success: true, app_id: "", app_name: "", pc_ip: "",
    error_message: "", elapsed_seconds: 1.2,
    context_chips: [{ id: "c1", rank: 1, label: "Reply style", attached: true, tier_class: "", body: { title: "Reply style", paths: [], bullets: [] } }],
    ask_diagnostics: null,
  } as unknown as TransparencySnapshot;
}

function Harness({ asking = false }: { asking?: boolean }) {
  const expanded = "t1";
  const turn: AskThreadCollapsedTurn = { id: "t1", question: QUESTION, answer: ANSWER, transparency: snapshot() };
  const props = {
    fullBleedRowStyle: {}, isAsking: asking, selectedAttachment: null, ollamaContext: {}, unifiedInput: "",
    showSlowWarning: false, latencyWarningSeconds: 30, ollamaResponse: "", elapsedSeconds: null,
    lastApplied: null, canSaveDesktopNote: false, onOpenDesktopNoteSave: () => {}, askMode: "strategy",
    askThreadCollapsed: [turn], expandedTurnKey: expanded, askThreadDisplayQuestion: "",
    lastExchange: { question: QUESTION, answer: ANSWER }, transparencySnapshot: snapshot(),
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
  } as unknown as MainTabProps;
  return <MainTab {...props} />;
}

function renderChat(asking = false) {
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  pane = document.createElement("div");
  pane.className = "TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: MAX_SCROLL + (PANE_BOTTOM - PANE_TOP), configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: PANE_BOTTOM - PANE_TOP, configurable: true });
  scope.appendChild(pane);
  document.body.appendChild(scope);
  render(<Harness asking={asking} />, { container: pane });
  pane.querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"], [data-decky-ui="TextField"]').forEach((el) => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  });
  settle(400);
}

/* ---------- what a person sees ---------- */
function visible(el: Element | null): boolean {
  return Boolean(el) && getComputedStyle(el as Element).visibility !== "hidden";
}
function slotLine(): HTMLElement {
  return pane.querySelector<HTMLElement>(".bonsai-details-slot__line")!;
}
function slotChips(): HTMLElement {
  return pane.querySelector<HTMLElement>(".bonsai-details-slot__chips")!;
}
function realLine(): HTMLElement {
  return pane.querySelector<HTMLElement>(".bonsai-chat-details-divider")!;
}
/** What the slot above the question box shows: exactly one face, never both, never none. */
function slotHolds(): string {
  const line = visible(slotLine());
  const chip = visible(slotChips());
  if (line === chip) return `broken (line ${line}, chip ${chip})`;
  return line ? `line: ${slotLine().textContent}` : "chip";
}
function ring(): HTMLElement | null {
  return document.activeElement as HTMLElement | null;
}
function nameOf(el: Element | null): string {
  if (!el || el === document.body) return "nothing";
  if (el.closest(".bonsai-details-slot__line")) return "slot line";
  if (el.closest(".bonsai-details-slot__chips")) return "chip";
  if (el.closest(".bonsai-chat-details-divider")) return "real line";
  if (el.closest(".bonsai-unified-input-host") || el.matches('[data-decky-ui="TextField"]')) return "question box";
  const stop = el.closest(".bonsai-answer-stop");
  if (stop) return `section ${Array.from(pane.querySelectorAll(".bonsai-answer-stop")).indexOf(stop) + 1}`;
  return (el as HTMLElement).getAttribute("aria-label") ?? el.className;
}
/** The ring is on something a person can see: in the dock, or wholly inside the reading area. */
function ringVisible(): boolean {
  const el = ring();
  if (!el || el === document.body || !visible(el)) return false;
  if (el.closest(".bonsai-main-tab-dock")) return true;
  const [top, bottom] = screenBox(el);
  return top >= PANE_TOP - 1 && bottom <= DOCK_TOP + 4;
}

/**
 * When on, a Down press that no handler claims goes to Steam's own default step, as on the Deck: the
 * next focusable after the ring in the page's order. Steam reads no CSS, so a face that is
 * `visibility: hidden` is still a stop (plan81-QA-FREE-PLAY-01-NOGAME.json: the ring sat on a hidden chip).
 */
let steamDefaultStep = false;
function steamDefaultDown() {
  const from = ring();
  if (!from) return;
  const edge = from.getBoundingClientRect().bottom;
  const below = Array.from(pane.querySelectorAll<HTMLElement>("[tabindex], button:not([disabled])"))
    .map((el, order) => ({ el, order, top: el.getBoundingClientRect().top }))
    .filter(({ el, top }) => el !== from && !from.contains(el) && top >= edge - 0.5)
    .sort((a, b) => a.top - b.top || a.order - b.order);
  const next = below[0]?.el;
  if (next) act(() => next.focus());
}

/** One press, as Steam delivers it: the ring's own handler first, then each container's. */
function press(key: keyof Handlers): boolean {
  let el = ring() as NavEl | null;
  let claimed = false;
  act(() => {
    while (el) {
      const h = el.__nav?.[key];
      if (h && (h({ preventDefault: () => {} }) === true || key === "onOKButton" || key === "onCancelButton")) {
        claimed = true;
        return;
      }
      el = el.parentElement as NavEl | null;
    }
  });
  if (!claimed && key === "onMoveDown" && steamDefaultStep) steamDefaultDown();
  steamGlide(ring());
  settle();
  return claimed;
}
function focusQuestionBox() {
  const box = pane.querySelector<HTMLElement>('[data-decky-ui="TextField"]')!;
  act(() => box.focus());
}

beforeEach(() => {
  vi.useFakeTimers();
  resetUiDocument();
  resetNavFocusRegistry();
  resetDetailsSlotStore();
  hoisted.transfers = [];
  rule = "top";
  steamDefaultStep = false;
  const style = document.createElement("style");
  style.textContent = buildBonsaiScopeStylesheet();
  document.head.appendChild(style);
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (!pane || !pane.contains(this)) return rect(0, 0);
    const [top, bottom] = screenBox(this);
    return rect(top, bottom);
  };
  Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
    /* The harness's own model of the lift's request: "end" lands 80 px above the pane's bottom. */
    if (!pane?.contains(this) || this.closest(".bonsai-main-tab-dock") || typeof arg !== "object" || arg.block !== "end") return;
    const margin = parseFloat((this as HTMLElement).style.scrollMarginBottom) || 0;
    setScroll(pane.scrollTop + screenBox(this)[1] - (PANE_BOTTOM - 80 - margin));
  };
});
afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("what the slot above the question box holds as the chat scrolls (the drawing's rule)", () => {
  it("shows the line while the answer is read and its line is out of sight, the chip once the line is on screen or the answer is past", () => {
    renderChat();
    const seen: Array<[number, string]> = [];
    for (const y of [0, 300, 450, 470, 480, 560, 640, 700, 560, 470, 300]) {
      scrollChatTo(y);
      seen.push([y, slotHolds()]);
    }
    expect(seen).toEqual([
      [0, "line: Show details ↓"], // reading the question: the line is far below the dock
      [300, "line: Show details ↓"], // in the middle of the answer
      [450, "line: Show details ↓"], // the line is just behind the dock
      [470, "line: Show details ↓"], // on screen by 1 px, but not yet 8 px inside: no blink at the edge
      [480, "chip"], // the real line is on screen
      [560, "chip"],
      [640, "chip"],
      [700, "chip"], // scrolled past the answer
      [560, "chip"],
      [470, "chip"], // coming back up: still wholly on screen, so the chip stays
      [300, "line: Show details ↓"],
    ]);
  });

  it("keeps the dock the same height: both faces sit in one 30 px cell", () => {
    renderChat();
    const css = buildDetailsSlotSection();
    expect(css).toMatch(/\.bonsai-details-slot > \*\s*\{[^}]*grid-area: 1 \/ 1/);
    expect(css).toMatch(/\.bonsai-details-slot__line\s*\{[^}]*height: 30px/);
  });

  it("never swaps while a question is being answered (the real line is greyed then)", () => {
    renderChat(true);
    for (const y of [0, 300, 450]) {
      scrollChatTo(y);
      expect(slotHolds()).toBe("chip");
    }
  });
});

describe("the ring around the slot", () => {
  it.each(["top", "padded"] as const)("Up from the question box lands on the line when the slot holds it (%s glide)", (r) => {
    rule = r;
    renderChat();
    scrollChatTo(300);
    focusQuestionBox();
    expect(press("onMoveUp")).toBe(true);
    expect(nameOf(ring())).toBe("slot line");
    expect(ringVisible()).toBe(true);
  });

  it("Up from the question box lands on the chip when the real line is on screen", () => {
    renderChat();
    scrollChatTo(560);
    focusQuestionBox();
    press("onMoveUp");
    expect(nameOf(ring())).toBe("chip");
  });

  it("Down from the slot's line goes to the question box", () => {
    renderChat();
    scrollChatTo(300);
    focusQuestionBox();
    press("onMoveUp");
    expect(press("onMoveDown")).toBe(true);
    expect(nameOf(ring())).toBe("question box");
  });

  it("a swap with the ring on the slot keeps the ring in the slot, on the face that replaced it", () => {
    renderChat();
    scrollChatTo(300);
    focusQuestionBox();
    press("onMoveUp");
    expect(nameOf(ring())).toBe("slot line");
    scrollChatTo(560); // a finger scrolls the chat: the real line comes on screen
    expect(slotHolds()).toBe("chip");
    expect(nameOf(ring())).toBe("chip");
    expect(ringVisible()).toBe(true);
    scrollChatTo(300);
    expect(nameOf(ring())).toBe("slot line");
    expect(ringVisible()).toBe(true);
  });

  it.each(["top", "padded"] as const)(
    "a bounded walk Up from the question box, through the slot and into the answer, visits no stop twice (%s glide)",
    (r) => {
      rule = r;
      renderChat();
      scrollChatTo(300);
      focusQuestionBox();
      const stops = [nameOf(ring())];
      for (let i = 0; i < 6; i += 1) {
        const before = ring();
        if (!press("onMoveUp") || ring() === before) break;
        expect(ringVisible(), `landing ${nameOf(ring())} is on screen`).toBe(true);
        stops.push(nameOf(ring()));
      }
      expect(stops.slice(0, 3)).toEqual(["question box", "slot line", "real line"]);
      expect(new Set(stops).size).toBe(stops.length);
    },
  );
});

describe("A, B and Hide details ↑ on the slot's line", () => {
  it.each(["top", "padded"] as const)(
    "A opens the details under the real line, puts that line 8 px from the top, and the ring ends on it (%s glide)",
    (r) => {
      rule = r;
      renderChat();
      scrollChatTo(300);
      focusQuestionBox();
      press("onMoveUp");
      expect(nameOf(ring())).toBe("slot line");

      press("onOKButton");

      // Steam's own transfer carried the ring to the real line's registered stop.
      expect(hoisted.transfers.map(nameOf)).toContain("real line");
      expect(nameOf(ring())).toBe("real line");
      // The details opened in the chat, right under the real line, not in the dock.
      const tabs = pane.querySelector(".bonsai-details-tabs-row");
      expect(tabs).not.toBeNull();
      expect(tabs!.closest(".bonsai-main-tab-dock")).toBeNull();
      expect(realLine().compareDocumentPosition(tabs!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(realLine().textContent).toContain("Hide details ↑");
      // The real line sits 8 px below the top of the reading area.
      expect(realLine().getBoundingClientRect().top).toBe(PANE_TOP + 8);
      // The slot gave way to the chip, and the ring was never left on it.
      expect(slotHolds()).toBe("chip");
      expect(ringVisible()).toBe(true);
    },
  );

  it("B on the real line afterwards closes the panel and the ring stays on that line", () => {
    renderChat();
    scrollChatTo(300);
    focusQuestionBox();
    press("onMoveUp");
    press("onOKButton");
    expect(pane.querySelector(".bonsai-details-tabs-row")).not.toBeNull();
    press("onCancelButton");
    expect(pane.querySelector(".bonsai-details-tabs-row")).toBeNull();
    expect(nameOf(ring())).toBe("real line");
  });

  it("B on the slot's line is left to Steam, as it is on a chip", () => {
    renderChat();
    expect((slotLine() as NavEl).__nav?.onCancelButton).toBeUndefined();
  });

  it("reading inside the open panel, the slot shows Hide details ↑; A closes it, brings the real line back, ring on it", () => {
    renderChat();
    scrollChatTo(300);
    focusQuestionBox();
    press("onMoveUp");
    press("onOKButton"); // open, from the slot
    focusQuestionBox();
    scrollChatTo(LINE[0] - PANE_TOP + 40); // the real line scrolls off the top; the panel is being read
    expect(slotHolds()).toBe("line: Hide details ↑");
    press("onMoveUp");
    expect(nameOf(ring())).toBe("slot line");

    press("onOKButton");

    expect(pane.querySelector(".bonsai-details-tabs-row")).toBeNull();
    expect(realLine().textContent).toContain("Show details ↓");
    expect(nameOf(ring())).toBe("real line");
    expect(realLine().getBoundingClientRect().top).toBe(PANE_TOP + 8);
    expect(slotHolds()).toBe("chip");
  });
});

describe("the fade", () => {
  it("is the tab bar's 120 ms, and an instant swap with reduced motion", () => {
    const css = buildDetailsSlotSection();
    expect(css).toMatch(/\.bonsai-details-slot__chips--away,[^{]*\{[^}]*transition: opacity 120ms ease-out, visibility 0s linear 120ms/);
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const sel of [
      ".bonsai-details-slot__chips,",
      ".bonsai-details-slot__chips--away,",
      ".bonsai-details-slot__line--shown,",
      ".bonsai-details-slot__line:not(.bonsai-details-slot__line--shown)",
    ]) {
      expect(reduced).toContain(sel);
    }
    expect(reduced).toMatch(/transition: none/);
  });
});

/*
 * The walk Down to the question box and back (plan 81, plan81-QA-FREE-PLAY-01-NOGAME.json). Whatever the
 * slot shows is the one stop between the answer's last control and the question box, both ways. On the
 * Deck Down landed on a chip that was hidden (the ring drawn on screen stayed on the answer's Show details,
 * a dead press) and never on the line the slot was showing, while Up from the box stopped on that line.
 */
/** Hidden to a person: the element or something around it is `visibility: hidden` or fully transparent. */
function seenByPerson(el: Element | null): boolean {
  for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || style.opacity === "0") return false;
  }
  return Boolean(el);
}
/** Press `key` up to `limit` times; every stop's name, with whether a person could see the ring there. */
function walk(key: "onMoveDown" | "onMoveUp", limit = 8) {
  const stops = [nameOf(ring())];
  const hidden: string[] = [];
  for (let i = 0; i < limit; i += 1) {
    const before = ring();
    press(key);
    if (ring() === before) break;
    stops.push(nameOf(ring()));
    if (!seenByPerson(ring())) hidden.push(nameOf(ring()));
    if (key === "onMoveDown" && nameOf(ring()) === "question box") break;
  }
  return { stops, hidden };
}
function ringOnRealLine() {
  act(() => realLine().focus());
}

describe("Down and Up between the answer's last control and the question box (the slot is one stop)", () => {
  beforeEach(() => {
    steamDefaultStep = true;
  });

  it.each(["top", "padded"] as const)(
    "slot showing the Show details line: Down from the answer's Show details lands on that line, then the box; Up is the same stops reversed, none hidden or repeated (%s glide)",
    (r) => {
      rule = r;
      renderChat();
      scrollChatTo(470); // the real line is on screen by 1 px: the slot keeps the line (no blink at the edge)
      expect(slotHolds()).toBe("line: Show details ↓");
      ringOnRealLine();
      const down = walk("onMoveDown");
      expect(down.stops).toEqual(["real line", "slot line", "question box"]);
      expect(down.hidden).toEqual([]);
      const up = walk("onMoveUp");
      expect(up.stops.slice(0, 3)).toEqual([...down.stops].reverse());
      expect(up.hidden).toEqual([]);
      expect(new Set(up.stops).size).toBe(up.stops.length);
    },
  );

  it("slot showing the chips: the chip is the one stop between the answer's Show details and the box, both ways", () => {
    renderChat();
    scrollChatTo(560);
    expect(slotHolds()).toBe("chip");
    ringOnRealLine();
    const down = walk("onMoveDown");
    expect(down.stops).toEqual(["real line", "chip", "question box"]);
    expect(down.hidden).toEqual([]);
    /* Up from the box lands on the chip; the chip's own Up is presetRowFocusNav.upFromChips.test.tsx's. */
    const up = walk("onMoveUp", 1);
    expect(up.stops).toEqual(["question box", "chip"]);
  });

  it("the slot swapping while the ring waits on the answer's Show details still gives a visible stop on the next Down", () => {
    renderChat();
    scrollChatTo(300);
    ringOnRealLine();
    scrollChatTo(560); // the chip is back
    expect(slotHolds()).toBe("chip");
    press("onMoveDown");
    expect(nameOf(ring())).toBe("chip");
    expect(seenByPerson(ring())).toBe(true);
  });
});

describe("the whole walk Down from the answer to the Ask button and back, with Steam's scroll", () => {
  beforeEach(() => {
    steamDefaultStep = true;
  });

  it.each(["top", "padded", "nearest"] as const)(
    "every stop is one a person can see, none repeats, the slot is the one stop before the box, and Up is Down reversed (%s glide)",
    (r) => {
      rule = r;
      renderChat();
      scrollChatTo(100);
      act(() => pane.querySelector<HTMLElement>(".bonsai-answer-stop")!.focus());
      steamGlide(ring());
      settle();
      const names: string[] = [nameOf(ring())];
      const slotWhenOnRealLine: string[] = [];
      for (let i = 0; i < 14; i += 1) {
        const before = ring();
        press("onMoveDown");
        if (ring() === before) continue; // a press that only scrolled a section being read is not a stop
        expect(seenByPerson(ring()), `${nameOf(ring())} is seen`).toBe(true);
        expect(ringVisible(), `${nameOf(ring())} is on screen (${screenBox(ring()!)})`).toBe(true);
        names.push(nameOf(ring()));
        if (nameOf(ring()) === "real line") slotWhenOnRealLine.push(slotHolds());
        if (nameOf(ring()) === "question box") break;
      }
      expect(names[names.length - 1]).toBe("question box");
      expect(new Set(names).size).toBe(names.length);
      /* A walk that came in with the line out of sight meets the slot's line on the way out, as the walk Up
         met it on the way in (plan83-QA-FREE-PLAY-01.json), though with the ring on the real line, wholly in
         the reading area, that line is the drawn one and the slot holds the chips for that one stop
         (plan82-M6-TWO-DETAILS-LINES.json: never both). */
      expect(slotWhenOnRealLine[0]).toBe("chip");
      expect(names.slice(-3)).toEqual(["real line", "slot line", "question box"]);
      // Up from the box: the same stops back to the real line.
      const up = walk("onMoveUp", 2);
      expect(up.stops).toEqual(["question box", "slot line", "real line"]);
      expect(up.hidden).toEqual([]);
    },
  );
});

/*
 * Never both Show details lines at once (roadmap: "both Show details lines on screen at once"; the Deck,
 * plan82-M6-TWO-DETAILS-LINES.json). Pressing Down through the newest answer, at press 10 the ring sat on
 * the answer's own line (579 to 594, wholly inside the pane) while the slot still drew its copy at 601 to
 * 631: the line was 6 px above the dock, inside the 8 px the slot holds on to so it does not blink.
 * The rules, checked on what a person sees:
 *   - at most one of the two lines is drawn (opacity above 0, not hidden) and on screen at any scroll;
 *   - with the ring on the answer's own line, that line is the drawn one and the slot holds the chips.
 * The Deck's numbers are scaled to this harness (dock top 290): press 9 is the line 6 px under the dock top,
 * press 10 the line wholly inside, 6 px above it, press 11 the line 70 px higher.
 */
/** Drawn to a person: not hidden, not transparent (the element or anything around it). */
function drawn(el: Element | null): boolean {
  return seenByPerson(el);
}
function onScreen(el: Element): boolean {
  const [top, bottom] = screenBox(el);
  return bottom > PANE_TOP && top < DOCK_TOP;
}
/** Both lines drawn and each at least partly in the reading area (the slot's is always in the dock). */
function bothLinesSeen(): boolean {
  return drawn(slotLine()) && drawn(realLine()) && onScreen(realLine());
}
/** Scroll so the real line's top sits at screen y `top`. */
function scrollLineTo(top: number) {
  scrollChatTo(LINE[0] - top);
}
const REAL_LINE_H = LINE[1] - LINE[0];

describe("the answer's own line and the slot's copy are never both seen", () => {
  it.each([
    ["press 8: the real line is behind the dock", DOCK_TOP + 40],
    ["press 9: the real line is partly under the slot", DOCK_TOP - 4],
    ["press 10: the real line is wholly inside the pane, 6 px above the dock", DOCK_TOP - 6 - REAL_LINE_H],
    ["press 11: the real line is 70 px higher", DOCK_TOP - 6 - REAL_LINE_H - 70],
  ])("%s", (_name, lineTop) => {
    renderChat();
    scrollLineTo(lineTop);
    expect(bothLinesSeen()).toBe(false);
  });

  it("scrolling the chat a pixel at a time, down then up, never draws both", () => {
    renderChat();
    const both: number[] = [];
    for (let y = 380; y <= 520; y += 1) {
      scrollChatTo(y);
      if (bothLinesSeen()) both.push(y);
    }
    for (let y = 520; y >= 380; y -= 1) {
      scrollChatTo(y);
      if (bothLinesSeen()) both.push(y);
    }
    expect(both).toEqual([]);
  });

  it("while the slot holds the line, the real line keeps its place in the layout (faded, not removed)", () => {
    renderChat();
    scrollLineTo(DOCK_TOP + 40);
    expect(slotHolds()).toBe("line: Show details ↓");
    expect(realLine().isConnected).toBe(true);
    expect(getComputedStyle(realLine()).display).not.toBe("none");
    expect(getComputedStyle(realLine()).opacity).toBe("0");
    scrollLineTo(DOCK_TOP - 100);
    expect(slotHolds()).toBe("chip");
    expect(getComputedStyle(realLine()).opacity).not.toBe("0");
  });

  it("the real line fades over the same 120 ms as the slot, and instantly with reduced motion", () => {
    const css = buildDetailsSlotSection();
    expect(css).toMatch(/\.bonsai-chat-details-divider\[data-slot-holds-line\][^{]*\{[^}]*opacity: 0 !important/);
    expect(css).toMatch(/\.bonsai-chat-details-divider\s*\{[^}]*transition: opacity 120ms ease-out/);
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".bonsai-chat-details-divider");
  });
});

describe("the ring on the answer's own line makes that line the drawn one", () => {
  it("press 10: ring on the real line, wholly inside the pane 6 px above the dock, slot shows the chips", () => {
    renderChat();
    scrollLineTo(DOCK_TOP + 40); // the slot holds the line, the real line behind the dock
    expect(slotHolds()).toBe("line: Show details ↓");
    scrollLineTo(DOCK_TOP - 6 - REAL_LINE_H);
    ringOnRealLine();
    settle();
    expect(slotHolds()).toBe("chip");
    expect(drawn(realLine())).toBe(true);
    expect(bothLinesSeen()).toBe(false);
  });

  it("Down through the answer one press at a time: at every press at most one line is drawn, and on the real line it is that one", () => {
    steamDefaultStep = true;
    renderChat();
    scrollChatTo(100);
    act(() => pane.querySelector<HTMLElement>(".bonsai-answer-stop")!.focus());
    steamGlide(ring());
    settle();
    for (let i = 0; i < 14; i += 1) {
      const before = ring();
      press("onMoveDown");
      expect(bothLinesSeen(), `after press ${i + 1} on ${nameOf(ring())}`).toBe(false);
      if (nameOf(ring()) === "real line") {
        expect(drawn(realLine()), "ring on the real line: it is drawn").toBe(true);
        expect(slotHolds()).toBe("chip");
      }
      if (nameOf(ring()) === "question box" || ring() === before) break;
    }
  });
});

/*
 * The same stops both ways (roadmap: "The slot under the newest answer swaps between the Show details line
 * and chips between an Up walk and a Down walk"; the Deck, plan83-QA-FREE-PLAY-01.json). On a long answer
 * Up from the box stopped on the slot's line and then on the answer's own line; Steam brought that line on
 * screen, the slot gave way to the chips (a44b79b7: the line on screen is the drawn one), and the Down
 * walk, a few minutes later, stopped on a chip in the slot's place. The slot's face is now remembered for
 * the whole stay in the answer, so Down meets the stop Up met.
 */
type Passing = { stop: string; slot: string; linesDrawn: number };
/** Press `key` until the ring stops moving, noting each stop and what the slot shows with the ring on it. */
function walkWithSlot(key: "onMoveDown" | "onMoveUp", until: string): Passing[] {
  const here = (): Passing => ({
    stop: nameOf(ring()),
    slot: slotHolds(),
    linesDrawn: [slotLine(), realLine()].filter((el) => drawn(el)).length,
  });
  const passings: Passing[] = [here()];
  for (let i = 0; i < 14; i += 1) {
    const before = ring();
    press(key);
    if (ring() === before) continue;
    expect(ringVisible(), `${nameOf(ring())} is on screen`).toBe(true);
    expect(seenByPerson(ring()), `${nameOf(ring())} is drawn`).toBe(true);
    passings.push(here());
    if (nameOf(ring()) === until) break;
  }
  return passings;
}
const stopsOf = (p: Passing[]) => p.map((x) => x.stop);

describe("a long answer: the walk Up from the question box and the walk Down back visit the same stops", () => {
  beforeEach(() => {
    steamDefaultStep = true;
  });

  it.each(["top", "padded", "nearest"] as const)(
    "Up to the top of the answer and Down again, twice: the Down stops are the Up stops reversed, with the slot showing the same face at each (%s glide)",
    (r) => {
      rule = r;
      renderChat();
      scrollChatTo(300); // the real line is far below the dock: the slot holds the line
      expect(slotHolds()).toBe("line: Show details ↓");
      focusQuestionBox();
      for (let round = 1; round <= 2; round += 1) {
        const up = walkWithSlot("onMoveUp", "section 1");
        expect(stopsOf(up).slice(0, 3), `round ${round} up`).toEqual(["question box", "slot line", "real line"]);
        expect(new Set(stopsOf(up)).size).toBe(up.length);
        const down = walkWithSlot("onMoveDown", "question box");
        expect(stopsOf(down), `round ${round} down`).toEqual(stopsOf(up).slice().reverse());
        /* The same face at each passing: what the slot shows with the ring on the slot's stop, and on the real line. */
        const faceAt = (list: Passing[], stop: string) => list.find((x) => x.stop === stop)?.slot;
        expect(faceAt(down, "slot line")).toBe(faceAt(up, "slot line"));
        expect(faceAt(down, "real line")).toBe(faceAt(up, "real line"));
        expect(faceAt(down, "slot line")).toBe("line: Show details ↓");
        /* One Show details line at a time, whichever stop the ring is on. */
        expect([...up, ...down].map((x) => x.linesDrawn)).toEqual(Array(up.length + down.length).fill(1));
      }
    },
  );

  it.each(["top", "padded"] as const)(
    "the ring left the answer and comes back in from above: Down still ends on the slot's line, then the box (%s glide)",
    (r) => {
      rule = r;
      renderChat();
      scrollChatTo(52);
      expect(slotHolds()).toBe("line: Show details ↓");
      focusQuestionBox(); // outside the answer: nothing is remembered
      act(() => pane.querySelector<HTMLElement>(".bonsai-answer-stop")!.focus());
      steamGlide(ring());
      settle();
      const down = walkWithSlot("onMoveDown", "question box");
      expect(stopsOf(down).slice(-3)).toEqual(["real line", "slot line", "question box"]);
      expect(new Set(stopsOf(down)).size).toBe(down.length);
    },
  );

  it("a short answer, whose own line is on screen when the ring is on the box, gives the chip both ways", () => {
    renderChat();
    scrollChatTo(560);
    expect(slotHolds()).toBe("chip");
    focusQuestionBox();
    /* A chip's own Up is presetRowFocusNav.upFromChips.test.tsx's: the harness's Button carries no handlers. */
    const up = walkWithSlot("onMoveUp", "section 1");
    expect(stopsOf(up)).toEqual(["question box", "chip"]);
    ringOnRealLine();
    const down = walkWithSlot("onMoveDown", "question box");
    expect(stopsOf(down)).toEqual(["real line", "chip", "question box"]);
  });
});
