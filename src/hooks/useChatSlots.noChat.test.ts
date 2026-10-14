/**
 * Title: With no chat open, the reload blanks the live answer too (plan 93 lane B8)
 * Purpose: Pin the chat list's side of "after deleting the last chat, Main shows the old answer with ...":
 *          the reload from "no chat open" blanks the answer as well as the question; deleting the open
 *          chat falls back to no chat and so blanks it; deleting a chat that is not the one shown leaves
 *          the shown chat and its answer alone; and an answer asked with no chat to hold it (the back end
 *          refused to make one) is kept on screen, since it has nowhere else to live.
 * Used for: useChatSlots.ts (`reloadActiveSlotTranscript`, `deleteSlot`, `ensureActiveSlotForAsk`).
 * Does not: Rebuild the plugin around a Delete chat box; afterDeleteLastChat.test.tsx does.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useChatSlots } from "./useChatSlots";

vi.mock("../utils/chatSlotsApi", () => ({
  listChatSlots: vi.fn(async () => []),
  getChatSlot: vi.fn(async () => null),
  createChatSlot: vi.fn(async () => null),
  deleteChatSlot: vi.fn(async () => true),
  renameChatSlot: vi.fn(async () => null),
  keepChatTitle: vi.fn(async () => true),
}));

import * as chatSlotsApi from "../utils/chatSlotsApi";

const row = (id: string) => ({ id, label: id, created_at: 1, updated_at: 1 });
const chat = (id: string) => ({ ...row(id), turns: [] });

function mount(open: string | null) {
  const resetLiveAskPresentation = vi.fn();
  const activeSlotIdRef = { current: open };
  const hook = renderHook(() =>
    useChatSlots({
      activeSlotIdRef,
      setAskThreadCollapsed: vi.fn(),
      setAskThreadDisplayQuestion: vi.fn(),
      setExpandedTurnKey: vi.fn(),
      resetLiveAskPresentation,
    }),
  );
  return { ...hook, resetLiveAskPresentation, activeSlotIdRef };
}

describe("the chat list with no chat open", () => {
  beforeEach(() => {
    vi.mocked(chatSlotsApi.listChatSlots).mockReset().mockResolvedValue([]);
    vi.mocked(chatSlotsApi.getChatSlot).mockReset().mockResolvedValue(null);
    vi.mocked(chatSlotsApi.createChatSlot).mockReset().mockResolvedValue(null);
    vi.mocked(chatSlotsApi.deleteChatSlot).mockReset().mockResolvedValue(true);
  });

  it("the reload from no chat blanks the live answer", async () => {
    const { result, resetLiveAskPresentation } = mount(null);
    await act(async () => {
      await result.current.reloadActiveSlotTranscript();
    });
    expect(resetLiveAskPresentation).toHaveBeenCalledTimes(1);
  });

  it("deleting the open, last chat ends on no chat and blanks the live answer", async () => {
    vi.mocked(chatSlotsApi.listChatSlots).mockResolvedValue([]);
    const { result, resetLiveAskPresentation, activeSlotIdRef } = mount("only");
    await act(async () => {
      await result.current.deleteSlot("only");
    });
    expect(activeSlotIdRef.current).toBeNull();
    expect(resetLiveAskPresentation).toHaveBeenCalled();
  });

  it("deleting a chat that is not the one shown leaves the shown chat and its answer alone", async () => {
    vi.mocked(chatSlotsApi.listChatSlots).mockResolvedValue([row("shown")]);
    vi.mocked(chatSlotsApi.getChatSlot).mockResolvedValue(chat("shown") as never);
    const { result, resetLiveAskPresentation, activeSlotIdRef } = mount("shown");
    await act(async () => {
      await result.current.deleteSlot("other");
    });
    expect(activeSlotIdRef.current).toBe("shown");
    expect(resetLiveAskPresentation).not.toHaveBeenCalled();
  });

  it("an answer asked with no chat to hold it is kept when the screen reloads", async () => {
    vi.mocked(chatSlotsApi.listChatSlots).mockResolvedValue([row("a")]);
    const { result, resetLiveAskPresentation } = mount(null);
    await act(async () => {
      expect(await result.current.ensureActiveSlotForAsk("how do I parry?")).toBeNull();
      await result.current.reloadActiveSlotTranscript();
    });
    expect(resetLiveAskPresentation).not.toHaveBeenCalled();
  });
});
