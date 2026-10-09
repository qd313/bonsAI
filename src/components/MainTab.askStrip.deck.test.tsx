/**
 * Title: The ask box's strip on the Main tab (plan 84 step 2)
 * Purpose: Pin plan 84 step 2 at the level the Deck checks look at (rows P84-ASK-01 and P84-ASK-02): what the
 *          dock under the answer shows, what the question box's bottom strip shows and in which order, and
 *          (from the second commit on) what the small ASK button does and where the ring goes. The real
 *          MainTab is drawn inside a pane shaped like the Deck's own screen, the way DetailsSlot.deck.test.tsx
 *          draws it.
 * Used for: MainTab.tsx (the context line is gone), MainTabUnifiedAskBar.tsx and AskStripGameTag.tsx (the game
 *           tag in the strip).
 * Solves: jsdom has no layout, so a test cannot measure the 57 points the dock gives back; what it can read is
 *         that the two rows are gone from the dock and what the strip holds instead.
 * Does not: Measure heights or pixels; the answer area's height is the Deck's check (P84-HEIGHT-01's probe).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { MainTab } from "./MainTab";
import type { MainTabProps } from "./MainTab";
import type { OllamaContextUi } from "../types/bonsaiUi";
import { resetUiDocument } from "../utils/uiDocument";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return { ...stubs };
});

let pane: HTMLDivElement;

function Harness({ context }: { context: OllamaContextUi | Record<string, never> }) {
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
  } as unknown as MainTabProps;
  return <MainTab {...props} />;
}

function renderMain(context: OllamaContextUi | Record<string, never>) {
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  pane = document.createElement("div");
  pane.className = "TabContentsScroll";
  scope.appendChild(pane);
  document.body.appendChild(scope);
  render(<Harness context={context} />, { container: pane });
  act(() => {
    vi.advanceTimersByTime(400);
  });
}

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

const NO_GAME: OllamaContextUi = { app_id: "", app_context: "none" };
const HOLLOW_KNIGHT: OllamaContextUi = { app_id: "367520", app_context: "active", app_name: "Hollow Knight" };

beforeEach(() => {
  vi.useFakeTimers();
  resetUiDocument();
  resetNavFocusRegistry();
});
afterEach(() => {
  cleanup();
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
    expect(kids[0]?.getAttribute("aria-label")).toBe("Attach screenshot to Ask");
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
