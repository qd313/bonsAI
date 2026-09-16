/**
 * Title: Collapsing an open question keeps the ring on its own header
 * Purpose: Pin the fix for roadmap "Pressing A on an open question closes it and drops the
 *          highlight" — the answer used to fold away with the ring landing nowhere, so the next
 *          D-pad press had to place it fresh instead of moving it.
 * Used for: MainTabChatTranscript.tsx's collapse-refocus effect (the useLayoutEffect keyed on
 *           expandedTurnKey, and the headerRef plumbed into buildTurnHeaderElement).
 * Solves: While a turn is open and offers Retry (D77), activation sits on the INNER
 *         `.bonsai-chat-turn-row-body` stop. Collapsing drops Retry, which changes the header
 *         from two child stops to one and unmounts whichever stop held the ring — Steam had
 *         nothing left to fall back to (seen 2026-09-06 while checking the corner icons;
 *         docs/test-evidence/press-question-not-retry.json: press routed, focus moved the
 *         question -> "nothing"). The header's OUTER element keeps the same key across that
 *         change, so this hands the ring back to it once the turn collapses.
 * Does not: Prove the fix on-device. The Deck check this owes: open the newest question, press A
 *           to close it, and confirm the highlight stays on the question's own row rather than
 *           needing an extra press to place it again.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";

/* Focusable/Button must be real DOM nodes or this suite passes for the wrong reason. */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

function baseProps(): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "the boss enters phase two at half health",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    askThreadDisplayQuestion: "what about its second phase",
    onRetryLastResponse: () => {},
  };
}

function outerHeaderEl(container: HTMLElement): HTMLElement | null {
  /*
   * All three of the header's own elements (outer row, inner body while Retry shows, and the
   * title span) carry the same data-bonsai-turn-id — the outer one is the first in document
   * order, which is exactly the element the fix hands the ring back to.
   */
  return container.querySelector('[data-bonsai-turn-id="live"]');
}

describe("collapsing an open question keeps the ring on its own header", () => {
  it("focuses the header's outer row once the live turn collapses", () => {
    const props: MainTabChatTranscriptProps = {
      ...baseProps(),
      expandedTurnKey: "live",
    };
    const { container, rerender } = render(<MainTabChatTranscript {...props} />);

    const headerBefore = outerHeaderEl(container);
    expect(headerBefore).not.toBeNull();
    /*
     * jsdom only moves `document.activeElement` for an element Decky itself has already made
     * focusable on device (a real tabindex, assigned once Steam registers the control) — this
     * stub carries none, so a spy on the element's own `focus` proves the call happened without
     * this test stamping a tabindex onto it. Stamping one here would repeat exactly the mistake
     * AGENTS.md's focus-graph section warns against: a real Steam-owned control can carry no
     * tabindex at all, and "add one when missing" broke three of them on device (PERM-JUMP-01).
     */
    const focusSpy = vi.spyOn(headerBefore as HTMLElement, "focus");

    rerender(<MainTabChatTranscript {...props} expandedTurnKey={null} />);

    const headerAfter = outerHeaderEl(container);
    /* Same DOM node survives the collapse — proves the fix hands focus to the row that stayed on
       screen, not to some freshly-mounted replacement. */
    expect(headerAfter).toBe(headerBefore);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does nothing when a turn opens rather than closes", () => {
    const props: MainTabChatTranscriptProps = {
      ...baseProps(),
      expandedTurnKey: null,
    };
    const { container, rerender } = render(<MainTabChatTranscript {...props} />);
    const header = outerHeaderEl(container);
    expect(header).not.toBeNull();
    const focusSpy = vi.spyOn(header as HTMLElement, "focus");

    rerender(<MainTabChatTranscript {...props} expandedTurnKey="live" />);

    /* Opening is not the bug this fix addresses — nothing should move focus on the way in. */
    expect(focusSpy).not.toHaveBeenCalled();
  });
});
