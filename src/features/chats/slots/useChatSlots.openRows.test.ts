/**
 * Title: The saved rows while another chat is being opened
 * Purpose: Pin, at the chat list hook, what the rows on screen do between the pick of another chat and
 *          the answer of the read: a switch from one chat to another empties them at once, and the plugin
 *          coming back to the chat it remembers leaves them alone (they are already that chat's).
 *          When the new chat cannot be read (nothing came back, or the call threw), the open chat goes back to
 *          the one being left with its rows, a toast says so, and the chat it goes back to is not deleted as
 *          never used.
 * Used for: useChatSlots.ts. The screen-level version is openAnotherChat.test.tsx.
 * Does not: Draw anything.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";

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

describe("a chat that cannot be read when it is picked", () => {
  const SUMMARIES = [
    { id: "slot-a", label: "New chat", created_at: 0, updated_at: 0 },
    { id: "slot-b", label: "B", created_at: 0, updated_at: 0 },
  ];

  /** Chat A is open with its rows on screen; then B is picked and its read fails the way `mode` says. */
  async function pickThatFails(mode: "null" | "throw", leftIsEmpty = false) {
    vi.mocked(api.listChatSlots).mockResolvedValue(SUMMARIES as never);
    const s = setup("slot-a");
    vi.mocked(api.getChatSlot).mockResolvedValueOnce({ ...slot("slot-a"), turns: leftIsEmpty ? [] : slot("slot-a").turns } as never);
    await act(async () => {
      await s.hook.result.current.refreshSummaries();
      await s.hook.result.current.reloadActiveSlotTranscript();
    });
    s.setAskThreadCollapsed.mockClear();
    vi.mocked(toaster.toast).mockClear();
    vi.mocked(api.deleteChatSlot).mockClear();
    if (mode === "throw") vi.mocked(api.getChatSlot).mockRejectedValueOnce(new Error("RPC timeout after 15000ms"));
    else vi.mocked(api.getChatSlot).mockResolvedValueOnce(null as never);
    /* The read that puts the left chat's rows back from disk, should the hook ask for it, finds the chat. */
    vi.mocked(api.getChatSlot).mockResolvedValue({ ...slot("slot-a"), turns: leftIsEmpty ? [] : slot("slot-a").turns } as never);
    await act(async () => {
      await s.hook.result.current.selectSlot("slot-b");
    });
    return s;
  }

  it.each(["null", "throw"] as const)("puts the left chat back with its rows and says so (%s)", async (mode) => {
    const s = await pickThatFails(mode);
    expect(s.hook.result.current.activeSlotId).toBe("slot-a");
    const last = s.setAskThreadCollapsed.mock.calls.at(-1)![0] as Array<{ question: string }>;
    expect(last.map((t) => t.question)).toEqual(["Question in slot-a"]);
    const titles = vi.mocked(toaster.toast).mock.calls.map((c) => (c[0] as { title: string }).title);
    expect(titles).toEqual(["Could not open that chat"]);
  });

  it.each(["null", "throw"] as const)("does not delete the empty chat it goes back to (%s)", async (mode) => {
    await pickThatFails(mode, true);
    expect(api.deleteChatSlot).not.toHaveBeenCalled();
  });

  it("still deletes an empty unused chat when the other chat opens fine", async () => {
    vi.mocked(api.listChatSlots).mockResolvedValue(SUMMARIES as never);
    const s = setup("slot-a");
    vi.mocked(api.getChatSlot).mockResolvedValueOnce({ ...slot("slot-a"), turns: [] } as never);
    await act(async () => {
      await s.hook.result.current.refreshSummaries();
      await s.hook.result.current.reloadActiveSlotTranscript();
    });
    vi.mocked(api.getChatSlot).mockResolvedValueOnce(slot("slot-b") as never);
    await act(async () => {
      await s.hook.result.current.selectSlot("slot-b");
    });
    expect(api.deleteChatSlot).toHaveBeenCalledWith("slot-a");
  });

  it("leaves the pointer dropped when the plugin comes back to a chat that is gone", async () => {
    const s = setup(null);
    await act(async () => {
      await s.hook.result.current.restoreRememberedSlot("slot-gone");
    });
    expect(s.hook.result.current.activeSlotId).toBeNull();
    expect(toaster.toast).not.toHaveBeenCalled();
  });
});
