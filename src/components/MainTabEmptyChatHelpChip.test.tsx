/**
 * Title: An empty new chat: the D-pad reaches the "How to use bonsAI" chip and comes back
 * Purpose: On a fresh install the row above the question box holds only the help chip. On the stand-in
 *          (plan87-S-S1-HELP-CHIP.json) Up from the box went straight past it to the tab bar, and Down
 *          came back to the box without it. The ring is carried to the chip the way it is carried to any
 *          other chip: by Steam's own transfer (`navRef.TakeFocus`, which this file records), not by a plain
 *          focus() that moves the DOM's focus and leaves the D-pad where it was.
 * Used for: MainTab rendered with no turns and the help chip showing; MainTabPresetRow.tsx,
 *           useMainTabAskBarFocus.ts (Up from the box).
 * Does not: Prove the pad on a real screen; the transfer is the harness's TakeFocus, as in
 *           DetailsSlot.deck.test.tsx.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { MainTab } from "./MainTab";
import type { MainTabProps } from "./MainTab";
import { resetUiDocument } from "../utils/uiDocument";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";

type Handlers = Partial<Record<"onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight", (e?: unknown) => unknown>>;
type NavEl = HTMLElement & { __nav?: Handlers };

const hoisted = vi.hoisted(() => ({ transfers: [] as HTMLElement[] }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  /* Keeps the move handlers on the element, and gives `navRef` Steam's TakeFocus: the ring goes to the
     container's first live child. Every transfer is recorded. */
  const withNav = (Base: React.ElementType) =>
    React.forwardRef<HTMLDivElement, Record<string, unknown>>(function NavStub(props, ref) {
      const { navRef, ...rest } = props as Record<string, unknown> & { navRef?: { current: unknown } };
      const setRef = (el: HTMLDivElement | null) => {
        if (el) {
          const p = props as Handlers;
          (el as NavEl).__nav = {
            onMoveUp: p.onMoveUp, onMoveDown: p.onMoveDown, onMoveLeft: p.onMoveLeft, onMoveRight: p.onMoveRight,
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
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      };
      return <Base {...rest} ref={setRef} />;
    });
  return { ...stubs, Focusable: withNav(stubs.Focusable), TextField: withNav(stubs.TextField) };
});

function Harness() {
  const props = {
    fullBleedRowStyle: {}, isAsking: false, selectedAttachment: null, ollamaContext: {}, unifiedInput: "",
    showSlowWarning: false, latencyWarningSeconds: 30, ollamaResponse: "", elapsedSeconds: null,
    lastApplied: null, canSaveDesktopNote: false, onOpenDesktopNoteSave: () => {}, askMode: "strategy",
    askThreadCollapsed: [], expandedTurnKey: null, askThreadDisplayQuestion: "",
    lastExchange: null, transparencySnapshot: null,
    liveReplyFeedbackRating: null, onReplyFeedback: () => {}, onReplyMicroAction: () => {},
    onAskOllama: async () => {}, onTurnActivate: () => {}, onRetryLastResponse: () => {},
    suggestedPrompts: [{ text: "How can I optimize for battery life?" }], showPluginHelpChip: true,
    onOpenPluginHelp: () => {},
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

let root: HTMLDivElement;
const aboveTheChat: string[] = [];

function ring(): HTMLElement | null {
  return document.activeElement as HTMLElement | null;
}
function nameOf(el: Element | null): string {
  if (!el || el === document.body) return "nothing";
  if (el.closest(".bonsai-preset-help-chip")) return "help chip";
  if (el.closest(".bonsai-unified-input-host") || el.matches('[data-decky-ui="TextField"]')) return "question box";
  return (el as HTMLElement).getAttribute("aria-label") ?? el.className;
}
/** One press, as Steam delivers it: the ring's own handler first, then each container's. */
function press(key: keyof Handlers): boolean {
  let el = ring() as NavEl | null;
  let claimed = false;
  act(() => {
    while (el) {
      const h = el.__nav?.[key];
      if (h && h({ preventDefault: () => {} }) === true) {
        claimed = true;
        return;
      }
      el = el.parentElement as NavEl | null;
    }
  });
  return claimed;
}

beforeEach(() => {
  resetUiDocument();
  resetNavFocusRegistry();
  hoisted.transfers = [];
  aboveTheChat.length = 0;
  /* The stops above the chat, as Steam's graph holds them: a press that reaches one is recorded. */
  for (const id of ["chat-name", "tab-bar"] as const) {
    registerNavFocus(id, { current: { TakeFocus: () => { aboveTheChat.push(id); return true; } } });
  }
  root = document.createElement("div");
  root.className = "bonsai-scope";
  document.body.appendChild(root);
  render(<Harness />, { container: root });
  root.querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"], [data-decky-ui="TextField"]').forEach((el) => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  });
  act(() => root.querySelector<HTMLElement>('[data-decky-ui="TextField"]')!.focus());
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("an empty new chat with only the help chip in the row above the question box", () => {
  it("the help chip is drawn, and nothing else is in the row", () => {
    expect(root.querySelectorAll(".bonsai-preset-help-chip")).toHaveLength(1);
    expect(root.querySelectorAll(".bonsai-preset-carousel-slot")).toHaveLength(0);
  });

  it("Up from the question box carries the ring to the help chip by Steam's transfer, not past it", () => {
    expect(nameOf(ring())).toBe("question box");
    press("onMoveUp");
    expect(nameOf(ring())).toBe("help chip");
    expect(hoisted.transfers.map(nameOf)).toEqual(["help chip"]);
    expect(aboveTheChat).toEqual([]);
  });

  it("Down from the chip returns to the question box; a bounded walk Up, Down, Up, Down visits no stop twice in a row", () => {
    const stops = [nameOf(ring())];
    for (const key of ["onMoveUp", "onMoveDown", "onMoveUp", "onMoveDown"] as const) {
      press(key);
      stops.push(nameOf(ring()));
    }
    expect(stops).toEqual(["question box", "help chip", "question box", "help chip", "question box"]);
  });

  it("Up from the chip goes on to the stop above the chat, as Up from any chip does", () => {
    press("onMoveUp");
    expect(press("onMoveUp")).toBe(true);
    expect(aboveTheChat.length).toBe(1);
  });

  it("Left and Right on the chip are held, so the ring does not leave the plugin", () => {
    press("onMoveUp");
    expect(press("onMoveLeft")).toBe(true);
    expect(press("onMoveRight")).toBe(true);
    expect(nameOf(ring())).toBe("help chip");
  });
});
