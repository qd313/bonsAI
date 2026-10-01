/**
 * How it works: the Ask hook, mounted FRESH, the way the panel is when a person closes Quick
 * Access while an answer writes and opens it again. On that open the hook asks the back end for
 * the last finished answer and paints it. These tests check what that paint hands the screen: the
 * Strategy checklist that came with the answer, and the mode and screenshot the Helpful row's
 * refine chips send a follow-up with. The older checklist tests always press Ask in the same open,
 * which is why they never saw a reopen forget the mode (plan 78, finding 1).
 */
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useBonsaiAskOrchestration,
  type UseBonsaiAskOrchestrationArgs,
} from "./useBonsaiAskOrchestration";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../test-harness/rpcFixtures";
import type { BackgroundRequestStatus } from "../types/backgroundAsk";

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
    setSelectedIndex: vi.fn(),
    setNavigationMessage: vi.fn(),
    saveIp: vi.fn(),
    persistSearchQuery: vi.fn(),
    useLocalKnowledgeBase: false,
    ...overrides,
  };
}

const CHECKLIST = {
  title: "Dealing with Exploders",
  items: [
    { id: "1", label: "Maintain distance from immediate explosions" },
    { id: "2", label: "Use kiting movement to avoid direct contact" },
  ],
};

/** What the back end reports for a Strategy answer that finished while the panel was shut. */
function finishedStrategyStatus(extra: Partial<BackgroundRequestStatus> = {}): BackgroundRequestStatus {
  return {
    ...idleBackgroundStatusFixture(),
    status: "completed",
    success: true,
    request_id: 31,
    question: "how do i deal with the exploders",
    response: "Keep your distance and let them come to you.",
    app_id: "570",
    app_context: "active",
    app_name: "Dota 2",
    strategy_checklist: CHECKLIST,
    ask_mode: "strategy",
    ...extra,
  };
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

describe("a fresh open painting the last finished answer (plan 78, finding 1)", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("brings the Strategy checklist back when the answer finished while the panel was shut", async () => {
    setRpcHandler("get_background_game_ai_status", () => finishedStrategyStatus());

    // The panel's own setting is Speed here: the mode comes from the answer, not from the screen.
    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs({ askMode: "speed" })));
    await settle();

    expect(result.current.strategyChecklist?.title).toBe("Dealing with Exploders");
    expect(result.current.strategyChecklist?.items).toHaveLength(2);
  });

  it("gives the answer on screen the mode it was asked in, not Speed", async () => {
    setRpcHandler("get_background_game_ai_status", () => finishedStrategyStatus());

    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs({ askMode: "speed" })));
    await settle();

    expect(result.current.lastExchange?.answer).toContain("Keep your distance");
    expect(result.current.lastExchange?.askMode).toBe("strategy");
  });

  it("sends a refine chip's follow-up in Strategy mode after the reopen", async () => {
    setRpcHandler("get_background_game_ai_status", () => finishedStrategyStatus());
    setRpcHandler("start_background_game_ai", () => ({
      accepted: true,
      status: "pending",
      request_id: 32,
    }));

    // Panel setting Speed on purpose: the follow-up must follow the answer's mode.
    const { result } = renderHook(() =>
      useBonsaiAskOrchestration(
        makeArgs({ askMode: "speed", unifiedInput: "Make it shorter: how do i deal with the exploders" }),
      ),
    );
    await settle();

    await act(async () => {
      await result.current.onReplyMicroAction("too_long");
    });
    // The box text is sent as typed (no override), which is how a chip's follow-up goes out.
    await act(async () => {
      await result.current.onAskOllama();
    });

    const starts = getRpcCallLog().filter((c) => c.method === "start_background_game_ai");
    expect(starts).toHaveLength(1);
    expect(starts[0].args[0]).toMatchObject({ ask_mode: "strategy" });
  });

  it("does not claim Speed or a screenshot it never knew about when the status carries no mode", async () => {
    // An older back end, or a keyword command: no mode on the status at all.
    setRpcHandler("get_background_game_ai_status", () =>
      finishedStrategyStatus({ ask_mode: undefined, strategy_checklist: null }),
    );

    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs({ askMode: "strategy" })));
    await settle();

    expect(result.current.lastExchange?.answer).toContain("Keep your distance");
    // Unset, so the chip falls back to the panel's own mode instead of a made-up Speed.
    expect(result.current.lastExchange?.askMode).toBeUndefined();
    expect(result.current.lastExchange?.attachments).toBeUndefined();
  });

  it("still ignores a checklist on an answer that was asked in Speed", async () => {
    setRpcHandler("get_background_game_ai_status", () => finishedStrategyStatus({ ask_mode: "speed" }));

    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs({ askMode: "strategy" })));
    await settle();

    expect(result.current.strategyChecklist).toBeNull();
    expect(result.current.lastExchange?.askMode).toBe("speed");
  });
});
