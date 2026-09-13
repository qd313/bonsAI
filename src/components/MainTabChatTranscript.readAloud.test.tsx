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
import { getRpcCallLog, setRpcHandler } from "../test-harness/fakeDeckyRpc";

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
    setRpcHandler("get_voice_read_aloud_status", () => {
      polls += 1;
      return {
        state: polls < 2 ? "speaking" : "done",
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
