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

  /**
   * The cadence follows ``streaming``, not the setting: prep phases (KB search, Proton logs,
   * screenshot prep) publish no partial text, so polling them at 150ms only costs RPCs.
   */
  it("polls slowly while pending without tokens, and fast once streaming starts", async () => {
    vi.useFakeTimers();
    let streaming = false;
    let polls = 0;
    setRpcHandler("get_background_game_ai_status", () => {
      polls += 1;
      return {
        ...idleBackgroundStatusFixture(),
        status: "pending",
        question: "q",
        request_id: 3,
        streaming,
        partial_response: streaming ? "partial" : null,
      } as BackgroundRequestStatus;
    });

    const { result } = renderHook(() =>
      useBackgroundGameAi(
        () => {},
        () => {}
      )
    );

    act(() => {
      const seq = result.current.startNextRequest();
      result.current.startBackgroundStatusPolling(seq, "q");
    });

    // Prep phase: one immediate poll plus one per 1200ms.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    const slowPolls = polls;
    expect(slowPolls).toBeLessThanOrEqual(4);

    streaming = true;
    // Let the in-flight slow timer deliver the first streaming status, then measure the fast phase.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    const atStreamStart = polls;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    // ~10 polls per 1500ms at 150ms, versus at most 2 at the slow cadence.
    expect(polls - atStreamStart).toBeGreaterThan(5);

    result.current.invalidateRequests();
    vi.useRealTimers();
  });

  /*
   * Plan 70: with a game running the panel drew about 11 frames a second while an answer arrived,
   * and each status check that brings text is a redraw of the whole plugin. The Ask hook hands a
   * slower pace then (lighterWhileGameRuns.ts), read at every check.
   */
  it("checks at the streaming pace it is handed, read afresh at every check", async () => {
    vi.useFakeTimers();
    let polls = 0;
    setRpcHandler("get_background_game_ai_status", () => {
      polls += 1;
      return {
        ...idleBackgroundStatusFixture(),
        status: "pending",
        question: "q",
        request_id: 4,
        streaming: true,
        partial_response: "partial",
      } as BackgroundRequestStatus;
    });
    let paceMs = 500;
    const { result } = renderHook(() =>
      useBackgroundGameAi(
        () => {},
        () => {},
        () => paceMs
      )
    );

    act(() => {
      const seq = result.current.startNextRequest();
      result.current.startBackgroundStatusPolling(seq, "q");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const first = polls;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    // Three checks in 1500 ms at 500 ms apart, not the ten a 150 ms pace would make.
    expect(polls - first).toBe(3);

    paceMs = 150;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    // The check already waiting keeps its 500 ms; every one after it follows the new pace.
    expect(polls - first - 3).toBeGreaterThanOrEqual(7);

    result.current.invalidateRequests();
    vi.useRealTimers();
  });
});
