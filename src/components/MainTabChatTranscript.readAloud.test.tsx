/**
 * Title: Read aloud button end-to-end render tests
 * Purpose: Pin that the Read aloud line under a finished answer actually starts and stops the
 *   background reader with the answer's readable text, and that a new Ask stops it.
 * Used for: plan 42 step 3a — useReadAloud.ts's own tests cover the hook in isolation; this proves
 *   MainTabChatTranscript wires it to a real turn's text and question.
 * Does not: Prove D-pad focus geometry — that is the device rows' job.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { getRpcCallLog, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../test-harness/rpcFixtures";
import {
  handleAskTerminalForReadAloud,
  resetReadAloudCompletionState,
  setReadAloudCompletionContext,
} from "../hooks/useReadAloud";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const QUESTION = "how do i beat the boss";
const ANSWER = "Dodge left, then strike the weak point.";

function renderReply(overrides: Partial<MainTabChatTranscriptProps> = {}) {
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: ANSWER,
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: QUESTION,
    lastExchange: { question: QUESTION, answer: ANSWER },
    onRetryLastResponse: () => {},
    ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

function findReadAloudLine(container: HTMLElement): HTMLElement {
  const lines = Array.from(container.querySelectorAll(".bonsai-chat-details-divider"));
  const line = lines.find((el) => /Read aloud|Stop/.test(el.textContent || ""));
  if (!line) throw new Error("Read aloud line not found");
  return line as HTMLElement;
}

describe("MainTabChatTranscript Read aloud", () => {
  afterEach(() => {
    cleanup();
  });

  it("starts the background reader with the answer's readable text", async () => {
    const { container } = renderReply();
    const line = findReadAloudLine(container);
    expect(line.textContent).toContain("Read aloud");

    await act(async () => {
      fireEvent.click(line);
      await Promise.resolve();
    });

    const call = getRpcCallLog().find((c) => c.method === "start_voice_read_aloud");
    expect(call).toBeDefined();
    expect(String(call!.args[0])).toContain("Dodge left, then strike the weak point.");
  });

  it("flips to Stop while speaking, and back once the backend reports done", async () => {
    vi.useFakeTimers();
    let polls = 0;
    // The hook's own mount-time recovery check (useReadAloud.ts) makes one status call before the
    // click ever happens, so "speaking" has to hold for one call longer than the two this test
    // actually cares about (the click's own poll, then the one after the backend finishes).
    setRpcHandler("get_voice_read_aloud_status", () => {
      polls += 1;
      return {
        state: polls < 3 ? "speaking" : "done",
        sentence_index: polls,
        sentence_count: 2,
        error: null,
        started_at: 0,
      };
    });
    const { container } = renderReply();
    const line = findReadAloudLine(container);

    await act(async () => {
      fireEvent.click(line);
      await Promise.resolve();
    });
    expect(findReadAloudLine(container).textContent).toContain("Stop");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(findReadAloudLine(container).textContent).toContain("Read aloud");
    vi.useRealTimers();
  });

  it("stops the reader when a new Ask starts", async () => {
    setRpcHandler("get_voice_read_aloud_status", () => ({
      state: "speaking",
      sentence_index: 0,
      sentence_count: 3,
      error: null,
      started_at: 0,
    }));
    const { container, rerender } = renderReply();
    const line = findReadAloudLine(container);

    await act(async () => {
      fireEvent.click(line);
      await Promise.resolve();
    });
    expect(getRpcCallLog().some((c) => c.method === "start_voice_read_aloud")).toBe(true);

    const props: MainTabChatTranscriptProps = {
      fullBleedRowStyle: {},
      isAsking: true,
      selectedAttachment: null,
      ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
      unifiedInput: "",
      showSlowWarning: false,
      latencyWarningSeconds: 30,
      ollamaResponse: ANSWER,
      elapsedSeconds: null,
      lastApplied: null,
      canSaveDesktopNote: false,
      onOpenDesktopNoteSave: () => {},
      askMode: "speed",
      askThreadCollapsed: [],
      expandedTurnKey: "live",
      askThreadDisplayQuestion: "a new question",
      lastExchange: { question: QUESTION, answer: ANSWER },
      onRetryLastResponse: () => {},
    };
    await act(async () => {
      rerender(<MainTabChatTranscript {...props} />);
      await Promise.resolve();
    });

    expect(getRpcCallLog().some((c) => c.method === "stop_voice_read_aloud")).toBe(true);
  });
});

function turn(id: string, answer: string): AskThreadCollapsedTurn {
  return { id, question: QUESTION, answer };
}

function renderArchivedTurns(turns: AskThreadCollapsedTurn[], expandedTurnKey: string) {
  const newest = turns[turns.length - 1]!;
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: newest.answer,
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: turns,
    expandedTurnKey,
    // Empty on purpose: a completed Ask (and every QAM reopen) archives every turn and expands the
    // newest archived one, so `showLiveTurn` is false on this path — the same shape the reply-block
    // tests use for "a finished reply that is not live any more".
    askThreadDisplayQuestion: "",
    lastExchange: { question: QUESTION, answer: newest.answer },
    onRetryLastResponse: () => {},
  };
  return render(<MainTabChatTranscript {...props} />);
}

describe("a reading that started on its own, once the answer is drawn as history", () => {
  afterEach(() => {
    cleanup();
  });

  it("says Stop under the newest archived turn, not just a live one", async () => {
    const turns = [turn("t0", "An older answer about the first fight."), turn("t1", ANSWER)];
    // The ordinary post-Ask shape: nothing live, the newest turn (t1) is the one expanded.
    const { container } = renderArchivedTurns(turns, "t1");
    expect(findReadAloudLine(container).textContent).toContain("Read aloud");

    resetReadAloudCompletionState();
    setReadAloudCompletionContext("always", true);
    // The notify now waits for the start call to resolve ok (useReadAloud.ts, measured on the
    // Deck 2026-09-12 second attempt), and the poll that follows it needs a real reading in
    // progress to find — otherwise the default idle status the mount check already saw would
    // immediately reset it, the same failure mode the fix above addresses. Registered after the
    // render above, so it does not touch that earlier mount-time check.
    setRpcHandler("get_voice_read_aloud_status", () => ({
      state: "speaking",
      sentence_index: 0,
      sentence_count: 2,
      error: null,
      started_at: 0,
    }));
    await act(async () => {
      handleAskTerminalForReadAloud({
        ...idleBackgroundStatusFixture(),
        status: "completed",
        success: true,
        request_id: 901,
        question: QUESTION,
        response: ANSWER,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(findReadAloudLine(container).textContent).toContain("Stop");
  });

  it("leaves an older archived turn's own line saying Read aloud", async () => {
    const turns = [turn("t0", "An older answer about the first fight."), turn("t1", ANSWER)];
    // t0 is the one drawn open here, but t1 is still the newest turn in the thread — the reading
    // that just started on its own belongs to t1, so t0's own line must not flip.
    const { container } = renderArchivedTurns(turns, "t0");
    expect(findReadAloudLine(container).textContent).toContain("Read aloud");

    resetReadAloudCompletionState();
    setReadAloudCompletionContext("always", true);
    setRpcHandler("get_voice_read_aloud_status", () => ({
      state: "speaking",
      sentence_index: 0,
      sentence_count: 2,
      error: null,
      started_at: 0,
    }));
    await act(async () => {
      handleAskTerminalForReadAloud({
        ...idleBackgroundStatusFixture(),
        status: "completed",
        success: true,
        request_id: 902,
        question: QUESTION,
        response: ANSWER,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(findReadAloudLine(container).textContent).toContain("Read aloud");
  });
});
