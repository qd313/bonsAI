import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";
import type { BackgroundRequestStatus } from "../types/backgroundAsk";
import { setRpcHandler, resetFakeDeckyRpc } from "../test-harness/fakeDeckyRpc";
import { dismissPhaseToast } from "./bonsaiPhaseToast";
import {
  getAskCompletionWatchSeq,
  startAskCompletionWatch,
  stopAskCompletionWatch,
} from "./bonsaiAskCompletionWatch";
import { resetReplySurfaceState, setReplySurfaceVisible } from "./bonsaiReplySurface";
import { resetReplyReadyToastState } from "./bonsaiReplyReadyToast";

function idleStatus(): BackgroundRequestStatus {
  return {
    status: "idle",
    request_id: null,
    question: "",
    app_id: "",
    app_context: "none",
    success: null,
    response: "",
    applied: null,
    elapsed_seconds: 0,
    error: null,
    started_at: null,
    completed_at: null,
  };
}

describe("bonsaiAskCompletionWatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setReplySurfaceVisible(false);
    setRpcHandler("get_background_game_ai_status", () => idleStatus());
  });

  afterEach(() => {
    stopAskCompletionWatch();
    dismissPhaseToast();
    resetReplySurfaceState();
    resetReplyReadyToastState();
    resetFakeDeckyRpc();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("toasts on completed status after polling", async () => {
    let polls = 0;
    setRpcHandler("get_background_game_ai_status", () => {
      polls += 1;
      if (polls < 2) {
        return { ...idleStatus(), status: "pending", request_id: 9, question: "hi" };
      }
      return {
        ...idleStatus(),
        status: "completed",
        request_id: 9,
        success: true,
        response: "done",
        question: "hi",
      };
    });

    const seqBefore = getAskCompletionWatchSeq();
    startAskCompletionWatch();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "done", body: "Tap to open" }),
    );
    expect(getAskCompletionWatchSeq()).toBeGreaterThan(seqBefore);
  });

  it("stops without toast on cancelled status", async () => {
    setRpcHandler("get_background_game_ai_status", () => ({
      ...idleStatus(),
      status: "cancelled",
      request_id: 3,
      question: "hi",
    }));

    startAskCompletionWatch();
    await vi.runOnlyPendingTimersAsync();

    expect(toaster.toast).not.toHaveBeenCalled();
  });

  it("stopAskCompletionWatch invalidates in-flight polls", async () => {
    let polls = 0;
    setRpcHandler("get_background_game_ai_status", () => {
      polls += 1;
      return { ...idleStatus(), status: "pending", request_id: 1, question: "q" };
    });

    startAskCompletionWatch();
    stopAskCompletionWatch();
    await vi.runOnlyPendingTimersAsync();

    expect(polls).toBeLessThanOrEqual(1);
  });
});
