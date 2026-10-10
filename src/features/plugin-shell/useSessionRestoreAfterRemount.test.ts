/**
 * Title: A saved pointer to a chat that is gone, after the plugin restarts
 *
 * Purpose: Pins what a person sees when the plugin reopens and the chat it remembers no longer
 * exists on disk (the saved chats were wiped or restored from an older copy while the screen's
 * own memory survived): the dead pointer must be dropped, so the next question is saved in a chat
 * that exists, never under the dead id.
 *
 * Used for: `npm test` only.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useChatSlots } from "../../hooks/useChatSlots";
import { useSessionRestoreAfterRemount } from "./useSessionRestoreAfterRemount";
import { loadActiveChatSlotId, saveActiveChatSlotId } from "./pluginStorage";

vi.mock("../../utils/chatSlotsApi", () => ({
  listChatSlots: vi.fn(async () => []),
  getChatSlot: vi.fn(async () => null),
  createChatSlot: vi.fn(async () => ({ id: "fresh-chat", label: "New chat", created_at: 0, updated_at: 0, turns: [] })),
  deleteChatSlot: vi.fn(async () => true),
  renameChatSlot: vi.fn(async () => null),
  keepChatTitle: vi.fn(async () => true),
}));
/* A plain mount: no snapshot left behind by a Decky modal closing. */
vi.mock("../../utils/bonsaiSessionSurvival", () => ({
  clearBonsaiSessionSurvival: vi.fn(),
  consumeBonsaiSessionAfterRemount: vi.fn(() => null),
  finalizeSessionRestoreAfterRemount: vi.fn(),
  shouldIgnoreRestoredSettingsSnapshot: vi.fn(() => false),
}));
vi.mock("../../utils/bonsaiReplySurface", () => ({ consumePendingFocusMainTab: vi.fn(() => false) }));
vi.mock("../../utils/bonsaiDebugIngest", () => ({ bonsaiDebugLog: vi.fn() }));

import * as chatSlotsApi from "../../utils/chatSlotsApi";

const savedChat = (id: string) => ({ id, label: "Old chat", created_at: 1, updated_at: 1, turns: [] });

function mountPlugin(storedId: string) {
  saveActiveChatSlotId(storedId);
  /* A fresh mount reads the pointer into the ref, the way index.tsx does. */
  const activeSlotIdRef = { current: null as string | null };
  /* Stable across renders, like the real ones: new ones every render would re-run the restore. */
  const noop = vi.fn();
  const slotArgs = {
    activeSlotIdRef,
    setAskThreadCollapsed: noop,
    setAskThreadDisplayQuestion: noop,
    setExpandedTurnKey: noop,
  };
  const restoreArgs = {
    pluginDataClearSeenRef: { current: 0 },
    pendingSessionRestoreFinalizeRef: { current: false },
    activeSlotIdRef,
    setCurrentTab: noop,
    setUnifiedInput: noop,
    setNavigationMessage: noop,
    restoreScreenshotBrowserSnapshot: noop,
    restorePluginHelpDismissed: noop,
    setOllamaIp: noop,
    hydrateFromSettings: noop,
    restoreSessionSnapshot: noop,
  };
  return renderHook(() => {
    const chatSlots = useChatSlots(slotArgs);
    useSessionRestoreAfterRemount({ ...restoreArgs, chatSlots });
    return chatSlots;
  });
}

describe("reopening the plugin with a remembered chat that is gone", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(chatSlotsApi.getChatSlot).mockReset();
    vi.mocked(chatSlotsApi.createChatSlot).mockClear();
  });

  it("saves the next question in a chat that exists, never under the dead id", async () => {
    vi.mocked(chatSlotsApi.getChatSlot).mockResolvedValue(null);
    const { result } = mountPlugin("dead-chat");
    await act(async () => {});

    let target: string | null = null;
    await act(async () => {
      target = await result.current.ensureActiveSlotForAsk("how do I beat the boss?");
    });

    expect(target).not.toBe("dead-chat");
    expect(target).toBe("fresh-chat");
    expect(vi.mocked(chatSlotsApi.createChatSlot)).toHaveBeenCalledTimes(1);
    expect(loadActiveChatSlotId()).toBe("fresh-chat");
  });

  it("still reopens a remembered chat that does load, and asks into it", async () => {
    vi.mocked(chatSlotsApi.getChatSlot).mockResolvedValue(savedChat("kept-chat") as never);
    const { result } = mountPlugin("kept-chat");
    await act(async () => {});

    let target: string | null = null;
    await act(async () => {
      target = await result.current.ensureActiveSlotForAsk("next question");
    });

    expect(target).toBe("kept-chat");
    expect(vi.mocked(chatSlotsApi.createChatSlot)).not.toHaveBeenCalled();
  });
});
