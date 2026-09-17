/**
 * Characterization tests for the Ask lifecycle — written before the entry-point
 * split so a behavior-preserving refactor can be shown to preserve behavior.
 *
 * These assert what a user gets: which RPC is sent, what the answer text
 * becomes, whether the spinner is up. They deliberately do not assert internal
 * shape (which useState holds what, call ordering within a branch), because
 * that is exactly what the refactor is allowed to change.
 */
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";
import {
  useBonsaiAskOrchestration,
  resolveInitialOllamaContext,
  type UseBonsaiAskOrchestrationArgs,
} from "./useBonsaiAskOrchestration";
import { Router } from "@decky/ui";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../test-harness/rpcFixtures";
import { THINKING_BLURB_PLACEHOLDER } from "../utils/thinkingSummaryText";
import type { BonsaiSessionSurvivalSnapshot } from "../utils/bonsaiSessionSurvival";
import {
  DEFAULT_CAPABILITIES,
  DEFAULT_DESKTOP_APP_LOG_LEVEL,
  DEFAULT_MODEL_POLICY_TIER,
} from "../data/bonsaiSettingsSchema";

function minimalSurvivalSnapshot(
  overrides: Partial<BonsaiSessionSurvivalSnapshot> = {},
): BonsaiSessionSurvivalSnapshot {
  return {
    currentTab: "main",
    unifiedInput: "",
    selectedIndex: -1,
    navigationMessage: "",
    selectedAttachment: null,
    isScreenshotBrowserOpen: false,
    mediaError: "",
    recentScreenshots: [],
    isLoadingRecentScreenshots: false,
    pluginHelpDismissed: true,
    ollamaIp: "127.0.0.1:11434",
    settingsSnapshot: {
      latencyWarningSeconds: 45,
      requestTimeoutSeconds: 120,
      latencyTimeoutsCustomEnabled: false,
      unifiedInputPersistenceMode: "persist_all",
      voiceReplyMode: "off",
      screenshotAttachmentPreset: "mid",
      desktopDebugNoteAutoSave: false,
      desktopAskVerboseLogging: false,
      desktopAppLogLevel: DEFAULT_DESKTOP_APP_LOG_LEVEL,
      presetChipFadeAnimationEnabled: true,
      presetChipAnimation: "fade",
      presetSingleChip: false,
      inputSanitizerUserDisabled: false,
      capabilities: { ...DEFAULT_CAPABILITIES },
      aiCharacterEnabled: true,
      aiCharacterRandom: false,
      aiCharacterPresetId: "coach",
      aiCharacterCustomText: "",
      aiCharacterAccentIntensity: "balanced",
      askMode: "speed",
      ollamaKeepAlive: "5m",
      replyVerbosity: "balanced",
      askThinkEffort: "off",
      replyLanguage: "follow_system",
      showDeveloperTab: false,
      modelPolicyTier: DEFAULT_MODEL_POLICY_TIER,
      modelPolicyNonFossUnlocked: false,
      modelAllowHighVramFallbacks: false,
      ollamaLocalOnDeck: true,
      ollamaLocalAutostart: false,
      strategySpoilerMaskingEnabled: true,
      strategySpoilerAutoRevealAfterConsent: false,
      steamWebApiKey: "",
      showOnscreenDebugHud: false,
      devForceSessionRagChips: false,
      devPreloadAskModel: false,
      devFrozenTestChips: [],
      tabResumeMode: "resume",
      namedOllamaHosts: [],
      voiceSttModel: "tiny.en",
      uiScaleAutoEnabled: true,
      uiScaleManualProfile: "handheld",
      useLocalKnowledgeBase: false,
      ragHybridRetrievalEnabled: true,
      ragCorpusPath: "",
      ragCorpusVersion: "",
      textModelRoutingOrder: [],
      visionModelRoutingOrder: [],
    },
    ollamaResponse: "",
    ollamaContext: null,
    lastExchange: null,
    askThreadCollapsed: [],
    askThreadDisplayQuestion: "",
    expandedTurnKey: "live",
    suggestedPrompts: [],
    lastTransparency: null,
    modelPolicyDisclosure: null,
    strategyGuideBranches: null,
    strategyChecklist: null,
    elapsedSeconds: null,
    lastApplied: null,
    shortcutSetupVariant: null,
    presetCarouselInject: null,
    showSlowWarning: false,
    lastRequestId: null,
    thinkingSummary: null,
    liveReasoning: null,
    activeSlotId: null,
    ...overrides,
  };
}

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

function startCalls() {
  return getRpcCallLog().filter((c) => c.method === "start_background_game_ai");
}

function startPayload(index = 0) {
  return startCalls()[index]?.args[0] as Record<string, unknown> | undefined;
}

/**
 * Keep an accepted request in flight. Needed because polling starts with an
 * immediate `pollOnce()` rather than after a delay, so the default idle fixture
 * would contradict a `pending` start and drop the spinner on the first poll.
 */
function keepRequestPending(requestId: number, question = "q") {
  setRpcHandler("start_background_game_ai", () => ({
    accepted: true,
    status: "pending",
    request_id: requestId,
  }));
  setRpcHandler("get_background_game_ai_status", () => ({
    ...idleBackgroundStatusFixture(),
    status: "pending",
    question,
    request_id: requestId,
  }));
}

describe("useBonsaiAskOrchestration", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });

  /*
   * Fake timers are restored here, not only at the end of each test that installs them: a test that
   * fails before its own `useRealTimers()` used to leave them installed, and the next test to await
   * a real `setTimeout` then hung until the 20s vitest timeout — one assertion failure reported as
   * two, with the second pointing at innocent code.
   */
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("submit guards", () => {
    it("refuses an empty question and sends nothing", async () => {
      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs({ unifiedInput: "   " })));

      await act(async () => {
        await result.current.onAskOllama();
      });

      expect(startCalls()).toHaveLength(0);
      expect(toaster.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Question required" }),
      );
      expect(result.current.isAsking).toBe(false);
    });

    it("refuses to ask with no host configured", async () => {
      const { result } = renderHook(() =>
        useBonsaiAskOrchestration(makeArgs({ effectiveOllamaPcIp: "" })),
      );

      await act(async () => {
        await result.current.onAskOllama("how do I beat this boss");
      });

      expect(startCalls()).toHaveLength(0);
      expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "PC IP required" }));
    });

    it("allows local-only commands through with no host configured", async () => {
      const { result } = renderHook(() =>
        useBonsaiAskOrchestration(makeArgs({ effectiveOllamaPcIp: "" })),
      );

      await act(async () => {
        await result.current.onAskOllama("bonsai:vac-check 76561198000000000");
      });

      expect(startCalls()).toHaveLength(1);
    });
  });

  describe("submit", () => {
    it("sends the question with the running game and ask mode, and shows the spinner", async () => {
      keepRequestPending(1, "where is the key");
      const setUnifiedInput = vi.fn();
      const saveIp = vi.fn();
      const { result } = renderHook(() =>
        useBonsaiAskOrchestration(
          makeArgs({ askMode: "strategy", setUnifiedInput, saveIp, unifiedInput: "where is the key" }),
        ),
      );

      await act(async () => {
        await result.current.onAskOllama();
      });

      const payload = startPayload();
      expect(payload).toMatchObject({
        question: "where is the key",
        PcIp: "127.0.0.1:11434",
        appId: "570",
        appName: "Dota 2",
        ask_mode: "strategy",
      });
      expect(result.current.isAsking).toBe(true);
      expect(setUnifiedInput).toHaveBeenCalledWith("");
      expect(saveIp).toHaveBeenCalledWith("127.0.0.1:11434");
    });

    it("sends the selected screenshot as an attachment", async () => {
      const { result } = renderHook(() =>
        useBonsaiAskOrchestration(
          makeArgs({
            selectedAttachment: {
              path: "/home/deck/shot.png",
              name: "shot.png",
              source: "recent",
              app_id: "570",
            },
          }),
        ),
      );

      await act(async () => {
        await result.current.onAskOllama("what is this");
      });

      expect(startPayload()?.attachments).toEqual([
        { path: "/home/deck/shot.png", name: "shot.png", source: "recent", app_id: "570" },
      ]);
    });

    /*
     * The backend files both turns from this payload and drops them when `chat_slot_id` is
     * absent -- silently for the user turn, with an error for the assistant's. These two pin
     * the wiring rather than the slot logic, because the bug that motivated them was neither:
     * `ensureActiveSlotForAsk` was written, exported and unit-tested, and then never called,
     * so every Ask on a fresh session shipped without an id and persisted nothing.
     */
    it("creates a slot for an Ask that has none, and sends its id", async () => {
      const ensureActiveSlotForAsk = vi.fn(async () => "slot-1");

      const { result } = renderHook(() =>
        useBonsaiAskOrchestration(
          makeArgs({ activeSlotIdRef: { current: null }, ensureActiveSlotForAsk }),
        ),
      );

      await act(async () => {
        await result.current.onAskOllama("where is the key");
      });

      expect(ensureActiveSlotForAsk).toHaveBeenCalledWith("where is the key");
      expect(startPayload()?.chat_slot_id).toBe("slot-1");
    });

    it("still asks when the slot cannot be created, just without an id", async () => {
      const { result } = renderHook(() =>
        useBonsaiAskOrchestration(
          makeArgs({
            activeSlotIdRef: { current: null },
            ensureActiveSlotForAsk: vi.fn(async () => {
              throw new Error("disk full");
            }),
          }),
        ),
      );

      await act(async () => {
        await result.current.onAskOllama("where is the key");
      });

      expect(startCalls()).toHaveLength(1);
      expect(startPayload()?.chat_slot_id).toBeUndefined();
    });

    /*
     * Python is the only writer of thinking copy. These four pin that the client renders what it
     * is given and never invents a replacement -- the failure they guard against is not a wrong
     * string, it is the line changing on its own within the first second of an Ask.
     */
    it("renders the opener the backend returned, not one of its own", async () => {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "pending",
        request_id: 1,
        thinking_summary: "Log spelunking for why crash on launch. Glamorous.",
      }));
      setRpcHandler("get_background_game_ai_status", () => ({
        ...idleBackgroundStatusFixture(),
        status: "pending",
        question: "why crash on launch",
        request_id: 1,
      }));
      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("why crash on launch");
      });

      expect(result.current.thinkingSummary).toBe(
        "Log spelunking for why crash on launch. Glamorous.",
      );
    });

    /*
     * Real timers on purpose. onAskOllama waits 50ms for the field blur to settle before it
     * touches any state, so under fake timers the blur wait and the RPC resolve in the same flush
     * and the intermediate frame is unobservable. Gating the RPC is the only way to see the state
     * the user actually sees during the round trip, which is the cost decision 4(a) accepted.
     */
    it("shows the placeholder until the backend opener arrives, then swaps it", async () => {
      let releaseStart = () => {};
      const gate = new Promise<void>((resolve) => {
        releaseStart = resolve;
      });
      keepRequestPending(1, "why crash on launch");
      setRpcHandler("start_background_game_ai", async () => {
        await gate;
        return { accepted: true, status: "pending", request_id: 1, thinking_summary: "Woven line." };
      });
      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      let pending: Promise<void> | undefined;
      act(() => {
        pending = result.current.onAskOllama("why crash on launch");
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 80));
      });
      expect(result.current.thinkingSummary).toBe(THINKING_BLURB_PLACEHOLDER);

      await act(async () => {
        releaseStart();
        await pending;
      });
      expect(result.current.thinkingSummary).toBe("Woven line.");
    });

    it("falls back to the placeholder when the backend returns no opener", async () => {
      keepRequestPending(1, "why crash on launch");
      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("why crash on launch");
      });

      expect(result.current.thinkingSummary).toBe(THINKING_BLURB_PLACEHOLDER);
    });

    it("keeps the current line when a poll carries no summary", async () => {
      vi.useFakeTimers();
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "pending",
        request_id: 1,
        thinking_summary: "Reading crash tea leaves.",
      }));
      setRpcHandler("get_background_game_ai_status", () => ({
        ...idleBackgroundStatusFixture(),
        status: "pending",
        question: "why crash on launch",
        request_id: 1,
        thinking_summary: null,
      }));
      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      let pending: Promise<void> | undefined;
      act(() => {
        pending = result.current.onAskOllama("why crash on launch");
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      await act(async () => {
        await pending;
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });

      expect(result.current.thinkingSummary).toBe("Reading crash tea leaves.");
    });

    it("keeps a lazy-opener summary visible rather than blanking the line", async () => {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "pending",
        request_id: 1,
        thinking_summary: "Sure.",
      }));
      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("why crash on launch");
      });

      expect(result.current.thinkingSummary).toBe("Sure.");
    });
  });

  describe("terminal responses", () => {
    it("shows an answer that the start call already completed", async () => {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "completed",
        success: true,
        response: "Head north past the bridge.",
        request_id: 7,
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("where do I go");
      });

      // No timers advanced: the answer must already be on screen. (Status polling
      // still happens here — startAskCompletionWatch runs before this branch —
      // so "no polling" is not the property to assert.)
      expect(result.current.ollamaResponse).toContain("Head north past the bridge.");
      expect(result.current.isAsking).toBe(false);
    });

    it("warns once per model when the model cannot think", async () => {
      const completed = (model: string) => ({
        accepted: true,
        status: "completed",
        success: true,
        response: "Answered without thinking.",
        request_id: 11,
        thinking_unsupported: true,
        model,
      });
      setRpcHandler("start_background_game_ai", () => completed("gemma3:4b"));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("first question");
      });
      await act(async () => {
        await result.current.onAskOllama("second question");
      });

      const warnings = (toaster.toast as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([arg]) => (arg as { title?: string })?.title === "Thinking not supported",
      );
      expect(warnings).toHaveLength(1);
      expect((warnings[0][0] as { body?: string }).body).toContain("gemma3:4b");

      // A different model is a different fact about a different thing — warn again.
      setRpcHandler("start_background_game_ai", () => completed("llama3.2:3b"));
      await act(async () => {
        await result.current.onAskOllama("third question");
      });

      const allWarnings = (toaster.toast as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([arg]) => (arg as { title?: string })?.title === "Thinking not supported",
      );
      expect(allWarnings).toHaveLength(2);
    });

    it("stays quiet when the model handled thinking fine", async () => {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "completed",
        success: true,
        response: "Thought about it.",
        request_id: 12,
        thinking_unsupported: false,
        model: "qwen3:4b",
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("a question");
      });

      expect(toaster.toast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: "Thinking not supported" }),
      );
    });

    it("surfaces a blocked question and does not leave the spinner up", async () => {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: false,
        status: "blocked",
        response: "That input was not sent.",
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("something blocked");
      });

      expect(result.current.ollamaResponse).toBe("That input was not sent.");
      expect(result.current.isAsking).toBe(false);
      expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Input not sent" }));
    });

    it("surfaces an invalid request and does not leave the spinner up", async () => {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: false,
        status: "invalid",
        response: "Request is invalid.",
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("bad request");
      });

      expect(result.current.ollamaResponse).toBe("Request is invalid.");
      expect(result.current.isAsking).toBe(false);
    });

    it("reports a failed RPC as an error answer and clears the spinner", async () => {
      const onExternalFailure = vi.fn();
      setRpcHandler("start_background_game_ai", () => {
        throw new Error("backend unreachable");
      });

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs({ onExternalFailure })));

      await act(async () => {
        await result.current.onAskOllama("anything");
      });

      expect(result.current.ollamaResponse).toMatch(/^Error: /);
      expect(result.current.isAsking).toBe(false);
      expect(onExternalFailure).toHaveBeenCalledWith("ask_ollama", expect.any(String));
    });
  });

  describe("polling", () => {
    it("renders the answer that arrives from a later poll", async () => {
      vi.useFakeTimers();
      setRpcHandler("start_background_game_ai", () => ({ accepted: true, status: "pending", request_id: 3 }));
      let polls = 0;
      setRpcHandler("get_background_game_ai_status", () => {
        polls += 1;
        if (polls < 2) {
          return { ...idleBackgroundStatusFixture(), status: "pending", question: "q", request_id: 3 };
        }
        return {
          ...idleBackgroundStatusFixture(),
          status: "completed",
          question: "q",
          request_id: 3,
          success: true,
          response: "Use the grappling hook.",
        };
      });

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      let pending: Promise<void> | undefined;
      act(() => {
        pending = result.current.onAskOllama("q");
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      await act(async () => {
        await pending;
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.ollamaResponse).toContain("Use the grappling hook.");
      expect(result.current.isAsking).toBe(false);
      vi.useRealTimers();
    });

    /**
     * Reopen-while-thinking regression: a plugin remount (QAM close/reopen) starts
     * askThreadDisplayQuestion over at "" — no submit call ran to set it, and the survival
     * snapshot is only captured before a nested modal, not on a plain close. The mount-restore
     * poll (fired with no onAskOllama call here, mirroring a fresh mount) is the only thing left
     * that can supply the question, and it must fill the header while still pending, not only
     * once the answer lands.
     */
    it("fills the blank live question from the mount-restore poll while still thinking", async () => {
      vi.useFakeTimers();
      let polls = 0;
      setRpcHandler("get_background_game_ai_status", () => {
        polls += 1;
        if (polls < 3) {
          return {
            ...idleBackgroundStatusFixture(),
            status: "pending",
            question: "where do i find the reactor core",
            request_id: 9,
          };
        }
        return {
          ...idleBackgroundStatusFixture(),
          status: "completed",
          question: "where do i find the reactor core",
          request_id: 9,
          success: true,
          response: "It's in the engineering bay.",
        };
      });

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.askThreadDisplayQuestion).toBe("where do i find the reactor core");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.ollamaResponse).toContain("It's in the engineering bay.");
      expect(result.current.askThreadDisplayQuestion).toBe("where do i find the reactor core");
      vi.useRealTimers();
    });

    /**
     * Plan 54 gap 2, streaming: `lastExchange` stays empty until the answer completes, so the
     * live spoiler box has to read the name and the named thing from `ollamaContext` while a
     * pending poll is still streaming. Before this fix, a pending status never copied either
     * value onto `ollamaContext`.
     */
    it("carries the running game's name and the backend's named thing while still pending", async () => {
      vi.useFakeTimers();
      setRpcHandler("get_background_game_ai_status", () => ({
        ...idleBackgroundStatusFixture(),
        status: "pending",
        question: "wheatley fight",
        request_id: 10,
        app_name: "Doom 64: Retribution",
        strategy_spoiler_asked_entity: "Wheatley",
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.ollamaContext?.app_name).toBe("Doom 64: Retribution");
      expect(result.current.ollamaContext?.asked_entity).toBe("Wheatley");
      vi.useRealTimers();
    });

    /*
     * Plan 57: the model's own newest thinking has to reach the screen on EVERY poll, not only
     * when the answer finishes. A fact that only arrives at completion flickers into place at the
     * end instead of filling the wait — plan 54 needed a whole extra commit for exactly that.
     */
    it("carries the model's newest thinking and its seconds on a poll that is still pending", async () => {
      vi.useFakeTimers();
      setRpcHandler("get_background_game_ai_status", () => ({
        ...idleBackgroundStatusFixture(),
        status: "pending",
        question: "how do i kill the big armoured bug boss",
        request_id: 12,
        reasoning_partial: "The armour is on the front. So flank it.",
        reasoning_seconds: 4,
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.liveReasoning?.partial).toBe("The armour is on the front. So flank it.");
      expect(result.current.liveReasoning?.seconds).toBe(4);
      vi.useRealTimers();
    });

    /*
     * Plan 58 phase 1: the "From the notes" block's own material has to reach the screen on
     * every pending poll too, the same lesson the reasoning slice above already proves —
     * otherwise the block only ever appears once the reply is finished, which is the flicker
     * plan 54 needed a fourth commit to fix.
     */
    it("carries the attached notes on a poll that is still pending", async () => {
      vi.useFakeTimers();
      const note = {
        name: "Starting out in Pikmin 2",
        kind: "mechanic",
        card: "There is no day limit this time.",
        trust_tier: "wiki_verified",
        source_host: "www.pikminwiki.com",
        source_license: "CC-BY-SA-4.0",
        domain: "strategy",
        game_title: "Pikmin 2",
      };
      setRpcHandler("get_background_game_ai_status", () => ({
        ...idleBackgroundStatusFixture(),
        status: "pending",
        question: "is there a day limit in pikmin 2",
        request_id: 14,
        kb_attached_notes: [note],
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.kbAttachedNotes).toEqual([note]);
      vi.useRealTimers();
    });

    it("reads an empty attached-notes list the same as a full one, not as 'nothing new'", async () => {
      /* Unlike liveReasoning, which keeps the last value when a poll is silent about it,
         kb_attached_notes is decided once per turn by retrieval and republished as-is on every
         poll -- an empty array here is the current fact, not a gap to paper over. */
      vi.useFakeTimers();
      setRpcHandler("get_background_game_ai_status", () => ({
        ...idleBackgroundStatusFixture(),
        status: "pending",
        question: "q",
        request_id: 15,
        kb_attached_notes: [],
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.kbAttachedNotes).toEqual([]);
      vi.useRealTimers();
    });

    it("keeps the lines already on screen when a later poll carries no thinking", async () => {
      vi.useFakeTimers();
      let polls = 0;
      setRpcHandler("get_background_game_ai_status", () => {
        polls += 1;
        return {
          ...idleBackgroundStatusFixture(),
          status: "pending",
          question: "q",
          request_id: 13,
          ...(polls < 2 ? { reasoning_partial: "First thought.", reasoning_seconds: 2 } : {}),
        };
      });

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.liveReasoning?.partial).toBe("First thought.");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(result.current.liveReasoning?.partial).toBe("First thought.");
      expect(result.current.liveReasoning?.seconds).toBe(2);
      vi.useRealTimers();
    });

    it("keeps the whole thinking with the finished answer and drops the live slice", async () => {
      vi.useFakeTimers();
      let polls = 0;
      setRpcHandler("get_background_game_ai_status", () => {
        polls += 1;
        if (polls < 2) {
          return {
            ...idleBackgroundStatusFixture(),
            status: "pending",
            question: "how do i kill the big armoured bug boss",
            request_id: 14,
            reasoning_partial: "The armour is on the",
            reasoning_seconds: 40,
          };
        }
        return {
          ...idleBackgroundStatusFixture(),
          status: "completed",
          question: "how do i kill the big armoured bug boss",
          request_id: 14,
          success: true,
          response: "Flank it and shoot the back.",
          reasoning_text: "The armour is on the front. So flank it.",
          reasoning_seconds: 41,
          reasoning_tokens: 380,
        };
      });

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.lastExchange?.reasoning).toEqual({
        text: "The armour is on the front. So flank it.",
        seconds: 41,
        tokens: 380,
      });
      expect(result.current.liveReasoning).toBeNull();
      vi.useRealTimers();
    });

    it("keeps no thinking on an answer from a model that did not think", async () => {
      vi.useFakeTimers();
      setRpcHandler("get_background_game_ai_status", () => ({
        ...idleBackgroundStatusFixture(),
        status: "completed",
        question: "where do i go",
        request_id: 15,
        success: true,
        response: "Head north past the bridge.",
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.ollamaResponse).toContain("Head north past the bridge.");
      expect(result.current.lastExchange?.reasoning).toBeUndefined();
      expect(result.current.liveReasoning).toBeNull();
      vi.useRealTimers();
    });
  });

  describe("cancel", () => {
    it("aborts the backend request and clears the spinner without a cancel literal", async () => {
      keepRequestPending(4, "long question");
      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("long question");
      });
      expect(result.current.isAsking).toBe(true);

      act(() => {
        result.current.onCancelAsk();
      });

      expect(getRpcCallLog().some((c) => c.method === "abort_background_game_ai")).toBe(true);
      expect(result.current.isAsking).toBe(false);
      // Nothing readable had streamed, so the body stays empty and the Stopped notice carries it.
      expect(result.current.ollamaResponse).toBe("");
      expect(result.current.askStopped).toBe(true);
    });

    /**
     * STREAM-04. Stop used to overwrite the body with "Request cancelled." and tear the poll down,
     * so the text the user was reading vanished on the press meant to keep it.
     */
    it("keeps the streamed partial when Stop lands mid-answer", async () => {
      vi.useFakeTimers();
      setRpcHandler("start_background_game_ai", () => ({ accepted: true, status: "pending", request_id: 6 }));
      let stopped = false;
      setRpcHandler("get_background_game_ai_status", () =>
        stopped
          ? {
              ...idleBackgroundStatusFixture(),
              status: "cancelled",
              question: "q",
              request_id: 6,
              cancelled: true,
              // What Plugin._cancelled_response_text kept.
              response: "Half an answer about the boss",
            }
          : {
              ...idleBackgroundStatusFixture(),
              status: "pending",
              question: "q",
              request_id: 6,
              streaming: true,
              partial_response: "Half an answer about the boss",
            }
      );
      setRpcHandler("abort_background_game_ai", () => {
        stopped = true;
        return { ok: true };
      });

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      let pending: Promise<void> | undefined;
      act(() => {
        pending = result.current.onAskOllama("q");
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      await act(async () => {
        await pending;
      });
      expect(result.current.ollamaResponse).toBe("Half an answer about the boss");

      act(() => {
        result.current.onCancelAsk();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(result.current.isAsking).toBe(false);
      expect(result.current.askStopped).toBe(true);
      expect(result.current.ollamaResponse).toBe("Half an answer about the boss");
      vi.useRealTimers();
    });

    it("stops applying poll results after cancelling", async () => {
      vi.useFakeTimers();
      setRpcHandler("start_background_game_ai", () => ({ accepted: true, status: "pending", request_id: 5 }));
      // Completes only *after* Stop, which is the case this guards: a terminal result already in
      // flight when the user pressed Stop must not land on the turn they ended.
      let stopped = false;
      setRpcHandler("get_background_game_ai_status", () =>
        stopped
          ? {
              ...idleBackgroundStatusFixture(),
              status: "completed",
              question: "q",
              request_id: 5,
              success: true,
              response: "answer that arrived too late",
            }
          : { ...idleBackgroundStatusFixture(), status: "pending", question: "q", request_id: 5 }
      );
      setRpcHandler("abort_background_game_ai", () => {
        stopped = true;
        return { ok: true };
      });

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      let pending: Promise<void> | undefined;
      act(() => {
        pending = result.current.onAskOllama("q");
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      await act(async () => {
        await pending;
      });

      act(() => {
        result.current.onCancelAsk();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // A completed result already in flight must not resurrect the answer the user stopped.
      expect(result.current.ollamaResponse).not.toContain("arrived too late");
      expect(result.current.askStopped).toBe(true);
      vi.useRealTimers();
    });
  });

  describe("session RAG preset chips", () => {
    const DREADNOUGHT = "How do I beat Glyphid Dreadnought?";

    function serveOneRagCandidate() {
      setRpcHandler("get_session_rag_chip_candidates", () => ({
        ok: true,
        candidates: [
          {
            text: DREADNOUGHT,
            category: "strategy",
            prefer_ask_mode: "strategy",
            domain: "strategy",
          },
        ],
      }));
    }

    /**
     * The mount reseed is one-shot, and both KB flags are at their UI defaults until
     * ``load_settings`` resolves. Spending the reseed on that pre-hydration render left
     * the carousel on static seeds for the whole session — no reopen could recover it,
     * because a reopen just re-ran the same race.
     *
     * ``devForceSessionRagChips`` is true from the first render on purpose: it pins the
     * roll at 1.0 without ever changing value, so the separate override effect never
     * fires and the mount reseed is the only thing that can produce this chip.
     */
    it("draws a RAG chip when the knowledge base arrives with the settings load", async () => {
      serveOneRagCandidate();

      const { result, rerender } = renderHook(
        (props: { settingsLoaded: boolean; useLocalKnowledgeBase: boolean }) =>
          useBonsaiAskOrchestration(makeArgs({ ...props, devForceSessionRagChips: true })),
        { initialProps: { settingsLoaded: false, useLocalKnowledgeBase: false } },
      );

      expect(
        getRpcCallLog().some((c) => c.method === "get_session_rag_chip_candidates"),
      ).toBe(false);

      await act(async () => {
        rerender({ settingsLoaded: true, useLocalKnowledgeBase: true });
      });

      expect(result.current.suggestedPrompts.map((p) => p.text)).toContain(DREADNOUGHT);
    });

    it("keeps static seeds when the knowledge base is off after settings load", async () => {
      serveOneRagCandidate();

      const { result } = renderHook(() =>
        useBonsaiAskOrchestration(
          makeArgs({
            settingsLoaded: true,
            useLocalKnowledgeBase: false,
            devForceSessionRagChips: true,
          }),
        ),
      );

      await act(async () => {});

      expect(result.current.suggestedPrompts.map((p) => p.text)).not.toContain(DREADNOUGHT);
      expect(
        getRpcCallLog().some((c) => c.method === "get_session_rag_chip_candidates"),
      ).toBe(false);
    });
  });

  describe("thread history", () => {
    it("moves the previous exchange into the thread when the next question is asked", async () => {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "completed",
        success: true,
        response: "First answer.",
        request_id: 8,
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("first question");
      });
      expect(result.current.askThreadCollapsed).toHaveLength(0);

      await act(async () => {
        await result.current.onAskOllama("second question");
      });

      expect(result.current.askThreadCollapsed).toHaveLength(1);
      expect(result.current.askThreadCollapsed[0]).toMatchObject({
        question: "first question",
        answer: expect.stringContaining("First answer."),
      });
      expect(result.current.askThreadDisplayQuestion).toBe("second question");
    });

    it("stamps the archived turn with the AppID it was asked against", async () => {
      /*
       * The display-time spoiler unwrap reads this back off the turn. Without it, a history turn
       * has no AppID and re-fences boss tactics the user named — STRAT-SPOIL-DRG-01.
       */
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "completed",
        success: true,
        response: "Focus the weak points.",
        request_id: 9,
        app_id: "2321470",
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("How do I beat Glyphid Dreadnought?");
      });
      await act(async () => {
        await result.current.onAskOllama("second question");
      });

      expect(result.current.askThreadCollapsed[0]).toMatchObject({
        question: "How do I beat Glyphid Dreadnought?",
        appId: "2321470",
      });
    });

    // Gap 1 (plan 54): a title reachable only by name (an emulator shortcut with no AppID) needs
    // its name carried the same way the AppID is, or the display-time unwrap can never reach it.
    it("stamps the archived turn with the game name it was asked against", async () => {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "completed",
        success: true,
        response: "Circle-strafe and pop the weak point.",
        request_id: 10,
        app_id: "",
        app_name: "Doom 64: Retribution",
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("How do I beat the boss?");
      });
      await act(async () => {
        await result.current.onAskOllama("second question");
      });

      expect(result.current.askThreadCollapsed[0]).toMatchObject({
        question: "How do I beat the boss?",
        appName: "Doom 64: Retribution",
      });
    });

    // Gap 2 (plan 54): the backend recognises far more ways of naming a boss than the screen's
    // own guess does ("wheatley fight" — a name-first question). The archived turn must carry
    // the backend's answer, not just what the screen itself could work out.
    it("stamps the archived turn with the named thing the backend worked out", async () => {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "pending",
        request_id: 11,
      }));
      setRpcHandler("get_background_game_ai_status", () => ({
        ...idleBackgroundStatusFixture(),
        status: "completed",
        question: "wheatley fight",
        request_id: 11,
        success: true,
        response: "Wheatley starts lying the moment you reach the surface.",
        strategy_spoiler_asked_entity: "Wheatley",
      }));

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

      await act(async () => {
        await result.current.onAskOllama("wheatley fight");
      });
      await act(async () => {
        await result.current.onAskOllama("second question");
      });

      expect(result.current.askThreadCollapsed[0]).toMatchObject({
        question: "wheatley fight",
        askedEntity: "Wheatley",
      });
    });

    /*
     * The saved-chat reload rebuilds this list from disk after every completed reply, so by the
     * time the next Ask flushes its pending archive the turn is usually already there. Appending
     * unconditionally showed the previous turn twice for the whole generation — measured on device
     * 2026-08-27, one row under the slot id and one under a minted `turn-<ts>-<i>` id.
     */
    describe("when the saved-chat reload already put the previous turn in the list", () => {
      it("replaces that row instead of appending a second copy of it", async () => {
        setRpcHandler("start_background_game_ai", () => ({
          accepted: true,
          status: "completed",
          success: true,
          response: "First answer.",
          request_id: 21,
          app_id: "2321470",
        }));

        const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

        await act(async () => {
          await result.current.onAskOllama("first question");
        });

        // Stand in for reloadActiveSlotTranscript: the slot's own turn id, and the metadata the
        // disk round-trip drops.
        await act(async () => {
          result.current.setAskThreadCollapsed([
            {
              id: "slot-turn-1",
              question: "first question",
              answer: "First answer.",
              transparency: null,
              appId: "",
              spoilerConsentEffective: false,
            },
          ]);
        });

        await act(async () => {
          await result.current.onAskOllama("second question");
        });

        expect(result.current.askThreadCollapsed).toHaveLength(1);
        expect(result.current.askThreadCollapsed[0]).toMatchObject({
          // The slot's id survives, because the next reload would restore it anyway.
          id: "slot-turn-1",
          question: "first question",
          // ...but the AppID the disk copy lost comes back, which the spoiler unwrap reads.
          appId: "2321470",
        });
      });

      it("still appends when the pending turn is a different exchange", async () => {
        setRpcHandler("start_background_game_ai", () => ({
          accepted: true,
          status: "completed",
          success: true,
          response: "Second answer.",
          request_id: 22,
        }));

        const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

        await act(async () => {
          await result.current.onAskOllama("second question");
        });

        await act(async () => {
          result.current.setAskThreadCollapsed([
            {
              id: "slot-turn-1",
              question: "first question",
              answer: "First answer.",
              transparency: null,
              appId: "",
              spoilerConsentEffective: false,
            },
          ]);
        });

        await act(async () => {
          await result.current.onAskOllama("third question");
        });

        expect(result.current.askThreadCollapsed).toHaveLength(2);
        expect(result.current.askThreadCollapsed.map((t) => t.question)).toEqual([
          "first question",
          "second question",
        ]);
      });
    });
  });

  describe("strategy checklist storage", () => {
    const CHECKLIST = {
      title: "Dealing with Exploders",
      items: [
        { id: "1", label: "Maintain distance from immediate explosions" },
        { id: "2", label: "Use kiting movement to avoid direct contact" },
        { id: "3", label: "Position yourself so the blast hits the swarm behind you" },
      ],
    };

    /*
     * STRAT-CHECKLIST-01. The mode is read at *mount*, not at reply time, so the sequence matters:
     * the panel mounts on the default `"speed"` and only becomes `"strategy"` once settings hydrate
     * a render later. `applyBackgroundStatusToUi` is a `useCallback` that does not depend on the
     * mode, so reading `a.askMode` inside it saw the mount-time value forever — the guard was false
     * on every completed Ask and the checklist could never be stored, whatever the user selected.
     *
     * Starting this test at "strategy" would pass on the broken code, which is why the rerender is
     * the whole point of it. Measured on device 2026-08-27: panel showing Strategy, backend logging
     * `checklist_parsed=True`, and the guard reading `askMode: "speed"`.
     */
    /*
     * The polled path specifically, which is the one the device takes: the model needs 6-32s on this
     * hardware, so `start_background_game_ai` answers `pending` and the checklist arrives on a later
     * status read. The complete-on-start path cannot carry a checklist at all — it hand-builds its
     * terminal status and omits the field — which is a separate defect, filed, not under test here.
     */
    function pollsToCompletionWithChecklist(requestId: number) {
      setRpcHandler("start_background_game_ai", () => ({
        accepted: true,
        status: "pending",
        request_id: requestId,
      }));
      let polls = 0;
      setRpcHandler("get_background_game_ai_status", () => {
        polls += 1;
        const base = {
          ...idleBackgroundStatusFixture(),
          question: "how do i deal with the exploders",
          request_id: requestId,
        };
        if (polls < 2) return { ...base, status: "pending" };
        return {
          ...base,
          status: "completed",
          success: true,
          response: "Keep your distance and let them come to you.",
          strategy_checklist: CHECKLIST,
        };
      });
    }

    async function runAsk(result: { current: { onAskOllama: (q: string) => Promise<void> } }) {
      let pending: Promise<void> | undefined;
      act(() => {
        pending = result.current.onAskOllama("how do i deal with the exploders");
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      await act(async () => {
        await pending;
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
    }

    it("stores a checklist when strategy was selected after mount", async () => {
      vi.useFakeTimers();
      pollsToCompletionWithChecklist(41);

      const { result, rerender } = renderHook(
        ({ askMode }: { askMode: "speed" | "strategy" }) =>
          useBonsaiAskOrchestration(makeArgs({ askMode })),
        { initialProps: { askMode: "speed" as "speed" | "strategy" } },
      );

      rerender({ askMode: "strategy" });
      await runAsk(result);

      expect(result.current.strategyChecklist).not.toBeNull();
      expect(result.current.strategyChecklist?.title).toBe("Dealing with Exploders");
      expect(result.current.strategyChecklist?.items).toHaveLength(3);
      vi.useRealTimers();
    });

    /* The guard still has to bite: a Speed-mode reply must not leave a checklist behind. */
    it("ignores a checklist on a reply that was not asked in strategy", async () => {
      vi.useFakeTimers();
      pollsToCompletionWithChecklist(42);

      const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs({ askMode: "speed" })));
      await runAsk(result);

      expect(result.current.strategyChecklist).toBeNull();
      vi.useRealTimers();
    });
  });
});

/*
 * CHIP-ROTATION-01: with a game already running when the panel mounts, the Ask-bar footnote
 * read "Context: no active game detected" for a full 96-second sample even though the preset
 * carousel already showed that game's own chips — the footnote used to start blank/stale and
 * wait for an Ask's status poll to correct it. `resolveInitialOllamaContext` is what the
 * `ollamaContext` state now initializes from, so these are a direct spec for the mount-time fix.
 */
describe("resolveInitialOllamaContext", () => {
  it("reports the running game immediately, not a stale survived snapshot", () => {
    expect(resolveInitialOllamaContext("220", { app_id: "", app_context: "none" })).toEqual({
      app_id: "220",
      app_context: "active",
    });
  });

  it("falls back to a survived context when nothing is running", () => {
    const survived: ReturnType<typeof resolveInitialOllamaContext> = {
      app_id: "570",
      app_context: "active",
    };
    expect(resolveInitialOllamaContext("", survived)).toBe(survived);
  });

  it("degrades quietly to null when nothing is running and nothing survived", () => {
    expect(resolveInitialOllamaContext("", undefined)).toBeNull();
    expect(resolveInitialOllamaContext("   ", null)).toBeNull();
  });
});

describe("ollamaContext on mount (CHIP-ROTATION-01)", () => {
  const originalMainRunningApp = Router.MainRunningApp;

  afterEach(() => {
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      originalMainRunningApp;
  });

  it("shows the running game right away, before any Ask status poll resolves", () => {
    resetFakeDeckyRpc();
    // Never resolves — if the footnote depended on this poll, it would stay wrong forever.
    setRpcHandler("get_background_game_ai_status", () => new Promise(() => {}));
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = {
      appid: 220,
      display_name: "Half-Life 2",
    } as unknown as typeof Router.MainRunningApp;

    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

    expect(result.current.ollamaContext).toEqual({
      app_id: "220",
      app_context: "active",
      app_name: "Half-Life 2",
    });
  });

  it("degrades quietly to no active game when nothing is running", () => {
    resetFakeDeckyRpc();
    setRpcHandler("get_background_game_ai_status", () => new Promise(() => {}));
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = undefined as unknown as typeof Router.MainRunningApp;

    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

    // No crash and no false "active game" claim — whether that reads as the plain "no active
    // game detected" footnote or as no footnote row at all is an existing, separate choice
    // (both already render fine); this bug is specifically about a running game being missed.
    expect(result.current.ollamaContext?.app_context).not.toBe("active");
  });
});

/*
 * The Ask-bar footnote kept naming a game after it was closed. Traced to the panel's session
 * survival: a snapshot captured while a game was running (e.g. right before the QAM closes)
 * still names that game, and re-showing the panel used to restore it verbatim even after the
 * game had since been exited. `trackedRunningAppId`'s own 1.5s poll of the running app already
 * corrects the footnote on its own once no Ask is in flight (covered below); the fix here makes
 * a session restore reconcile against the live running game the same way, instead of trusting
 * a survived snapshot that may already be stale.
 */
describe("the game context stays right after a game closes", () => {
  const originalMainRunningApp = Router.MainRunningApp;

  afterEach(() => {
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      originalMainRunningApp;
    vi.useRealTimers();
  });

  it("closing a game clears the line without anyone asking anything", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("get_background_game_ai_status", () => new Promise(() => {}));
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = {
      appid: 220,
      display_name: "Half-Life 2",
    } as unknown as typeof Router.MainRunningApp;

    vi.useFakeTimers();
    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    expect(result.current.ollamaContext).toEqual({
      app_id: "220",
      app_context: "active",
      app_name: "Half-Life 2",
    });

    // The game is exited — Steam stops reporting a running app.
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      undefined as unknown as typeof Router.MainRunningApp;

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.ollamaContext?.app_context).not.toBe("active");
  });

  it("launching a game sets the line", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("get_background_game_ai_status", () => new Promise(() => {}));
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      undefined as unknown as typeof Router.MainRunningApp;

    vi.useFakeTimers();
    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    expect(result.current.ollamaContext?.app_context).not.toBe("active");

    // A game is launched while the panel is already open.
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = {
      appid: 620,
      display_name: "Portal 2",
    } as unknown as typeof Router.MainRunningApp;

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.ollamaContext).toEqual({
      app_id: "620",
      app_context: "active",
      app_name: "Portal 2",
    });
  });

  it("does not resurrect a closed game when the panel is reopened (session restore)", () => {
    resetFakeDeckyRpc();
    setRpcHandler("get_background_game_ai_status", () => new Promise(() => {}));
    // Nothing is running any more by the time the panel comes back.
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      undefined as unknown as typeof Router.MainRunningApp;

    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

    act(() => {
      // The survived snapshot still names the game that was running before the panel closed.
      result.current.restoreSessionSnapshot(
        minimalSurvivalSnapshot({ ollamaContext: { app_id: "220", app_context: "active" } }),
      );
    });

    expect(result.current.ollamaContext?.app_context).not.toBe("active");
  });

  it("shows the game that is actually still running, not a stale restored one", () => {
    resetFakeDeckyRpc();
    setRpcHandler("get_background_game_ai_status", () => new Promise(() => {}));
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = {
      appid: 220,
      display_name: "Half-Life 2",
    } as unknown as typeof Router.MainRunningApp;

    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    expect(result.current.ollamaContext).toEqual({
      app_id: "220",
      app_context: "active",
      app_name: "Half-Life 2",
    });

    act(() => {
      // A stale snapshot naming a different (no longer running) game.
      result.current.restoreSessionSnapshot(
        minimalSurvivalSnapshot({ ollamaContext: { app_id: "999", app_context: "active" } }),
      );
    });

    expect(result.current.ollamaContext).toEqual({
      app_id: "220",
      app_context: "active",
      app_name: "Half-Life 2",
    });
  });

  it("a question that names its own game is unaffected either way", () => {
    resetFakeDeckyRpc();
    setRpcHandler("get_background_game_ai_status", () => new Promise(() => {}));
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = {
      appid: 220,
      display_name: "Half-Life 2",
    } as unknown as typeof Router.MainRunningApp;

    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

    act(() => {
      // A snapshot captured while asking about the game that is still running.
      result.current.restoreSessionSnapshot(
        minimalSurvivalSnapshot({
          ollamaContext: { app_id: "220", app_context: "active" },
          lastExchange: { question: "how do I beat Ravenholm", answer: "..." },
        }),
      );
    });

    expect(result.current.ollamaContext).toEqual({
      app_id: "220",
      app_context: "active",
      app_name: "Half-Life 2",
    });
    expect(result.current.lastExchange?.question).toBe("how do I beat Ravenholm");
  });
});

/*
 * The footnote used to name a game by its raw AppID ("Context: active game AppID 1145360")
 * even once the game context carried a name, and it only ever picked up a game change through
 * `trackedRunningAppId` -- the Strategy checklist's own poll, a different feature. Measured on
 * the Deck: the line stayed wrong for minutes, in both directions, while the panel stayed open
 * the whole time. This describes the footnote's own poll, GAME_CONTEXT_POLL_MS, which does not
 * borrow another feature's timer and carries the game's name along with its id.
 */
describe("the footnote's own poll (GAME-CONTEXT-POLL-01)", () => {
  const originalMainRunningApp = Router.MainRunningApp;

  afterEach(() => {
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      originalMainRunningApp;
    vi.useRealTimers();
  });

  it("carries the running game's name, not just its AppID, once it catches up", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("get_background_game_ai_status", () => new Promise(() => {}));
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      undefined as unknown as typeof Router.MainRunningApp;

    vi.useFakeTimers();
    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));

    // Hades launches while the panel is already open and mounted.
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = {
      appid: 1145360,
      display_name: "Hades",
    } as unknown as typeof Router.MainRunningApp;

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.ollamaContext).toEqual({
      app_id: "1145360",
      app_context: "active",
      app_name: "Hades",
    });
  });

  it("stops polling once the hook unmounts", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("get_background_game_ai_status", () => new Promise(() => {}));
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = {
      appid: 220,
      display_name: "Half-Life 2",
    } as unknown as typeof Router.MainRunningApp;

    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { result, unmount } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    expect(result.current.ollamaContext?.app_id).toBe("220");

    unmount();

    // The game exits after the panel is gone. Nothing is left mounted to update, and the
    // interval this test is guarding against must not still be ticking (or throwing).
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      undefined as unknown as typeof Router.MainRunningApp;
    expect(() => {
      vi.advanceTimersByTime(10000);
    }).not.toThrow();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});

/*
 * CHAT-SLOTS-V3-05a: a Strategy branch block asked in one chat slot showed up while a different
 * slot was on screen, and stayed there after the owning slot's answer had already finished — not
 * a mid-stream race, a plain missing slot check on this one piece of state.
 */
describe("strategyGuideBranches stays with the slot that asked (CHAT-SLOTS-V3-05a)", () => {
  /*
   * Gated by an explicit flag rather than a call counter: the mount-restore effect also fires
   * its own one-shot `get_background_game_ai_status` read (see the "mount restore" section of
   * the hook), so a plain "the Nth call completes" counter can reach "completed" earlier than
   * the test expects, from a caller that has nothing to do with the submitted Ask. Flipping the
   * flag by hand, after moving `activeSlotIdRef`, is what pins the ordering the bug depends on:
   * the branch options must land while the user is already looking at slot B.
   */
  function makeSlotABranchStatusHandler(requestId: number) {
    let readyToComplete = false;
    setRpcHandler("get_background_game_ai_status", () => {
      const base = {
        ...idleBackgroundStatusFixture(),
        question: "where am i in ravenholm",
        request_id: requestId,
        chat_slot_id: "slot-a",
      };
      if (!readyToComplete) return { ...base, status: "pending" };
      return {
        ...base,
        status: "completed",
        success: true,
        response: "You're past the church.",
        strategy_guide_branches: {
          question: "Where are you at in Ravenholm?",
          options: [
            { id: "a", label: "Just starting in the town area" },
            { id: "b", label: "Dealing with a tough encounter or trap" },
          ],
        },
      };
    });
    return () => {
      readyToComplete = true;
    };
  }

  it("does not show slot A's branch block while slot B is on screen", async () => {
    vi.useFakeTimers();
    const activeSlotIdRef = { current: "slot-a" as string | null };
    setRpcHandler("start_background_game_ai", () => ({
      accepted: true,
      status: "pending",
      request_id: 501,
    }));
    const completeSlotAAsk = makeSlotABranchStatusHandler(501);

    const { result, rerender } = renderHook(() =>
      useBonsaiAskOrchestration(makeArgs({ askMode: "strategy", activeSlotIdRef })),
    );

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.onAskOllama("where am i in ravenholm");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    await act(async () => {
      await pending;
    });

    // The user leaves slot A for slot B before A's poll delivers the branch options.
    activeSlotIdRef.current = "slot-b";
    completeSlotAAsk();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.strategyGuideBranches).toBeNull();

    // Switching back to slot A brings its own branch block back — it was never lost, just
    // not slot B's to show.
    activeSlotIdRef.current = "slot-a";
    rerender();

    expect(result.current.strategyGuideBranches?.question).toBe("Where are you at in Ravenholm?");

    vi.useRealTimers();
  });

  it("still shows the branch block when it belongs to the slot on screen", async () => {
    vi.useFakeTimers();
    const activeSlotIdRef = { current: "slot-a" as string | null };
    setRpcHandler("start_background_game_ai", () => ({
      accepted: true,
      status: "pending",
      request_id: 502,
    }));
    const completeSlotAAsk = makeSlotABranchStatusHandler(502);

    const { result } = renderHook(() =>
      useBonsaiAskOrchestration(makeArgs({ askMode: "strategy", activeSlotIdRef })),
    );

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.onAskOllama("where am i in ravenholm");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    await act(async () => {
      await pending;
    });
    completeSlotAAsk();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.strategyGuideBranches?.question).toBe("Where are you at in Ravenholm?");

    vi.useRealTimers();
  });
});
