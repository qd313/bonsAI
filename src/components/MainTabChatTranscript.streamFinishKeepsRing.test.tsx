/**
 * Title: The ring survives an answer finishing while you're walking it
 * Purpose: Pin the fix for roadmap "the ring is lost when an answer finishes while you walk it" —
 *          walking Down into a still-streaming answer parks the ring on one of its stops (answerKey
 *          "live"); the moment the Ask completes and the slot reload archives the turn, the whole
 *          "live" Focusable subtree unmounts in favour of a new one keyed by the turn's own id, and
 *          the stop holding the ring is destroyed with it.
 * Used for: MainTabChatTranscript.tsx's live -> archived restore effect (the useLayoutEffect pair
 *           keyed on `showLiveTurn`) and answerBubbleNavigation.ts's `focusAnswerChunkAtIndex`.
 * Solves: On the Deck (docs/test-evidence/plan64-STREAM-WALK-REC-01.json, try 2), the ring sat on a
 *         live answer's second section; the answer finished; no element anywhere carried Steam's
 *         ring class afterwards, and the pane jumped to its very end (scrollTop 1333 of 1333)
 *         instead of holding the same section of the now-archived answer in view.
 * Does not: Prove the fix on-device. The Deck check this owes: walk Down into a streaming answer,
 *           stop on an inner section, let the answer finish, and confirm the highlight stays on
 *           that same section of the finished (now archived) reply instead of vanishing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetAnswerStopRegistry } from "../utils/answerStopRegistry";
import { resetUiDocument } from "../utils/uiDocument";

/* Focusable/Button must be real DOM nodes or this suite passes for the wrong reason. */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

/*
 * Three paragraphs, each past splitResponseIntoChunks' 900-char merge threshold on its own, so each
 * becomes its own stop regardless of the other two — the real shape a long strategy answer takes,
 * not a synthetic one-chunk stand-in.
 */
function longParagraph(marker: string): string {
  return `${marker} ${"word ".repeat(190)}`.trim();
}
const THREE_SECTION_ANSWER = [
  longParagraph("SECTION-ONE"),
  longParagraph("SECTION-TWO"),
  longParagraph("SECTION-THREE"),
].join("\n\n");

function baseProps(): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: THREE_SECTION_ANSWER,
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    askThreadDisplayQuestion: "give me ten detailed tips for the boss",
    onRetryLastResponse: () => {},
    expandedTurnKey: "live",
    isStreamingPreview: false,
  };
}

function liveStops(container: HTMLElement): HTMLElement[] {
  const bubble = container.querySelector('[data-bonsai-answer-key="live"]');
  return bubble ? Array.from(bubble.querySelectorAll(".bonsai-answer-stop")) : [];
}

function archivedStops(container: HTMLElement, turnId: string): HTMLElement[] {
  const bubble = container.querySelector(`[data-bonsai-answer-key="${turnId}"]`);
  return bubble ? Array.from(bubble.querySelectorAll(".bonsai-answer-stop")) : [];
}

describe("the ring survives an answer finishing while it is being walked", () => {
  beforeEach(() => {
    resetAnswerStopRegistry();
    resetUiDocument();
  });

  it("moves the ring to the same section of the archived answer once the live turn is replaced", () => {
    const props = baseProps();
    const { container, rerender } = render(<MainTabChatTranscript {...props} />);

    const before = liveStops(container);
    expect(before.length).toBeGreaterThanOrEqual(3);
    /* Walk Down into the second section, the way the recorded Deck walk did. Steam stamps the ring
       class imperatively — no React commit accompanies it on device either — so the capture effect
       needs one more render of the SAME live state to notice it, the way the token-by-token stream
       naturally supplies on device. */
    before[1]!.classList.add("gpfocus");
    before[1]!.setAttribute("tabindex", "-1");
    rerender(<MainTabChatTranscript {...props} />);

    /* The Ask completes and the slot reload archives the turn: showLiveTurn's inputs all flip in
       the same commit, exactly like applySlotTranscript's own batch of setState calls. */
    rerender(
      <MainTabChatTranscript
        {...props}
        isAsking={false}
        askThreadDisplayQuestion=""
        expandedTurnKey="turn-1"
        ollamaResponse={THREE_SECTION_ANSWER}
        askThreadCollapsed={[
          {
            id: "turn-1",
            question: props.askThreadDisplayQuestion!,
            answer: THREE_SECTION_ANSWER,
          },
        ]}
      />
    );

    const after = archivedStops(container, "turn-1");
    expect(after.length).toBeGreaterThanOrEqual(3);
    /* The live subtree is gone — this is a different element than `before[1]`, proving the fix
       does not merely keep an old node alive. */
    expect(after[1]).not.toBe(before[1]);
    expect(document.activeElement).toBe(after[1]);
  });

  it("does nothing when the ring was on Ask, not the answer, at the finish", () => {
    const props = baseProps();
    const { container, rerender } = render(<MainTabChatTranscript {...props} />);

    /* No stop ever gets the ring this time — simulates the ring sitting on Ask/Stop/elsewhere. */
    const before = liveStops(container);
    expect(before.length).toBeGreaterThanOrEqual(1);

    rerender(
      <MainTabChatTranscript
        {...props}
        isAsking={false}
        askThreadDisplayQuestion=""
        expandedTurnKey="turn-1"
        ollamaResponse={THREE_SECTION_ANSWER}
        askThreadCollapsed={[
          {
            id: "turn-1",
            question: props.askThreadDisplayQuestion!,
            answer: THREE_SECTION_ANSWER,
          },
        ]}
      />
    );

    const after = archivedStops(container, "turn-1");
    expect(after.length).toBeGreaterThanOrEqual(1);
    /* Nothing in the archived answer should have claimed focus on our behalf. */
    expect(after.some((el) => el === document.activeElement)).toBe(false);
  });
});
