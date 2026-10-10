import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";

import { useChatSlots } from "./useChatSlots";

/*
 * Plan 87 F2b. At ten chats the back end refuses to make an eleventh. A first question asked with no
 * chat open (after Clear cache, say) used to be sent anyway, and its answer was shown but never saved:
 * the screen emptied when it reloaded from no chat. The question now lands in the newest chat, with a
 * short notice, and nothing is deleted.
 */
vi.mock("../utils/chatSlotsApi", () => ({
  listChatSlots: vi.fn(),
  getChatSlot: vi.fn(),
  createChatSlot: vi.fn(),
  deleteChatSlot: vi.fn(async () => true),
  renameChatSlot: vi.fn(async () => null),
  keepChatTitle: vi.fn(async () => true),
}));

import * as api from "../utils/chatSlotsApi";

function tenChats() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `slot-${i}`,
    label: `Chat ${i}`,
    created_at: 0,
    updated_at: 100 - i,
    turn_count: 2,
  })) as unknown as Awaited<ReturnType<typeof api.listChatSlots>>;
}

function render() {
  const activeSlotIdRef = { current: null as string | null };
  const setAskThreadCollapsed = vi.fn();
  const hook = renderHook(() =>
    useChatSlots({
      activeSlotIdRef,
      setAskThreadCollapsed,
      setAskThreadDisplayQuestion: vi.fn(),
      setExpandedTurnKey: vi.fn(),
    }),
  );
  return { ...hook, activeSlotIdRef, setAskThreadCollapsed };
}

describe("first question with no open chat at ten chats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem("bonsai:active-chat-slot");
    vi.mocked(api.listChatSlots).mockResolvedValue(tenChats());
    // The back end's refusal reaches the screen as no slot.
    vi.mocked(api.createChatSlot).mockResolvedValue(null);
    vi.mocked(api.getChatSlot).mockResolvedValue({
      id: "slot-0",
      label: "Chat 0",
      created_at: 0,
      updated_at: 100,
      turns: [
        { id: "t1", role: "user", text: "an earlier question", created_at: 1 },
        { id: "t2", role: "assistant", text: "an earlier answer", created_at: 2 },
      ],
    } as unknown as Awaited<ReturnType<typeof api.getChatSlot>>);
  });

  it("opens the newest chat so the question is filed there, and deletes nothing", async () => {
    const { result, activeSlotIdRef } = render();
    let id: string | null = null;
    await act(async () => {
      id = await result.current.ensureActiveSlotForAsk("where is the key");
    });
    expect(id).toBe("slot-0");
    expect(activeSlotIdRef.current).toBe("slot-0");
    expect(window.localStorage.getItem("bonsai:active-chat-slot")).toBe("slot-0");
    expect(api.deleteChatSlot).not.toHaveBeenCalled();
  });

  it("tells the person where the question went", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.ensureActiveSlotForAsk("where is the key");
    });
    expect(toaster.toast).toHaveBeenCalledTimes(1);
    const shown = vi.mocked(toaster.toast).mock.calls[0]![0] as { body: string };
    expect(shown.body).toMatch(/10 chats/);
    expect(shown.body).toMatch(/newest chat/);
  });

  it("keeps the answer: the reload after it reads the chat, it does not blank the screen", async () => {
    const { result, setAskThreadCollapsed } = render();
    await act(async () => {
      await result.current.ensureActiveSlotForAsk("where is the key");
    });
    setAskThreadCollapsed.mockClear();
    await act(async () => {
      await result.current.reloadActiveSlotTranscript();
    });
    expect(api.getChatSlot).toHaveBeenCalledWith("slot-0");
    const drawn = setAskThreadCollapsed.mock.calls.at(-1)![0] as unknown[];
    expect(drawn.length).toBeGreaterThan(0);
  });

  it("does not use the fallback when the create failed for another reason", async () => {
    vi.mocked(api.listChatSlots).mockResolvedValue(tenChats().slice(0, 3));
    const { result, activeSlotIdRef } = render();
    let id: string | null = "unset";
    await act(async () => {
      id = await result.current.ensureActiveSlotForAsk("where is the key");
    });
    expect(id).toBeNull();
    expect(activeSlotIdRef.current).toBeNull();
    expect(toaster.toast).not.toHaveBeenCalled();
  });
});
