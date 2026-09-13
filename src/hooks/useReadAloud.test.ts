import { act, renderHook } from "@testing-library/react";
import { toaster } from "@decky/api";
import { describe, expect, it, vi } from "vitest";

import {
  handleAskTerminalForReadAloud,
  rememberAskCameFromMic,
  resetReadAloudCompletionState,
  setReadAloudCompletionContext,
  shouldReadAloudOnCompletion,
  stopReadAloudFireAndForget,
  useReadAloud,
} from "./useReadAloud";
import { getRpcCallLog, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../test-harness/rpcFixtures";
import type { BackgroundRequestStatus } from "../types/backgroundAsk";

describe("useReadAloud", () => {
  it("starts speaking, polls status, and flips the label back to idle when done", async () => {
    vi.useFakeTimers();
    let polls = 0;
    setRpcHandler("get_voice_read_aloud_status", () => {
      polls += 1;
      return {
        state: polls < 2 ? "speaking" : "done",
        sentence_index: polls,
        sentence_count: 3,
        error: null,
        started_at: 0,
      };
    });

    const { result } = renderHook(() => useReadAloud());

    act(() => {
      result.current.start("live", "Here is the answer.");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.speakingKey).toBe("live");
    expect(result.current.state).toBe("speaking");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(result.current.state).toBe("done");
    expect(result.current.speakingKey).toBeNull();
    vi.useRealTimers();
  });

  it("does nothing for empty text", async () => {
    const { result } = renderHook(() => useReadAloud());
    act(() => {
      result.current.start("live", "   ");
    });
    expect(result.current.speakingKey).toBeNull();
    expect(getRpcCallLog().some((c) => c.method === "start_voice_read_aloud")).toBe(false);
  });

  it("shows a toast and returns to idle when the backend reports ok: false", async () => {
    setRpcHandler("start_voice_read_aloud", () => ({
      ok: false,
      sentence_count: 0,
      error: "No speech engine on this Deck.",
    }));
    const { result } = renderHook(() => useReadAloud());

    await act(async () => {
      result.current.start("live", "Hello.");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.speakingKey).toBeNull();
    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ body: "No speech engine on this Deck." })
    );
  });

  it("stop calls stop_voice_read_aloud and clears the speaking turn at once", async () => {
    setRpcHandler("get_voice_read_aloud_status", () => ({
      state: "speaking",
      sentence_index: 0,
      sentence_count: 3,
      error: null,
      started_at: 0,
    }));
    const { result } = renderHook(() => useReadAloud());

    await act(async () => {
      result.current.start("live", "Hello.");
      await Promise.resolve();
    });
    expect(result.current.speakingKey).toBe("live");

    act(() => {
      result.current.stop();
    });
    expect(result.current.speakingKey).toBeNull();
    expect(result.current.state).toBe("idle");
    await act(async () => {
      await Promise.resolve();
    });
    expect(getRpcCallLog().some((c) => c.method === "stop_voice_read_aloud")).toBe(true);
  });
});

describe("stopReadAloudFireAndForget", () => {
  it("calls stop_voice_read_aloud without needing a caller to await it", async () => {
    stopReadAloudFireAndForget();
    await Promise.resolve();
    expect(getRpcCallLog().some((c) => c.method === "stop_voice_read_aloud")).toBe(true);
  });
});

describe("shouldReadAloudOnCompletion", () => {
  const base = {
    status: "completed",
    success: true,
    readableText: "Here is the answer.",
  };

  it("off never reads on its own, whichever way the question came in", () => {
    expect(shouldReadAloudOnCompletion({ ...base, mode: "off", cameFromMic: true })).toBe(false);
    expect(shouldReadAloudOnCompletion({ ...base, mode: "off", cameFromMic: false })).toBe(false);
  });

  it("voice_only reads only a question that came in through the mic", () => {
    expect(shouldReadAloudOnCompletion({ ...base, mode: "voice_only", cameFromMic: true })).toBe(true);
    expect(shouldReadAloudOnCompletion({ ...base, mode: "voice_only", cameFromMic: false })).toBe(false);
  });

  it("always reads every answer, typed or spoken", () => {
    expect(shouldReadAloudOnCompletion({ ...base, mode: "always", cameFromMic: true })).toBe(true);
    expect(shouldReadAloudOnCompletion({ ...base, mode: "always", cameFromMic: false })).toBe(true);
  });

  it("never reads an answer that did not succeed", () => {
    expect(
      shouldReadAloudOnCompletion({ ...base, mode: "always", cameFromMic: false, success: false })
    ).toBe(false);
    expect(
      shouldReadAloudOnCompletion({
        ...base,
        mode: "always",
        cameFromMic: true,
        status: "failed",
      })
    ).toBe(false);
  });

  it("never reads an answer that flattens to nothing", () => {
    expect(
      shouldReadAloudOnCompletion({ ...base, mode: "always", cameFromMic: false, readableText: "   " })
    ).toBe(false);
  });
});

function completedStatus(overrides: Partial<BackgroundRequestStatus> = {}): BackgroundRequestStatus {
  return {
    ...idleBackgroundStatusFixture(),
    status: "completed",
    success: true,
    request_id: 42,
    question: "how do I beat the boss",
    response: "Dodge left, then strike.",
    ...overrides,
  };
}

describe("handleAskTerminalForReadAloud", () => {
  it("reads a completed answer aloud when the setting is always", async () => {
    resetReadAloudCompletionState();
    setReadAloudCompletionContext("always", true);
    handleAskTerminalForReadAloud(completedStatus());
    await Promise.resolve();
    const call = getRpcCallLog().find((c) => c.method === "start_voice_read_aloud");
    expect(call).toBeDefined();
    expect(String(call!.args[0])).toContain("Dodge left, then strike.");
  });

  it("does nothing when the setting is off", async () => {
    resetReadAloudCompletionState();
    setReadAloudCompletionContext("off", true);
    handleAskTerminalForReadAloud(completedStatus({ request_id: 43 }));
    await Promise.resolve();
    expect(getRpcCallLog().some((c) => c.method === "start_voice_read_aloud")).toBe(false);
  });

  it("reads only a voice question on voice_only, using the flag remembered at Ask start", async () => {
    resetReadAloudCompletionState();
    setReadAloudCompletionContext("voice_only", true);
    rememberAskCameFromMic(44, true);
    handleAskTerminalForReadAloud(completedStatus({ request_id: 44 }));
    await Promise.resolve();
    expect(getRpcCallLog().some((c) => c.method === "start_voice_read_aloud")).toBe(true);
  });

  it("does not read a typed question on voice_only", async () => {
    resetReadAloudCompletionState();
    setReadAloudCompletionContext("voice_only", true);
    rememberAskCameFromMic(45, false);
    handleAskTerminalForReadAloud(completedStatus({ request_id: 45 }));
    await Promise.resolve();
    expect(getRpcCallLog().some((c) => c.method === "start_voice_read_aloud")).toBe(false);
  });

  it("fires once per request_id even when both completion paths see it", async () => {
    resetReadAloudCompletionState();
    setReadAloudCompletionContext("always", true);
    const status = completedStatus({ request_id: 46 });
    handleAskTerminalForReadAloud(status);
    handleAskTerminalForReadAloud(status);
    await Promise.resolve();
    const calls = getRpcCallLog().filter((c) => c.method === "start_voice_read_aloud");
    expect(calls.length).toBe(1);
  });
});
