/**
 * Title: The ring stays on the question's Retry or text when an answer finishes
 * Purpose: Pin the fix for QA-FREE-PLAY-01's plan 70 failure: the ring parked on the live turn's
 *          question row (its Retry icon or its text) while the answer is written is destroyed with
 *          the whole "live" turn when the slot reload archives it, and nothing puts it back.
 * Used for: useLiveTurnHeaderRingRestore (src/hooks) as MainTabChatTranscript calls it.
 * Solves: On the Deck (docs/test-evidence/plan70-QA-FREE-PLAY-01.json, 3 of 4 tries) no element
 *         held the ring after the finish, and within about 3 s the view slid to the end of the
 *         answer, leaving the Retry icon 196-356 px above the pane. The answer-section restore
 *         beside it (streamFinishKeepsRing.test.tsx) only ever covered the answer's own sections.
 * Does not: Prove the fix on the Deck. The check this owes: put the ring on the live question's
 *           Retry while an answer is written, let it finish, and see the ring still on Retry,
 *           in view, a few seconds later.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetAnswerStopRegistry } from "../utils/answerStopRegistry";
import { resetUiDocument } from "../utils/uiDocument";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const QUESTION = "in terraria how do I prepare for the eye of cthulhu";
const ANSWER = `Build an arena. ${"word ".repeat(60)}`.trim();

function streamingProps(): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: true,
    isStreamingPreview: true,
    streamDisplayText: ANSWER,
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
    askMode: "strategy",
    askThreadCollapsed: [],
    askThreadDisplayQuestion: QUESTION,
    onRetryLastResponse: () => {},
    onAskOllama: () => {},
    expandedTurnKey: "live",
  };
}

/* The slot reload after the finish: the turn is archived and opened under its own id, in one commit. */
function archivedProps(): MainTabChatTranscriptProps {
  return {
    ...streamingProps(),
    isAsking: false,
    isStreamingPreview: false,
    streamDisplayText: "",
    ollamaResponse: ANSWER,
    askThreadDisplayQuestion: "",
    expandedTurnKey: "turn-1",
    askThreadCollapsed: [{ id: "turn-1", question: QUESTION, answer: ANSWER }],
  };
}

function headerOf(container: HTMLElement, turnId: string): HTMLElement {
  const header = container.querySelector<HTMLElement>(
    `.bonsai-chat-turn-row-header[data-bonsai-turn-id="${turnId}"]`
  );
  expect(header).not.toBeNull();
  return header!;
}

function retryIn(header: HTMLElement): HTMLElement {
  const retry = header.querySelector<HTMLElement>('[aria-label="Retry same prompt"]');
  expect(retry).not.toBeNull();
  return retry!;
}

function questionBodyIn(header: HTMLElement): HTMLElement {
  const body = header.querySelector<HTMLElement>(".bonsai-chat-turn-row-body");
  expect(body).not.toBeNull();
  return body!;
}

/*
 * Steam stamps its ring class imperatively; no React commit comes with it. The next streamed
 * token supplies the commit on the Deck, a same-props rerender does it here. The live Retry is
 * greyed out while the answer is written, and a greyed Decky button still takes the ring on the
 * Deck (replyStopRegistry.ts), but a disabled jsdom button refuses focus(), so the ring class is
 * the only mark it can carry here -- which is also what the capture reads first.
 */
function putRingOn(el: HTMLElement): void {
  el.classList.add("gpfocus");
}

describe("the ring on the live question row survives the answer finishing", () => {
  beforeEach(() => {
    resetAnswerStopRegistry();
    resetUiDocument();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("puts the ring on the archived question's Retry when it was on the live one", () => {
    const { container, rerender } = render(<MainTabChatTranscript {...streamingProps()} />);
    const liveRetry = retryIn(headerOf(container, "live"));
    putRingOn(liveRetry);
    rerender(<MainTabChatTranscript {...streamingProps()} />);

    rerender(<MainTabChatTranscript {...archivedProps()} />);

    expect(liveRetry.isConnected).toBe(false);
    const archivedRetry = retryIn(headerOf(container, "turn-1"));
    expect(document.activeElement).toBe(archivedRetry);
  });

  it("puts the ring on the archived question's text when it was on the live question's text", () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    const { container, rerender } = render(<MainTabChatTranscript {...streamingProps()} />);
    putRingOn(questionBodyIn(headerOf(container, "live")));
    rerender(<MainTabChatTranscript {...streamingProps()} />);
    focusSpy.mockClear();

    rerender(<MainTabChatTranscript {...archivedProps()} />);

    const archivedBody = questionBodyIn(headerOf(container, "turn-1"));
    const focused = focusSpy.mock.contexts as unknown[];
    expect(focused).toContain(archivedBody);
    expect(focused).not.toContain(retryIn(headerOf(container, "turn-1")));
  });

  it("leaves the ring alone when it was not on the live question row", () => {
    const { container, rerender } = render(<MainTabChatTranscript {...streamingProps()} />);
    rerender(<MainTabChatTranscript {...streamingProps()} />);

    rerender(<MainTabChatTranscript {...archivedProps()} />);

    const archivedHeader = headerOf(container, "turn-1");
    expect(archivedHeader.contains(document.activeElement)).toBe(false);
  });
});
