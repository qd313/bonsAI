/**
 * Title: Stopped-turn notice and reply actions tests
 * Purpose: Pin the fix for roadmap "Stopping a reply leaves no 'Stopped' notice" (two-star, reply,
 *          found 2026-09-04) — a stopped Ask is archived like any completed one (the backend
 *          records the assistant turn on both cancel paths), so `expandedTurnKey` moves off "live"
 *          onto the turn's own id and the old live-only notice/button gating had nowhere to draw.
 * Used for: MainTabChatTranscript archived-turn rendering when `askStopped` is true.
 * Solves: Confirms the "Stopped — partial answer kept." notice and the Helpful / Not really /
 *         Retry buttons reappear on the newest archived turn when it was the one just stopped,
 *         Retry re-asks THIS turn's own question (not the stale `lastExchange`, which a stop
 *         clears to null), and an empty stop (nothing readable kept) still shows nothing — the
 *         behaviour useBonsaiAskOrchestration.ts already deliberately preserves.
 * Does not: Cover useBonsaiAskOrchestration.ts itself (owned by a different lane) — only what
 *           MainTabChatTranscript does with the props it is handed.
 */
import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

/* Focusable/Button must be real DOM nodes or this suite passes for the wrong reason. */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

function baseProps(overrides: Partial<MainTabChatTranscriptProps>): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "",
    // A stop clears `lastExchange` to null (useBonsaiAskOrchestration.ts) — reproduced here on
    // purpose rather than left at its default, since that is exactly the state under test.
    lastExchange: null,
    ...overrides,
  };
}

/** Decky's Button may render a real <button> or a div wrapper; read whichever says disabled. */
function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled === true || el.hasAttribute("disabled");
}

describe("stopped turn — notice and reply actions restored on the archived turn", () => {
  const stoppedTurn: AskThreadCollapsedTurn = {
    id: "stopped-1",
    question: "how do i beat the final boss",
    answer: "Keep your distance and bait the",
  };

  it("shows the Stopped notice and restores Helpful / Not really / Retry", () => {
    const { container, getByLabelText } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [stoppedTurn],
          expandedTurnKey: stoppedTurn.id,
          askStopped: true,
        })}
      />
    );
    expect(container.textContent).toContain("Stopped — partial answer kept.");
    expect(() => getByLabelText("Mark reply helpful")).not.toThrow();
    expect(() => getByLabelText("Mark reply not helpful")).not.toThrow();
    expect(() => getByLabelText("Retry same prompt")).not.toThrow();
  });

  /*
   * The maintainer read the first version of this fix and pushed back: half an answer is not
   * something to rate, and the rating is saved, so it would quietly spoil the feedback they read
   * later. The buttons stay on screen and greyed — not removed — so the row does not shift.
   */
  it("greys out Helpful and Not really on a stopped turn, and leaves Retry live", () => {
    const { getByLabelText } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [stoppedTurn],
          expandedTurnKey: stoppedTurn.id,
          askStopped: true,
        })}
      />
    );
    expect(isDisabled(getByLabelText("Mark reply helpful"))).toBe(true);
    expect(isDisabled(getByLabelText("Mark reply not helpful"))).toBe(true);
    expect(isDisabled(getByLabelText("Retry same prompt"))).toBe(false);
  });

  it("leaves rating alone on a turn that finished normally", () => {
    const { getByLabelText } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [stoppedTurn],
          expandedTurnKey: stoppedTurn.id,
          askStopped: false,
          lastExchange: { question: stoppedTurn.question, answer: stoppedTurn.answer },
        })}
      />
    );
    expect(isDisabled(getByLabelText("Mark reply helpful"))).toBe(false);
    expect(isDisabled(getByLabelText("Mark reply not helpful"))).toBe(false);
  });

  it("Retry re-asks this turn's own question, not a stale lastExchange", () => {
    const onAskOllama = vi.fn();
    const { getByLabelText } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [stoppedTurn],
          expandedTurnKey: stoppedTurn.id,
          askStopped: true,
          onAskOllama,
        })}
      />
    );
    fireEvent.click(getByLabelText("Retry same prompt"));
    expect(onAskOllama).toHaveBeenCalledWith(
      stoppedTurn.question,
      expect.objectContaining({ threadQuestionDisplay: stoppedTurn.question })
    );
  });

  /*
   * Roadmap "Retry on a restored reply does nothing" (one-star, reply, found on the Deck
   * 2026-09-06). A plugin restart is the case: the chat slots come back from Python, so the
   * transcript redraws the last exchange, but the in-memory session snapshot does not survive a
   * restart (bonsaiSessionSurvival.ts says so in its own header), so `lastExchange` is null while
   * the turn is on screen with a live Retry badge. The stopped path above was already given the
   * direct re-ask for exactly this reason; a finished turn was not, and fell through to
   * `onRetryLastResponse`, which reads `lastExchange`, finds nothing, and toasts "Nothing to
   * retry". Same landing as the stopped case: Retry re-asks the turn it is drawn on.
   */
  it("Retry re-asks a finished turn's own question when lastExchange is gone", () => {
    const onAskOllama = vi.fn();
    const onRetryLastResponse = vi.fn();
    const { getByLabelText } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [stoppedTurn],
          expandedTurnKey: stoppedTurn.id,
          askStopped: false,
          lastExchange: null,
          onAskOllama,
          onRetryLastResponse,
        })}
      />
    );
    fireEvent.click(getByLabelText("Retry same prompt"));
    expect(onAskOllama).toHaveBeenCalledWith(
      stoppedTurn.question,
      expect.objectContaining({ threadQuestionDisplay: stoppedTurn.question })
    );
  });

  it("shows nothing extra for an empty stop (no readable draft kept)", () => {
    const emptyStopTurn: AskThreadCollapsedTurn = {
      id: "stopped-2",
      question: "how do i beat the final boss",
      // The backend's own fallback for a stop with nothing readable yet
      // (Plugin._cancelled_response_text) — a status, not a kept answer.
      answer: "Request cancelled.",
    };
    const { container, queryByLabelText } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [emptyStopTurn],
          expandedTurnKey: emptyStopTurn.id,
          askStopped: true,
        })}
      />
    );
    expect(container.textContent).not.toContain("Stopped — partial answer kept.");
    expect(container.textContent).not.toContain("Stopped.");
    expect(queryByLabelText("Retry same prompt")).toBeNull();
    expect(queryByLabelText("Mark reply helpful")).toBeNull();
  });

  /*
   * Roadmap "After Stop or Helpful, Read aloud sits alone above a blank gap" (plan 72 free play,
   * docs/test-evidence/plan72-Z-FREEPLAY.json finding 9, screenshots/plan72/Z-after-stop.png): after
   * a stop that kept nothing, the reply is the back end's own "Request cancelled." -- no thumbs, no
   * Retry, by the rule above -- yet the speaker still drew, alone at the right of an empty row, and
   * would have read the words "Request cancelled." aloud. Nothing readable was kept, so there is
   * nothing to read either. A kept partial answer still offers it (next test).
   */
  it("offers no Read aloud on an empty stop: there is nothing to read", () => {
    const emptyStopTurn: AskThreadCollapsedTurn = {
      id: "stopped-3",
      question: "any known issues running this on deck?",
      answer: "Request cancelled.",
    };
    const { queryByLabelText } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [emptyStopTurn],
          expandedTurnKey: emptyStopTurn.id,
          askStopped: true,
        })}
      />
    );
    expect(queryByLabelText("Read aloud")).toBeNull();
  });

  /* Plan 74 leftover (roadmap "Small leftovers from plan 74", part a): fb68ef3c took Read aloud off the
     "Request cancelled." bubble, but its Copy corner icon stayed, and would copy those words. */
  it("offers no Copy on an empty stop, and still offers it on a kept partial answer", () => {
    const emptyStopTurn: AskThreadCollapsedTurn = {
      id: "stopped-4",
      question: "any known issues running this on deck?",
      answer: "Request cancelled.",
    };
    const empty = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [emptyStopTurn],
          expandedTurnKey: emptyStopTurn.id,
          askStopped: true,
        })}
      />
    );
    expect(empty.queryByLabelText("Copy reply text")).toBeNull();
    empty.unmount();
    const kept = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [stoppedTurn],
          expandedTurnKey: stoppedTurn.id,
          askStopped: true,
        })}
      />
    );
    expect(kept.queryByLabelText("Copy reply text")).not.toBeNull();
  });

  it("still offers Read aloud on a stop that kept part of the answer", () => {
    const { queryByLabelText } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [stoppedTurn],
          expandedTurnKey: stoppedTurn.id,
          askStopped: true,
        })}
      />
    );
    expect(queryByLabelText("Read aloud")).not.toBeNull();
  });

  it("does not show the notice on an older archived turn even when askStopped is true", () => {
    const older: AskThreadCollapsedTurn = { id: "older-1", question: "q1", answer: "a1" };
    const { container, queryByLabelText } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [older, stoppedTurn],
          expandedTurnKey: older.id,
          askStopped: true,
        })}
      />
    );
    expect(container.textContent).not.toContain("Stopped — partial answer kept.");
    expect(queryByLabelText("Retry same prompt")).toBeNull();
  });
});
