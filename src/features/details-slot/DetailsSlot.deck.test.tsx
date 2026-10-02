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
let rule: "top" | "padded" = "top";

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
    presetChipAnimation: "static", filteredSettings: [], selectedIndex: 0, recentScreenshots: [],
    setUnifiedInput: () => {}, presetCarouselInject: null, setIsUnifiedInputFocused: () => {},
    isUnifiedInputFocused: false, setSelectedIndex: () => {}, onSettingClick: () => {}, ollamaIp: "127.0.0.1",
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
