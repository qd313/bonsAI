/**
 * Title: The saved rows while another chat is being opened
 * Purpose: Pin, at the chat list hook, what the rows on screen do between the pick of another chat and
 *          the answer of the read: a switch from one chat to another empties them at once, and the plugin
 *          coming back to the chat it remembers leaves them alone (they are already that chat's).
 * Used for: useChatSlots.ts. The screen-level version is openAnotherChat.test.tsx.
 * Does not: Draw anything.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useChatSlots } from "./useChatSlots";

vi.mock("./chatSlotsApi", () => ({
  listChatSlots: vi.fn(async () => []),
  getChatSlot: vi.fn(async () => null),
  createChatSlot: vi.fn(async () => null),
  deleteChatSlot: vi.fn(async () => true),
  renameChatSlot: vi.fn(async () => null),
  keepChatTitle: vi.fn(async () => true),
}));

import * as api from "./chatSlotsApi";

const slot = (id: string) => ({
  id,
  label: id,
  created_at: 0,
  updated_at: 0,
  turns: [
    { id: `q-${id}`, role: "user", text: `Question in ${id}` },
    { id: `a-${id}`, role: "assistant", text: `Answer in ${id}` },
  ],
});

function setup(activeId: string | null) {
  const activeSlotIdRef = { current: activeId };
  const setAskThreadCollapsed = vi.fn();
  const setAskThreadDisplayQuestion = vi.fn();
  const setExpandedTurnKey = vi.fn();
  const hook = renderHook(() =>
    useChatSlots({ activeSlotIdRef, setAskThreadCollapsed, setAskThreadDisplayQuestion, setExpandedTurnKey }),
  );
  return { hook, setAskThreadCollapsed, setAskThreadDisplayQuestion, setExpandedTurnKey };
}

/** A read of the next chat that waits until `release` is called. */
function holdNextRead() {
  let release: (v: unknown) => void = () => {};
  vi.mocked(api.getChatSlot).mockImplementationOnce(
    () => new Promise((resolve) => (release = resolve)) as never,
  );
  return { release: (v: unknown) => release(v) };
}

beforeEach(() => {
  vi.mocked(api.getChatSlot).mockReset();
  vi.mocked(api.getChatSlot).mockResolvedValue(null as never);
});

describe("the saved rows while another chat is opened", () => {
  it("are emptied at the switch, before the read answers", async () => {
    const s = setup("slot-a");
    const read = holdNextRead();
    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = s.hook.result.current.selectSlot("slot-b");
    });
    expect(s.setAskThreadCollapsed).toHaveBeenLastCalledWith([]);
    expect(s.setAskThreadDisplayQuestion).toHaveBeenLastCalledWith("");
    expect(s.setExpandedTurnKey).toHaveBeenLastCalledWith("live");
    await act(async () => {
      read.release(slot("slot-b"));
      await pending;
    });
    const last = s.setAskThreadCollapsed.mock.calls.at(-1)![0] as Array<{ question: string }>;
    expect(last.map((t) => t.question)).toEqual(["Question in slot-b"]);
  });

  it("are left alone while the plugin comes back to the chat it remembers", async () => {
    const s = setup("slot-a");
    const read = holdNextRead();
    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = s.hook.result.current.restoreRememberedSlot("slot-b");
    });
    expect(s.setAskThreadCollapsed).not.toHaveBeenCalled();
    await act(async () => {
      read.release(slot("slot-b"));
      await pending;
    });
    expect(s.setAskThreadCollapsed).toHaveBeenCalledTimes(1);
  });

  it("are not emptied when the chat asked for is the one already open", async () => {
    const s = setup("slot-a");
    const read = holdNextRead();
    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = s.hook.result.current.restoreRememberedSlot("slot-a");
    });
    expect(s.setAskThreadCollapsed).not.toHaveBeenCalled();
    await act(async () => {
      read.release(slot("slot-a"));
      await pending;
    });
  });
});
