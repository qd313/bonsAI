import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "@decky/api";
import { useBackgroundGameAi } from "./useBackgroundGameAi";
import type { BackgroundRequestStatus } from "../types/backgroundAsk";
import { idleBackgroundStatusFixture } from "../test-harness/rpcFixtures";
import {
  dispatchFakeRpc,
  resetFakeDeckyRpc,
  setBackgroundStatusFixture,
  setRpcHandler,
} from "../test-harness/fakeDeckyRpc";

describe("useBackgroundGameAi", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>
    );
  });

  it("polls until status leaves pending", async () => {
    vi.useFakeTimers();
    let polls = 0;
    setRpcHandler("get_background_game_ai_status", () => {
      polls += 1;
      if (polls < 2) {
        const pending: BackgroundRequestStatus = {
          ...idleBackgroundStatusFixture(),
          status: "pending",
          question: "hello",
          request_id: 1,
        };
        return pending;
      }
      return {
        ...idleBackgroundStatusFixture(),
        status: "completed",
        question: "hello",
        request_id: 1,
        success: true,
        response: "hi",
      };
    });

    const applied: BackgroundRequestStatus[] = [];
    const { result } = renderHook(() =>
      useBackgroundGameAi(
        (status) => {
          applied.push(status);
        },
        () => {}
      )
    );

    act(() => {
      const seq = result.current.startNextRequest();
      result.current.startBackgroundStatusPolling(seq, "hello");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(applied.some((s) => s.status === "pending")).toBe(true);
    expect(applied.some((s) => s.status === "completed")).toBe(true);
    vi.useRealTimers();
  });

  it("stops polling after invalidateRequests", async () => {
    vi.useFakeTimers();
    setBackgroundStatusFixture({
      ...idleBackgroundStatusFixture(),
      status: "pending",
      question: "q",
      request_id: 2,
    });

    const applied: BackgroundRequestStatus[] = [];
    const { result } = renderHook(() =>
      useBackgroundGameAi(
        (status) => applied.push(status),
        () => {}
      )
    );

    act(() => {
      const seq = result.current.startNextRequest();
      result.current.startBackgroundStatusPolling(seq, "q");
      result.current.invalidateRequests();
    });

    const countAfterInvalidate = applied.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(applied.length).toBe(countAfterInvalidate);
    vi.useRealTimers();
  });
});
