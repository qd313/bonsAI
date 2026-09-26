/**
 * Title: Session context folds into Show details -- the tabs
 * Purpose: Pin plan 62 3c's "This answer / Session · N" tabs at the top of the newest answer's own
 *          Show details panel, and prove the way out in all four D-pad directions plus B -- the
 *          exact set the brief calls "what gets checked on the device" for this feature, because
 *          this panel has trapped the D-pad before and this change puts one panel inside another.
 * Used for: MainTabChatTranscript.tsx (buildDetailsPanelElement), SessionContextStrip.tsx
 *           (SessionContextTabBody), ContextChipLadder.tsx (its own B handling).
 * Solves: A jsdom test cannot prove Steam's own gamepad ring moves (AGENTS.md, "The Steam Deck
 *         focus graph") -- what it CAN prove, and what this file proves, is that the exact
 *         onMoveUp/onMoveDown/onMoveLeft/onMoveRight/onCancelButton props Steam invokes on device
 *         are wired to the right targets, the same standard SessionContextStrip.test.tsx
 *         and MainTabChatTranscript.reasoningFold.test.tsx already hold this codebase to.
 * Does not: Prove any of it on the device -- that is owed separately, and named unproven in the
 *           report until it runs.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { LastExchangeSnapshot } from "../types/backgroundAsk";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    }
  );
  return {
    ...stubs,
    Focusable: CapturingFocusable,
  };
});

const CHIP: ContextChip = {
  id: "game_context",
  rank: 1,
  label: "Game context",
  attached: true,
  tier_class: "",
  body: { title: "Game context", paths: [], bullets: ["Fought the exploders"] },
};

function snapshot(overrides: Partial<TransparencySnapshot> = {}): TransparencySnapshot {
  return {
    route: "ollama",
    raw_question: "how do i dodge the exploders",
    sanitizer_action: "none",
    sanitizer_reason_codes: [],
    text_after_sanitizer: "how do i dodge the exploders",
    ollama_model: "llama3:8b",
    system_prompt: null,
    user_text_for_model: null,
    user_image_count: 0,
    attachment_paths: [],
    assistant_raw: null,
    assistant_after_attachment_format: null,
    final_response: "Keep your distance and strafe.",
    applied: null,
    success: true,
    app_id: "",
    app_name: "",
    pc_ip: "",
    error_message: "",
    elapsed_seconds: 1.2,
    context_chips: [CHIP],
    ask_diagnostics: null,
    ...overrides,
  };
}

const LAST_EXCHANGE: LastExchangeSnapshot = {
  question: "how do i dodge the exploders",
  answer: "Keep your distance and strafe.",
};

function renderTranscript(overrides: Partial<MainTabChatTranscriptProps> = {}) {
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "Keep your distance and strafe.",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "how do i dodge the exploders",
    lastExchange: LAST_EXCHANGE,
    transparencySnapshot: snapshot(),
    ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

function clickShowDetails(container: HTMLElement) {
  const toggle = container.querySelector('[aria-label="Show details"], [aria-label="Hide details"]');
  expect(toggle).not.toBeNull();
  fireEvent.click(toggle!);
}

/*
 * `hoisted.focusableProps` is append-only across every re-render within one test (only `beforeEach`
 * clears it, between tests) -- a plain `.find()` would return the FIRST capture, i.e. the props
 * closure from before any state change, not the current one. `.findLast()` always reads the most
 * recently rendered props for that class, which is what "call the handler Steam would invoke right
 * now" means.
 */
function latestPropsFor(className: string): Record<string, unknown> | undefined {
  const matches = hoisted.focusableProps.filter((p) => p.className === className);
  return matches[matches.length - 1];
}

function tabsRowProps(): Record<string, unknown> | undefined {
  return latestPropsFor("bonsai-details-tabs-row");
}

function activeTabText(container: HTMLElement): string {
  return container.querySelector(".bonsai-details-tab--active")?.textContent ?? "";
}

// vi.hoisted state persists across tests in one file -- clear it before each so a capture from an
// earlier render never leaks into the next test's assertions.
beforeEach(() => {
  hoisted.focusableProps = [];
});

describe("the This answer / Session tabs, on the newest answer", () => {
  it("shows two tabs once Show details opens, This answer selected first", () => {
    const { container } = renderTranscript();
    clickShowDetails(container);

    expect(container.querySelector(".bonsai-details-tabs-row")).not.toBeNull();
    expect(activeTabText(container)).toBe("This answer");
    expect(container.textContent).toContain("Session · 1");
    // This answer's own content -- the existing chip ladder -- is what shows first.
    expect(container.querySelector(".bonsai-chip-ladder")).not.toBeNull();
  });

  it("does not add tabs to an older, hand-expanded turn -- a bare ladder, exactly as today", () => {
    const olderTurn: AskThreadCollapsedTurn = {
      id: "older-1",
      question: "an older question",
      answer: "an older answer",
      transparency: snapshot(),
    };
    const newestTurn: AskThreadCollapsedTurn = {
      id: "newest-1",
      question: "how do i dodge the exploders",
      answer: "Keep your distance and strafe.",
      transparency: snapshot(),
    };
    const { container } = renderTranscript({
      expandedTurnKey: "older-1",
      askThreadCollapsed: [olderTurn, newestTurn],
      transparencySnapshot: null,
      // No live turn in this scenario -- an empty display question and no lastExchange, or
      // `showLiveTurn` reads a non-blank `askThreadDisplayQuestion` as "there is a live turn too"
      // and the pair collapses behind an "N earlier" pill, hiding the very row under test.
      askThreadDisplayQuestion: "",
      lastExchange: null,
    });
    clickShowDetails(container);

    expect(container.querySelector(".bonsai-chip-ladder")).not.toBeNull();
    expect(container.querySelector(".bonsai-details-tabs-row")).toBeNull();
    expect(container.textContent).not.toContain("This answer");
  });

  /*
   * Roadmap: "The Session tab cannot be reached by the D-pad". Both tabs drew correctly on the
   * Deck and Left/Right worked once the ring was on them, but nothing walking DOWN ever put the
   * ring there: Down from Show details went straight past the tabs row into the chip ladder,
   * because the four Down handlers below the reply row were written before the tabs row existed
   * and were never taught about it. The Up direction already knew (`onMoveUpFromLadder` and
   * `onMoveUpFromFirstRow` both call `focusDetailsTabsRow`), so the row was reachable only by
   * walking past it and coming back -- which a person walking down the panel never does.
   * Each assertion here is the mirror of an existing Up one: same target, opposite direction.
   */
  describe("Down reaches the tabs row", () => {
    it("Down from Show details lands on the tabs row, not the chip ladder below it", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);

      const onMoveDown = latestPropsFor("bonsai-chat-details-divider")?.onMoveDown as
        | (() => boolean)
        | undefined;
      expect(onMoveDown).toBeTypeOf("function");
      act(() => {
        expect(onMoveDown!()).toBe(true);
      });

      const tabsRow = container.querySelector(".bonsai-details-tabs-row");
      expect(tabsRow).not.toBeNull();
      expect(document.activeElement).toBe(tabsRow);
    });

    it("Down from the tabs row still enters the active tab, so the walk carries on", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);

      const onMoveDown = tabsRowProps()?.onMoveDown as (() => boolean) | undefined;
      expect(onMoveDown).toBeTypeOf("function");
      act(() => {
        expect(onMoveDown!()).toBe(true);
      });

      expect(document.activeElement).not.toBe(container.querySelector(".bonsai-details-tabs-row"));
    });

    it("with the panel shut, Down from Show details skips the tabs row as before", () => {
      const { container } = renderTranscript();

      const onMoveDown = latestPropsFor("bonsai-chat-details-divider")?.onMoveDown as
        | (() => boolean)
        | undefined;
      expect(onMoveDown).toBeTypeOf("function");
      act(() => {
        onMoveDown!();
      });

      // Nothing to land on: the row only exists while the panel is open.
      expect(container.querySelector(".bonsai-details-tabs-row")).toBeNull();
    });
  });

  /*
   * Roadmap: "With Show details open, the chip row cannot be reached by the D-pad" and "The Show
   * details chip ladder is not a D-pad stop" -- two entries, one fault, measured on the Deck
   * 2026-09-21 (build 29ca207). Down from the tabs row on "This answer" threw the ring clean out
   * of the panel onto a preset chip in the dock, while the ladder sat unreached 150px above it.
   *
   * Cause: `focusContextChipLadder` finds the ladder by class and hands it to `focusDeckOwner`,
   * which returns FALSE for it -- the ladder's root is a genuine `.Panel.Focusable` carrying no
   * `tabindex` on device with no natively focusable descendant, the one shape `focusDeckOwner`
   * deliberately refuses to stamp (see its own test, "reports false rather than stamp a bare
   * Panel.Focusable leaf with no fallback"). With the move reported unhandled, Steam's own
   * navigation ran.
   *
   * This test cannot reproduce that in jsdom: the test harness's Focusable stub renders a plain
   * div carrying only our class, so `focusDeckOwner` treats it as ours, stamps a tabindex, and
   * succeeds -- which is exactly why the existing "This answer: Down focuses the chip ladder" test
   * passed all along while the device failed. So it removes the class the old path searched by.
   * That leaves only the by-name route, which is the route the fix adds. Watched failing with
   * `rootRef` taken off the ladder before being kept.
   */
  it("Down from the tabs row reaches the ladder by name, not by hunting for its class", () => {
    const { container } = renderTranscript();
    clickShowDetails(container);

    const ladder = container.querySelector(".bonsai-chip-ladder") as HTMLElement;
    expect(ladder).not.toBeNull();
    // Stand in for the device shape: the by-class lookup can no longer find it.
    ladder.classList.remove("bonsai-chip-ladder");
    expect(container.querySelector(".bonsai-chip-ladder")).toBeNull();

    const onMoveDown = tabsRowProps()?.onMoveDown as (() => boolean) | undefined;
    expect(onMoveDown).toBeTypeOf("function");
    act(() => {
      expect(onMoveDown!()).toBe(true);
    });

    expect(document.activeElement).toBe(ladder);
  });

  describe("Left and Right switch tabs", () => {
    it("Right moves onto Session, Left moves back onto This answer", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);

      const onMoveRight = tabsRowProps()?.onMoveRight as () => boolean;
      expect(onMoveRight).toBeTypeOf("function");
      act(() => {
        expect(onMoveRight()).toBe(true);
      });
      expect(activeTabText(container)).toBe("Session · 1");
      // The Session tab's own body is showing -- not asserting the ladder is gone: the body draws
      // its own chip ladder for whichever row is picked, which carries the same "bonsai-chip-ladder"
      // class as "This answer"'s (it is the same shared component either way).
      expect(container.querySelector(".bonsai-details-session-body")).not.toBeNull();
      expect(container.querySelector(".bonsai-details-session-row")).not.toBeNull();
      // Plan 68: Sum up this chat at the top of the tab; Clear is gone.
      expect(container.textContent).toContain("Sum up this chat");
      expect(container.textContent).not.toContain("Clear");

      const onMoveLeft = tabsRowProps()?.onMoveLeft as () => boolean;
      expect(onMoveLeft).toBeTypeOf("function");
      act(() => {
        expect(onMoveLeft()).toBe(true);
      });
      expect(activeTabText(container)).toBe("This answer");
      expect(container.querySelector(".bonsai-chip-ladder")).not.toBeNull();
    });

    it("Left on This answer, and Right on Session, do nothing -- there is nowhere further to go", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);

      const onMoveLeft = tabsRowProps()?.onMoveLeft as () => boolean;
      expect(onMoveLeft()).toBe(false);
      expect(activeTabText(container)).toBe("This answer");

      act(() => {
        (tabsRowProps()?.onMoveRight as () => boolean)();
      });
      const onMoveRightAgain = tabsRowProps()?.onMoveRight as () => boolean;
      expect(onMoveRightAgain()).toBe(false);
      expect(activeTabText(container)).toBe("Session · 1");
    });
  });

  describe("Up leaves the tabs for Show details / Hide details", () => {
    it("moves real DOM focus onto the still-mounted Hide details line", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);

      const divider = container.querySelector('[aria-label="Hide details"]') as HTMLElement;
      expect(divider).not.toBeNull();

      const onMoveUp = tabsRowProps()?.onMoveUp as () => boolean;
      expect(onMoveUp).toBeTypeOf("function");
      expect(onMoveUp()).toBe(true);
      expect(document.activeElement).toBe(divider);
    });
  });

  describe("Down enters the chips of whichever tab is active", () => {
    it("This answer: Down focuses the chip ladder", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);

      const ladder = container.querySelector(".bonsai-chip-ladder") as HTMLElement;
      expect(ladder).not.toBeNull();

      const onMoveDown = tabsRowProps()?.onMoveDown as () => boolean;
      expect(onMoveDown()).toBe(true);
      expect(document.activeElement).toBe(ladder);
    });

    it("Session: Down focuses Sum up this chat, at the top of the tab (plan 68)", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);
      act(() => {
        (tabsRowProps()?.onMoveRight as () => boolean)();
      });

      const button = container.querySelector(".bonsai-sumup-btn") as HTMLElement;
      expect(button).not.toBeNull();

      const onMoveDown = tabsRowProps()?.onMoveDown as () => boolean;
      expect(onMoveDown()).toBe(true);
      expect(document.activeElement).toBe(button);
    });
  });

  describe("B closes the whole panel from anywhere inside", () => {
    it("from the tabs row: consumes the press and returns focus to Show details", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);

      const onCancelButton = tabsRowProps()?.onCancelButton as (e: unknown) => void;
      expect(onCancelButton).toBeTypeOf("function");
      let prevented = false;
      act(() => {
        onCancelButton({ preventDefault: () => (prevented = true) });
      });

      expect(prevented).toBe(true);
      expect(container.querySelector(".bonsai-details-tabs-row")).toBeNull();
      expect(container.querySelector(".bonsai-chip-ladder")).toBeNull();
      const divider = container.querySelector('[aria-label="Show details"]');
      expect(divider).not.toBeNull();
      expect(document.activeElement).toBe(divider);
    });

    it("from inside the chip ladder itself: also closes the whole panel, not just the chips", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);

      const ladderProps = latestPropsFor("bonsai-chip-ladder");
      const onCancelButton = ladderProps?.onCancelButton as (e: unknown) => void;
      expect(onCancelButton).toBeTypeOf("function");
      act(() => {
        onCancelButton({ preventDefault: () => {} });
      });

      expect(container.querySelector(".bonsai-details-tabs-row")).toBeNull();
      const divider = container.querySelector('[aria-label="Show details"]');
      expect(document.activeElement).toBe(divider);
    });

    it("from inside the Session tab's own body: also closes the whole panel", () => {
      const { container } = renderTranscript();
      clickShowDetails(container);
      act(() => {
        (tabsRowProps()?.onMoveRight as () => boolean)();
      });

      const bodyProps = latestPropsFor("bonsai-details-session-body");
      const onCancelButton = bodyProps?.onCancelButton as (e: unknown) => void;
      expect(onCancelButton).toBeTypeOf("function");
      act(() => {
        onCancelButton({ preventDefault: () => {} });
      });

      expect(container.querySelector(".bonsai-details-session-body")).toBeNull();
      const divider = container.querySelector('[aria-label="Show details"]');
      expect(document.activeElement).toBe(divider);
    });
  });

});
