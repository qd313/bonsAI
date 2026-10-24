/**
 * Title: With no chat open, a stored answer that belongs to a chat is not painted
 * Purpose: Pin the screen half of "after deleting the last chat, Main shows the old answer with ... above
 *          it". The back end hands the screen its last answer on every mount; an answer that names a chat
 *          (`chat_slot_id`) is that chat's, so with no chat open (the last one was just deleted) it belongs to
 *          nothing on screen and is refused, finished or still pending. With a chat open that is the answer's
 *          own, or with no chat given to the hook at all, it paints as before. An answer asked with no chat
 *          (no `chat_slot_id`) still paints, since it has no chat to be foreign to.
 * Used for: useBonsaiAskOrchestration.ts (`applyBackgroundStatusToUi`).
 * Does not: Rebuild the plugin around a Delete chat box; afterDeleteRebuild.test.tsx does that.
 */
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBonsaiAskOrchestration, type UseBonsaiAskOrchestrationArgs } from "./useBonsaiAskOrchestration";
import { resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../../../test-harness/rpcFixtures";
import type { BackgroundRequestStatus } from "../../../types/backgroundAsk";

function makeArgs(overrides: Partial<UseBonsaiAskOrchestrationArgs> = {}): UseBonsaiAskOrchestrationArgs {
  return {
    desktopDebugNoteAutoSave: false,
    filesystemWrite: false,
    strategySpoilerMaskingEnabled: false,
    askMode: "speed",
    unifiedInput: "",
    setUnifiedInput: vi.fn(),
    unifiedInputPersistenceMode: "no_persist",
    effectiveOllamaPcIp: "127.0.0.1:11434",
    selectedAttachment: null,
    setSelectedAttachment: vi.fn(),
    syncSettingsFromDisk: vi.fn(async () => undefined),
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputHostRef: { current: null },
    setNavigationMessage: vi.fn(),
    saveIp: vi.fn(),
    useLocalKnowledgeBase: false,
    ...overrides,
  };
}

const stored = (extra: Partial<BackgroundRequestStatus> = {}): BackgroundRequestStatus => ({
  ...idleBackgroundStatusFixture(),
  status: "completed",
  success: true,
  request_id: 7,
  question: "how do I parry?",
  response: "Tap L1 as it swings.",
  chat_slot_id: "gone-chat",
  ...extra,
});

async function settle() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

async function mountWith(status: BackgroundRequestStatus, activeSlotId: string | null | "no-ref") {
  setRpcHandler("get_background_game_ai_status", () => status);
  const onSlotTurnsChanged = vi.fn();
  const extra =
    activeSlotId === "no-ref"
      ? {}
      : { activeSlotIdRef: { current: activeSlotId } as UseBonsaiAskOrchestrationArgs["activeSlotIdRef"] };
  const hook = renderHook(() => useBonsaiAskOrchestration(makeArgs({ ...extra, onSlotTurnsChanged })));
  await settle();
  return hook;
}

describe("the stored answer at mount, with and without a chat open", () => {
  beforeEach(() => resetFakeDeckyRpc());

  it("no chat open: a finished answer that belongs to a chat is not painted", async () => {
    const { result } = await mountWith(stored(), null);
    expect(result.current.ollamaResponse).toBe("");
    expect(result.current.lastExchange).toBeNull();
  });

  it("no chat open: an answer still pending in a chat does not bring the spinner back", async () => {
    const { result } = await mountWith(stored({ status: "pending", success: null, response: "Thinking..." }), null);
    expect(result.current.isAsking).toBe(false);
  });

  it("the chat it belongs to is open: it paints", async () => {
    const { result } = await mountWith(stored(), "gone-chat");
    expect(result.current.ollamaResponse).toBe("Tap L1 as it swings.");
  });

  it("an answer asked with no chat still paints with no chat open", async () => {
    const { result } = await mountWith(stored({ chat_slot_id: null }), null);
    expect(result.current.ollamaResponse).toBe("Tap L1 as it swings.");
  });

  it("a hook given no chat pointer at all paints as before", async () => {
    const { result } = await mountWith(stored(), "no-ref");
    expect(result.current.ollamaResponse).toBe("Tap L1 as it swings.");
  });
});
