/**
 * Title: The Sum up this chat button's job -- tests
 * Purpose: Pin the job's life against the fake back end (plan 68 step 5): an accepted start follows
 *          the back end's own seconds, a finished summary asks for the chat's summary to be read
 *          again, a failure says so once, Stop only asks the back end to stop, a refused start
 *          explains itself, and a summary still running when the plugin reopens is picked up.
 * Used for: useChatSumUpJob.ts.
 * Does not: Cover the button or the card -- SessionContextStrip.test.tsx draws those.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";

import { SUM_UP_FAILED_TOAST, SUM_UP_POLL_MS, useChatSumUpJob } from "./useChatSumUpJob";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../../test-harness/rpcFixtures";

function status(over: Record<string, unknown>) {
  return { ...idleBackgroundStatusFixture(), ...over };
}

let current: Record<string, unknown> = status({});

beforeEach(() => {
  vi.useFakeTimers();
  resetFakeDeckyRpc();
  vi.mocked(toaster.toast).mockClear();
  current = status({});
  setRpcHandler("get_background_game_ai_status", () => current);
});

afterEach(() => {
  vi.useRealTimers();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function tick() {
  await act(async () => {
    vi.advanceTimersByTime(SUM_UP_POLL_MS);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useChatSumUpJob", () => {
  it("an accepted start follows the back end's seconds, then reads the summary once it is written", async () => {
    setRpcHandler("sum_up_chat_slot", () => ({ accepted: true, status: "pending", request_id: 7 }));
    const onWritten = vi.fn();
    const { result } = renderHook(() => useChatSumUpJob(onWritten));
    await flush();

    await act(async () => {
      result.current.start("chat-1");
      await Promise.resolve();
    });
    await flush();
    expect(result.current.runningSlotId).toBe("chat-1");
    expect(getRpcCallLog().some((c) => c.method === "sum_up_chat_slot" && c.args[0] === "chat-1")).toBe(true);

    current = status({ status: "pending", kind: "sum_up", chat_slot_id: "chat-1", summing_up_seconds: 12 });
    await tick();
    expect(result.current.seconds).toBe(12);

    current = status({ status: "completed", kind: "sum_up", chat_slot_id: "chat-1" });
    await tick();
    expect(result.current.runningSlotId).toBeNull();
    expect(onWritten).toHaveBeenCalledWith("chat-1");
  });

  it("a failed summary says so once and reads nothing", async () => {
    setRpcHandler("sum_up_chat_slot", () => ({ accepted: true, status: "pending" }));
    const onWritten = vi.fn();
    const { result } = renderHook(() => useChatSumUpJob(onWritten));
    await flush();
    await act(async () => {
      result.current.start("chat-1");
      await Promise.resolve();
    });
    await flush();
    current = status({ status: "failed", kind: "sum_up", chat_slot_id: "chat-1" });
    await tick();
    expect(result.current.runningSlotId).toBeNull();
    expect(onWritten).not.toHaveBeenCalled();
    expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ body: SUM_UP_FAILED_TOAST }));
  });

  it("Stop only asks the back end to stop; the cancelled status then ends the job quietly", async () => {
    setRpcHandler("sum_up_chat_slot", () => ({ accepted: true, status: "pending" }));
    const onWritten = vi.fn();
    const { result } = renderHook(() => useChatSumUpJob(onWritten));
    await flush();
    await act(async () => {
      result.current.start("chat-1");
      await Promise.resolve();
    });
    await flush();
    await act(async () => {
      result.current.stop();
      await Promise.resolve();
    });
    expect(getRpcCallLog().some((c) => c.method === "abort_background_game_ai")).toBe(true);
    current = status({ status: "cancelled", kind: "sum_up", chat_slot_id: "chat-1" });
    await tick();
    expect(result.current.runningSlotId).toBeNull();
    expect(onWritten).not.toHaveBeenCalled();
    expect(toaster.toast).not.toHaveBeenCalled();
  });

  it("a refused start explains itself and runs nothing", async () => {
    setRpcHandler("sum_up_chat_slot", () => ({ accepted: false, status: "busy" }));
    const { result } = renderHook(() => useChatSumUpJob(vi.fn()));
    await flush();
    await act(async () => {
      result.current.start("chat-1");
      await Promise.resolve();
    });
    await flush();
    expect(result.current.runningSlotId).toBeNull();
    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Wait for the answer to finish, then sum up." })
    );
  });

  it("a summary still running when the plugin reopens is picked up, clock and all", async () => {
    current = status({ status: "pending", kind: "sum_up", chat_slot_id: "chat-9", summing_up_seconds: 20 });
    const onWritten = vi.fn();
    const { result } = renderHook(() => useChatSumUpJob(onWritten));
    await flush();
    expect(result.current.runningSlotId).toBe("chat-9");
    expect(result.current.seconds).toBe(20);
    current = status({ status: "completed", kind: "sum_up", chat_slot_id: "chat-9" });
    await tick();
    expect(onWritten).toHaveBeenCalledWith("chat-9");
  });

  it("an ordinary question running on reopen is not mistaken for a summary", async () => {
    current = status({ status: "pending", kind: "ask", chat_slot_id: "chat-9" });
    const { result } = renderHook(() => useChatSumUpJob(vi.fn()));
    await flush();
    expect(result.current.runningSlotId).toBeNull();
  });
});
