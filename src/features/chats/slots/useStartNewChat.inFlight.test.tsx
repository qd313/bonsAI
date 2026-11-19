/**
 * Title: The + for a new chat cannot make two chats -- tests
 * Purpose: Pin what the Deck check looks at: with fewer than ten chats, two presses of New chat before the
 *          first create has answered send one `create_chat_slot` (not two), a press after it has answered
 *          sends another, and a create that fails shows a "Could not start a new chat" toast and frees
 *          the guard so the next press works. Two hook copies stand in for the chats menu and the + beside
 *          the chat's name, which each call the hook on their own.
 * Used for: useStartNewChat.tsx.
 * Does not: Draw the menu or the + (chatsMenuNewChatAtTen.test.tsx covers the press); the ten-chats
 *           picker is not touched by this guard.
 */
import { act, renderHook } from "@testing-library/react";
import { toaster } from "@decky/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createChatSlot } from "./chatSlotsApi";
import { useStartNewChat } from "./useStartNewChat";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";

const FEW = [{ id: "a", name: "A", place: 1 }] as never;

/** A create that waits until the test lets it answer, like a back end that is slow. */
let answerCreate: (v: unknown) => void;
let failCreate: (e: unknown) => void;

const creates = () => getRpcCallLog().filter((c) => c.method === "create_chat_slot").length;

function menuCopy() {
  return renderHook(() =>
    useStartNewChat({
      chats: FEW,
      createSlot: () => createChatSlot({}),
      deleteSlot: async () => true,
    }),
  );
}

beforeEach(() => {
  resetFakeDeckyRpc();
  vi.mocked(toaster.toast).mockClear();
  setRpcHandler(
    "create_chat_slot",
    () =>
      new Promise((resolve, reject) => {
        answerCreate = resolve;
        failCreate = reject;
      }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("New chat press while a create is on its way", () => {
  it("two quick presses (even from two copies of the hook) send one create", async () => {
    const menu = menuCopy();
    const plus = menuCopy();
    await act(async () => {
      menu.result.current(null);
      plus.result.current(null);
      menu.result.current(null);
      await Promise.resolve();
    });
    expect(creates()).toBe(1);
    await act(async () => {
      answerCreate({ slot: null });
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it("a press after the create answered sends another", async () => {
    const menu = menuCopy();
    await act(async () => {
      menu.result.current(null);
      await Promise.resolve();
    });
    await act(async () => {
      answerCreate({ slot: null });
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      menu.result.current(null);
      await Promise.resolve();
    });
    expect(creates()).toBe(2);
    await act(async () => {
      answerCreate({ slot: null });
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it("a create that fails says so in a toast and frees the press", async () => {
    const menu = menuCopy();
    await act(async () => {
      menu.result.current(null);
      await Promise.resolve();
    });
    await act(async () => {
      failCreate(new Error("back end is asleep"));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Could not start a new chat", body: expect.stringContaining("back end is asleep") }),
    );
    await act(async () => {
      menu.result.current(null);
      await Promise.resolve();
    });
    expect(creates()).toBe(2);
    await act(async () => {
      answerCreate({ slot: null });
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it("a create that never answers frees the press at its deadline", async () => {
    vi.useFakeTimers();
    const menu = menuCopy();
    await act(async () => {
      menu.result.current(null);
      await Promise.resolve();
    });
    await act(async () => {
      menu.result.current(null);
    });
    expect(creates()).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await act(async () => {
      menu.result.current(null);
      await Promise.resolve();
    });
    expect(creates()).toBe(2);
  });
});
