/**
 * How it works: the Ask hook, checked at the step that runs after an answer finishes (plan 78).
 *
 * Finding 1: the hook is mounted FRESH, the way the panel is when a person closes Quick Access
 * while an answer writes and opens it again. On that open it asks the back end for the last
 * finished answer and paints it. These tests check what that paint hands the screen: the Strategy
 * checklist that came with the answer, and the mode and screenshot the Helpful row's refine chips
 * send a follow-up with. The older checklist tests always press Ask in the same open, which is why
 * they never saw a reopen forget the mode.
 *
 * Finding 2: the next question puts "the answer that just finished" into the history. The saved
 * chat has usually already loaded that same answer, under a different question text.
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

describe("the next question after an answer (plan 78, finding 2)", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });

  const LONG_PROMPT = "[Strategy follow-up] I'm at: Boss two. Earlier I asked: x";

  /**
   * Ask once, then stand in for the saved-chat reload that follows every finished answer: a row
   * with the slot's own id and the facts the back end saved (game, named boss, spoiler consent).
   * With a caption, the screen's copy is titled "I'm at: ..." while the saved row keeps the long
   * prompt as its question, which is how a branch pick or a tapped glossary word is saved.
   */
  async function askFirstAnswerThenLoadSavedChatRow(withCaption: boolean) {
    setRpcHandler("start_background_game_ai", () => ({
      accepted: true,
      status: "completed",
      success: true,
      response: "Hit the left arm first.",
      request_id: 51,
      app_id: "570",
      strategy_spoiler_consent_effective: false,
    }));
    const hook = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await act(async () => {
      await hook.result.current.onAskOllama(
        LONG_PROMPT,
        withCaption ? { threadQuestionDisplay: "I'm at: Boss two" } : undefined,
      );
    });
    const loadedRow = {
      id: "slot-turn-7",
      question: LONG_PROMPT,
      questionDisplay: withCaption ? "I'm at: Boss two" : undefined,
      answer: "Hit the left arm first.",
      transparency: null,
      appId: "570",
      appName: "Dota 2",
      askedEntity: "Left Arm",
      spoilerConsentEffective: true,
    };
    await act(async () => {
      hook.result.current.setAskThreadCollapsed([loadedRow]);
    });
    return { hook, loadedRow };
  }

  it("lists the answer once when the saved chat's row and the screen's copy name the question differently", async () => {
    const { hook } = await askFirstAnswerThenLoadSavedChatRow(true);

    await act(async () => {
      await hook.result.current.onAskOllama("what about the next boss");
    });

    expect(hook.result.current.askThreadCollapsed).toHaveLength(1);
  });

  it("leaves the saved chat's row as it was, with its game, named boss and spoiler consent", async () => {
    const { hook, loadedRow } = await askFirstAnswerThenLoadSavedChatRow(true);

    await act(async () => {
      await hook.result.current.onAskOllama("what about the next boss");
    });

    expect(hook.result.current.askThreadCollapsed).toEqual([loadedRow]);
  });

  it("leaves the saved chat's row alone when both name the question the same way too", async () => {
    const { hook, loadedRow } = await askFirstAnswerThenLoadSavedChatRow(false);

    await act(async () => {
      await hook.result.current.onAskOllama("what about the next boss");
    });

    expect(hook.result.current.askThreadCollapsed).toEqual([loadedRow]);
  });

  it("still adds the screen's copy when the saved chat has not loaded the answer yet", async () => {
    const { hook } = await askFirstAnswerThenLoadSavedChatRow(true);
    await act(async () => {
      hook.result.current.setAskThreadCollapsed([]);
    });

    await act(async () => {
      await hook.result.current.onAskOllama("what about the next boss");
    });

    expect(hook.result.current.askThreadCollapsed).toHaveLength(1);
    expect(hook.result.current.askThreadCollapsed[0].answer).toBe("Hit the left arm first.");
  });
});
