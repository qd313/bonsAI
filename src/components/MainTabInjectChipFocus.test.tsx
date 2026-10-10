/**
 * Title: The suggestion the AI itself put forward: the D-pad reaches its chip and comes back
 * Purpose: After an answer the row above the question box can carry one extra chip below the suggestion
 *          chips, the AI's own suggestion (orange ring, `bonsai-pyro-inject-chip`). It sits between the
 *          suggestion chips and the box, so a person pressing Up from the box expects to land on it. It had
 *          no focus container Steam can move the ring into, so Up went past it to the suggestion chips
 *          and Down from the chips skipped it too: it could only be tapped. Same shape as the help chip
 *          (MainTabEmptyChatHelpChip.test.tsx): carried by Steam's own transfer (`navRef.TakeFocus`,
 *          recorded here), never a plain focus().
 * Used for: MainTab rendered with the suggestion chips showing and the AI's suggestion chip below them;
 *           MainTabPresetRow.tsx, useMainTabAskBarFocus.ts (Up from the box).
 * Does not: Prove the pad on a real screen; the transfer is the harness's TakeFocus, as in
 *           DetailsSlot.deck.test.tsx.
 */
import React from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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
  /* The suggestion chips carry their moves on the Button itself, so it records them too. */
  return {
    ...stubs,
    Focusable: withNav(stubs.Focusable),
    TextField: withNav(stubs.TextField),
    Button: withNav(stubs.Button),
  };
});

function Harness({ helpChip = false }: { helpChip?: boolean }) {
  const props = {
    fullBleedRowStyle: {}, isAsking: false, selectedAttachment: null, ollamaContext: {}, unifiedInput: "",
    showSlowWarning: false, latencyWarningSeconds: 30, ollamaResponse: "", elapsedSeconds: null,
    lastApplied: null, canSaveDesktopNote: false, onOpenDesktopNoteSave: () => {}, askMode: "strategy",
    askThreadCollapsed: [], expandedTurnKey: null, askThreadDisplayQuestion: "",
    lastExchange: null, transparencySnapshot: null,
    liveReplyFeedbackRating: null, onReplyFeedback: () => {}, onReplyMicroAction: () => {},
    onAskOllama: async () => {}, onTurnActivate: () => {}, onRetryLastResponse: () => {},
    suggestedPrompts: [{ text: "How can I optimize for battery life?" }], showPluginHelpChip: helpChip, presetCarouselInject: { text: "Try the flamethrower on the boss" },
    onOpenPluginHelp: () => {},
    presetChipAnimation: "static", filteredSettings: [], recentScreenshots: [],
    setUnifiedInput: () => {}, setIsUnifiedInputFocused: () => {},
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
let helpChipInRow = false;
const aboveTheChat: string[] = [];

function ring(): HTMLElement | null {
  return document.activeElement as HTMLElement | null;
}
function nameOf(el: Element | null): string {
  if (!el || el === document.body) return "nothing";
  if (el.closest(".bonsai-preset-help-chip")) return "help chip";
  if (el.closest(".bonsai-pyro-inject-chip")) return "suggestion from the AI";
  if (el.closest(".bonsai-preset-carousel-focus-root")) return "suggestion chips";
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
  render(<Harness helpChip={helpChipInRow} />, { container: root });
  root.querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"], [data-decky-ui="TextField"]').forEach((el) => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  });
  act(() => root.querySelector<HTMLElement>('[data-decky-ui="TextField"]')!.focus());
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("the AI's own suggestion chip below the suggestion chips", () => {
  it("both rows are drawn", () => {
    expect(root.querySelectorAll(".bonsai-pyro-inject-chip")).toHaveLength(1);
    expect(root.querySelectorAll(".bonsai-preset-carousel-focus-root").length).toBeGreaterThan(0);
  });

  it("Up from the question box carries the ring to the AI's chip by Steam's transfer, not past it", () => {
    expect(nameOf(ring())).toBe("question box");
    press("onMoveUp");
    expect(nameOf(ring())).toBe("suggestion from the AI");
    expect(hoisted.transfers.map(nameOf)).toEqual(["suggestion from the AI"]);
    expect(aboveTheChat).toEqual([]);
  });

  it("walks box, AI chip, suggestion chips, and back down the same way, no stop twice in a row", () => {
    const stops = [nameOf(ring())];
    for (const key of ["onMoveUp", "onMoveUp", "onMoveDown", "onMoveDown"] as const) {
      press(key);
      stops.push(nameOf(ring()));
    }
    expect(stops).toEqual([
      "question box",
      "suggestion from the AI",
      "suggestion chips",
      "suggestion from the AI",
      "question box",
    ]);
    expect(aboveTheChat).toEqual([]);
  });

  it("Up from the suggestion chips still goes on to the stop above the chat", () => {
    press("onMoveUp");
    press("onMoveUp");
    expect(press("onMoveUp")).toBe(true);
    expect(aboveTheChat.length).toBe(1);
  });

  it("Left and Right on the AI's chip are held, so the ring does not leave the plugin", () => {
    press("onMoveUp");
    expect(press("onMoveLeft")).toBe(true);
    expect(press("onMoveRight")).toBe(true);
    expect(nameOf(ring())).toBe("suggestion from the AI");
  });
});

describe("the AI's chip with the help chip in the row instead of the suggestion chips", () => {
  beforeAll(() => {
    helpChipInRow = true;
  });
  afterAll(() => {
    helpChipInRow = false;
  });

  it("the walk is box, AI chip, help chip, and back down the same way", () => {
    const stops = [nameOf(ring())];
    for (const key of ["onMoveUp", "onMoveUp", "onMoveDown", "onMoveDown"] as const) {
      press(key);
      stops.push(nameOf(ring()));
    }
    expect(stops).toEqual(["question box", "suggestion from the AI", "help chip", "suggestion from the AI", "question box"]);
  });
});
