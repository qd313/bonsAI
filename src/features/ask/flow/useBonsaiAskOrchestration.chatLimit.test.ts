/**
 * Title: Ask with ten chats saved and none open stops at the front, before anything is sent
 * Purpose: Pin the order the Ask now runs in (P105-TEN-CHATS-ASK-01). The gate (`holdAskAtChatLimit`) is asked
 *          first, once the question is known. When it holds the question (the "pick a chat to delete" list is
 *          now open), nothing is sent, no chat is made, the question box is not cleared and the spinner does
 *          not start, so Cancel or B leaves the question where it was. When it lets the question through, the
 *          Ask runs exactly as before. The low-memory warning's "Ask anyway" reaches the same gate.
 * Used for: useBonsaiAskOrchestration.ts (onAskOllama), lowMemoryNotice.ts (askAnyway).
 * Does not: Open the list or move the ring: useAskAtChatLimit.test.tsx covers that.
 */
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBonsaiAskOrchestration, type UseBonsaiAskOrchestrationArgs } from "./useBonsaiAskOrchestration";
import { askAnyway } from "../../answer/transcript/lowMemoryNotice";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";

function makeArgs(overrides: Partial<UseBonsaiAskOrchestrationArgs> = {}): UseBonsaiAskOrchestrationArgs {
  return {
    desktopDebugNoteAutoSave: false,
    filesystemWrite: false,
    strategySpoilerMaskingEnabled: false,
    askMode: "speed",
    unifiedInput: "where is the key",
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
    activeSlotIdRef: { current: null },
    ...overrides,
  };
}

const sends = () => getRpcCallLog().filter((c) => c.method === "start_background_game_ai");

beforeEach(() => {
  resetFakeDeckyRpc();
  setRpcHandler("start_background_game_ai", () => ({ accepted: true, status: "pending", request_id: 1 }));
});

describe("the gate at the front of the Ask", () => {
  it("is asked first, with the question the person typed", async () => {
    const holdAskAtChatLimit = vi.fn(() => true);
    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs({ holdAskAtChatLimit })));
    await act(async () => {
      await result.current.onAskOllama();
    });
    expect(holdAskAtChatLimit).toHaveBeenCalledWith("where is the key", undefined);
  });

  it("when it holds the question: nothing is sent, no chat is made, the box is not cleared, no spinner", async () => {
    const ensureActiveSlotForAsk = vi.fn(async () => "slot-new");
    const setUnifiedInput = vi.fn();
    const { result } = renderHook(() =>
      useBonsaiAskOrchestration(
        makeArgs({ holdAskAtChatLimit: () => true, ensureActiveSlotForAsk, setUnifiedInput }),
      ),
    );
    await act(async () => {
      await result.current.onAskOllama();
    });
    expect(sends()).toHaveLength(0);
    expect(ensureActiveSlotForAsk).not.toHaveBeenCalled();
    expect(setUnifiedInput).not.toHaveBeenCalled();
    expect(result.current.isAsking).toBe(false);
  });

  it("when it lets the question through: the Ask runs as before, into the chat made for it", async () => {
    const ensureActiveSlotForAsk = vi.fn(async () => "slot-new");
    const { result } = renderHook(() =>
      useBonsaiAskOrchestration(makeArgs({ holdAskAtChatLimit: () => false, ensureActiveSlotForAsk })),
    );
    await act(async () => {
      await result.current.onAskOllama();
    });
    expect(sends()).toHaveLength(1);
    expect((sends()[0]!.args[0] as { chat_slot_id?: string }).chat_slot_id).toBe("slot-new");
  });

  it("an empty question never reaches the gate (the usual toast comes first)", async () => {
    const holdAskAtChatLimit = vi.fn(() => true);
    const { result } = renderHook(() =>
      useBonsaiAskOrchestration(makeArgs({ unifiedInput: "  ", holdAskAtChatLimit })),
    );
    await act(async () => {
      await result.current.onAskOllama();
    });
    expect(holdAskAtChatLimit).not.toHaveBeenCalled();
  });

  it("Ask anyway under the low-memory warning goes through the same gate, with its caption", async () => {
    const holdAskAtChatLimit = vi.fn(() => true);
    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs({ holdAskAtChatLimit })));
    await act(async () => {
      await askAnyway(result.current.onAskOllama, "where is the key", "where is the key");
    });
    expect(holdAskAtChatLimit).toHaveBeenCalledWith("where is the key", {
      threadQuestionDisplay: "where is the key",
    });
    expect(sends()).toHaveLength(0);
  });
});
