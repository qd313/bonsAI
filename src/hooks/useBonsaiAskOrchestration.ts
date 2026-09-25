/**
 * Title: The Ask flow
 *
 * Purpose: Runs the whole life of one question, from the moment Ask is
 * pressed to the moment an answer — or a refusal — is on screen. It also
 * owns everything else about the chat around that question: the history of
 * older turns, Strategy Guide's branch picker and checklist, the
 * reply-feedback chips, and picking a half-finished question back up after
 * the plugin panel was closed and reopened while it was still running.
 *
 *     onAskOllama(question)
 *          │
 *          ▼
 *     start_background_game_ai  ───────►  usually: "pending" — the answer
 *          │                               is now being worked on
 *          │                                    │
 *          │                                    ▼
 *          │                          startBackgroundStatusPolling() asks
 *          │                          get_background_game_ai_status roughly
 *          │                          once a second
 *          │                                    │
 *          │                                    ▼
 *          │                          applyBackgroundStatusToUi() turns each
 *          │                          reply into what the screen shows: the
 *          │                          thinking line, the text streaming in
 *          │                          so far, or, once the status turns
 *          │                          "completed", "failed" or "cancelled",
 *          │                          the finished answer
 *          │
 *          └── sometimes instead: "completed" right away (a local command
 *               bonsAI answers itself, never touching the AI), "busy"
 *               (another question is already running), or "invalid" /
 *               "blocked" (refused before it ever reached the AI)
 *
 * Used for: index.tsx builds one of these per mount and hands its whole
 * returned bundle of state and callbacks down through MainTab into the
 * transcript and the Ask bar.
 *
 * Solves: One place that owns everything about asking a question, so the
 * screen files that actually draw the chat only ever show state — they never
 * decide it themselves.
 *
 * Does not: Run the AI, or decide what a question is allowed to say — that
 * happens on the PC or Deck side, in main.py and the services beside it.
 * Does not draw any of the chat itself — see MainTabChatTranscript.
 *
 * How it works:
 * 1. onAskOllama() is the whole submit path: it validates the question, asks
 *    the backend to start work with start_background_game_ai(), and reads
 *    what came back — an immediate answer, a refusal, "busy", or the normal
 *    case, where it hands off to polling.
 * 2. useBackgroundGameAi() is the actual polling engine underneath this
 *    hook; startBackgroundStatusPolling() and startNextRequest() are how
 *    this file drives it, and applyBackgroundStatusToUi() is the one
 *    function every poll result passes through on its way to becoming what
 *    the screen shows.
 * 3. onCancelAsk() stops a question without throwing away whatever text has
 *    already streamed in — it waits, with a bounded grace period, for the
 *    backend's own confirmation of what was kept.
 * 4. A mount-time effect resumes a question that was still running when the
 *    plugin last closed, by asking get_background_game_ai_status once and
 *    resuming polling if it is still pending.
 * 5. Everything else here — the archived-turn history, the strategy branch
 *    and checklist state, the reply-feedback chips (lifted into
 *    useReplyFeedbackChips), and session restore — is state this hook keeps
 *    so the screen files can stay simple.
 *
 * This file's own argument type lives beside its return type, in
 * ../types/askOrchestrationArgs.ts and ../types/askOrchestration.ts. The Ask-bar footnote's
 * own running-game poll is useOllamaGameContextSync, and the Show-details refresh is
 * useInputTransparencyRefresh. The mount-time restore effect itself (point 4 below) is
 * useAskMountRestore, and the Strategy Guide branch-pick and checklist-toggle callbacks are
 * useStrategyBranchActions.
 *
 * Gotchas:
 * - The mount-time restore effect runs exactly once (an empty dependency
 *   list) on purpose. The callbacks it needs change identity on every
 *   render, and depending on them directly re-ran the whole restore on every
 *   render — a status check to the back end, re-apply, a state change,
 *   another render — a loop this file's own comments say was measured
 *   directly.
 * - Reordering the hooks in this file risks a poll callback that is stale by
 *   the time it fires, if that reordering changes which render's closures a
 *   callback captures.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toaster } from "@decky/api";
import { Router } from "@decky/ui";

import type { AskAttachment } from "../types/bonsaiUi";
import type { BonsaiAskOrchestration } from "../types/askOrchestration";
import type { UseBonsaiAskOrchestrationArgs } from "../types/askOrchestrationArgs";
import { type AskModeId } from "../data/bonsaiSettingsSchema";
import { buildResponseText } from "../utils/appliedTuningText";
import { detectPromptCategory } from "../data/presets";
import { STRATEGY_FOLLOWUP_PREFIX } from "../data/strategyGuideFollowup";
import { normalizeStrategyGuideBranches } from "../utils/strategyGuideBranches";
import {
  mergeStrategyChecklistState,
  normalizeStrategyChecklist,
  strategyChecklistToAskPayload,
} from "../utils/strategyChecklist";
import {
  clearStrategyChecklistSession,
  scheduleStrategyChecklistSessionSave,
} from "../utils/strategyChecklistPersistence";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { stripSoftContinueCue } from "../utils/stripSoftContinueCue";
import { uiActiveElement } from "../utils/uiDocument";
import { useBackgroundGameAi } from "./useBackgroundGameAi";
import type {
  AppendDesktopChatEventPayload,
  AppendDesktopNoteResult,
  AskAttachmentSnapshot,
  BackgroundRequestStatus,
  BackgroundStartResponse,
  LastExchangeSnapshot,
  LiveReasoningSnapshot,
  PendingArchiveTurn,
  PresetCarouselInjectPayload,
  ReplyFollowUpPending,
} from "../types/backgroundAsk";
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import type {
  OllamaContextUi,
  StrategyGuideBranchesPayload,
  AskThreadCollapsedTurn,
  AskThreadExpandedTurnKey,
} from "../types/bonsaiUi";
import { hasResponseAutosaved, markResponseAutosaved } from "../utils/desktopChatAutosave";
import { questionBypassesOllamaPcIpRequirement } from "../utils/localOnlyAskCommands";
import { normalizePresetCarouselInject } from "../utils/presetCarouselInject";
import type { KbAttachedNote, TransparencySnapshot } from "../utils/inputTransparency";
import { keepIfUnchanged } from "../utils/keepIfUnchanged";
import { THINKING_BLURB_PLACEHOLDER, sanitizeThinkingSummary } from "../utils/thinkingSummaryText";
import { reasoningFromFinishedStatus } from "../utils/reasoningDisplay";
import { isPendingPlaceholderResponse, isStopNoticeResponse } from "../utils/askThinkingPhases";
import { useSmoothStreamReveal } from "./useSmoothStreamReveal";
import {
  peekBonsaiSessionPendingRestore,
  type BonsaiSessionSurvivalSnapshot,
} from "../utils/bonsaiSessionSurvival";
import {
  initialExpandedTurnKeyFromSurvival,
  resolveInitialOllamaContext,
} from "../utils/askOrchestrationRestore";
import { type ReplyMicroActionId } from "../data/replyMicroActions";
import { startAskCompletionWatch, stopAskCompletionWatch } from "../utils/bonsaiAskCompletionWatch";
import { useStrategyChecklistSession } from "./useStrategyChecklistSession";
import { useSuggestedPromptChips } from "./useSuggestedPromptChips";
import { useReplyFeedbackChips } from "./useReplyFeedbackChips";
import { useOllamaGameContextSync } from "./useOllamaGameContextSync";
import { useInputTransparencyRefresh } from "./useInputTransparencyRefresh";
import { useAskMountRestore } from "./useAskMountRestore";
import { useStrategyBranchActions } from "./useStrategyBranchActions";

export type { AskThreadExpandedTurnKey } from "../types/bonsaiUi";

/**
 * How long Stop keeps polling for the `cancelled` status that carries the kept draft, before
 * giving up and tearing the poll down. Generous next to the 150ms/1200ms cadences — this is the
 * "abort never landed" path, not the normal one.
 */
const STOP_STATUS_GRACE_MS = 4000;

// Both moved to ../utils/askOrchestrationRestore.ts — pure functions, testable with no React.
// Re-exported so the existing import in this hook's own test file keeps working unchanged.
export { resolveInitialOllamaContext } from "../utils/askOrchestrationRestore";

// UseBonsaiAskOrchestrationArgs now lives in ../types/askOrchestrationArgs, beside the
// return-type it pairs with. Re-exported so the existing import in this hook's own test
// file keeps working unchanged.
export type { UseBonsaiAskOrchestrationArgs } from "../types/askOrchestrationArgs";

/*
 * In: UseBonsaiAskOrchestrationArgs — the current settings this needs to ask
 * correctly (which AI mode, spoiler masking, the Ollama PC address, whether
 * a local knowledge base is on), the question box's own state and setter,
 * and a long list of smaller callbacks for saving settings, persisting the
 * search text, and reporting failures.
 * Out: BonsaiAskOrchestration — every piece of Ask-related state the screen
 * needs to draw (the current answer, the turn history, whether a question is
 * running, the strategy panels) and every callback that changes it
 * (onAskOllama, onCancelAsk, clearUnifiedInput, and the rest returned at the
 * bottom of this function).
 * What can go wrong: a question that never gets a reply at all (backend
 * unreachable, or the plugin panel closed before start_background_game_ai
 * answered) is caught by the try/catch inside the submit path and shown as
 * plain error text rather than left spinning forever. A poll that keeps
 * returning "pending" past the plugin's own patience shows the slow-answer
 * warning rather than doing anything to the request itself.
 *
 * 1. Pull apart the args and set up every piece of local Ask state — the
 *    current answer text, the turn history, which turn is expanded, the
 *    strategy panels, and a handful of refs used to survive a re-render or a
 *    remount without losing track of an in-flight question.
 * 2. Build applyBackgroundStatusToUi, the function every poll result passes
 *    through: it reads a status object's `status` field and writes the
 *    matching React state for pending, cancelled, completed or failed.
 * 3. Wire up useBackgroundGameAi, the polling engine, feeding it
 *    applyBackgroundStatusToUi as the callback it drives.
 * 4. On mount, try once to resume a question that was already running
 *    before this component existed, and start polling again if it still is.
 * 5. Build clearUnifiedInput and onCancelAsk, the two ways a question in
 *    flight can be stopped from the screen.
 * 6. Build onAskOllama, the submit path: validate, archive the previous
 *    turn if one is waiting to be, call start_background_game_ai, and branch
 *    on what came back.
 * 7. Build the smaller pieces — strategy branch and checklist handling,
 *    session restore, and the reset used when a chat slot is cleared.
 * 8. Return the whole bundle described in Out above.
 */
export function useBonsaiAskOrchestration(
  a: UseBonsaiAskOrchestrationArgs,
): BonsaiAskOrchestration {
  const survivalPeek = peekBonsaiSessionPendingRestore();

  // --- Strategy checklist session (per-game disk sync) ---
  const {
    strategyChecklist,
    setStrategyChecklist,
    strategyChecklistRef,
    hydrateStrategyChecklistFromDisk,
    trackedRunningAppId,
  } = useStrategyChecklistSession(a.askMode);

  // --- Presentation state (survival restore on mount) ---
  const [ollamaResponse, setOllamaResponse] = useState(() => survivalPeek?.ollamaResponse ?? "");
  const [ollamaContext, setOllamaContext] = useState<OllamaContextUi>(() =>
    resolveInitialOllamaContext(
      trackedRunningAppId || (Router.MainRunningApp?.appid?.toString() ?? ""),
      survivalPeek?.ollamaContext,
    ),
  );
  const [lastExchange, setLastExchange] = useState<LastExchangeSnapshot | null>(
    () => survivalPeek?.lastExchange ?? null
  );
  const [strategyGuideBranches, setStrategyGuideBranches] = useState<StrategyGuideBranchesPayload | null>(
    () => survivalPeek?.strategyGuideBranches ?? null
  );
  /*
   * Which chat slot's Ask produced the current `strategyGuideBranches` payload. A background
   * poll answers a specific slot's question no matter which slot is on screen when it lands, so
   * the branch block belongs to whichever slot asked it — not to whichever slot happens to be
   * active when the payload is exposed below. Nothing needs to touch this on every one of the
   * clear-to-null sites: a null payload has no owner worth checking.
   */
  const strategyGuideBranchesOwnerSlotIdRef = useRef<string | null>(
    survivalPeek?.strategyGuideBranches ? survivalPeek?.activeSlotId ?? null : null,
  );

  const [modelPolicyDisclosure, setModelPolicyDisclosure] = useState<ModelPolicyDisclosurePayload | null>(
    () => survivalPeek?.modelPolicyDisclosure ?? null
  );
  const [presetCarouselInject, setPresetCarouselInject] = useState<PresetCarouselInjectPayload | null>(
    () => survivalPeek?.presetCarouselInject ?? null
  );
  const [shortcutSetupVariant, setShortcutSetupVariant] = useState<NonNullable<
    BackgroundRequestStatus["shortcut_setup"]
  > | null>(() => survivalPeek?.shortcutSetupVariant ?? null);
  const lastStrategyAskQuestionRef = useRef<string>("");
  const pendingReplyFollowUpRef = useRef<ReplyFollowUpPending | null>(null);
  const lastAskContextRef = useRef<{
    attachments: AskAttachmentSnapshot[];
    askMode: AskModeId;
    rawQuestion: string;
  }>({ attachments: [], askMode: "speed", rawQuestion: "" });

  // --- Ask thread archive refs ---
  // The shape moved to PendingArchiveTurn in ../types/backgroundAsk.ts, so it can be shared
  // with useStrategyBranchActions below without a second, drifting copy of it.
  const pendingArchiveTurnRef = useRef<PendingArchiveTurn | null>(null);
  const pendingThreadQuestionDisplayRef = useRef<string | null>(null);
  /** Last request_id whose completion already re-seeded suggested prompts (reseed is randomized). */
  const promptsReseededForRequestRef = useRef<number | null>(null);
  /*
   * Models already warned about for unsupported thinking. Keyed by model tag so a user with
   * one thinking and one non-thinking model hears about each once, and deduped because the
   * same terminal status can be applied more than once (restore + poll) — see the reseed
   * guard below for the same hazard.
   */
  const thinkingUnsupportedWarnedRef = useRef<Set<string>>(new Set());
  const lastFlushedExchangeQuestionRef = useRef<string>("");
  const [askThreadCollapsed, setAskThreadCollapsed] = useState<AskThreadCollapsedTurn[]>(
    () => survivalPeek?.askThreadCollapsed ?? []
  );
  const askThreadCollapsedRef = useRef(askThreadCollapsed);
  useEffect(() => {
    askThreadCollapsedRef.current = askThreadCollapsed;
  }, [askThreadCollapsed]);
  const [expandedTurnKey, setExpandedTurnKey] = useState<AskThreadExpandedTurnKey>(
    () => initialExpandedTurnKeyFromSurvival()
  );
  const [askThreadDisplayQuestion, setAskThreadDisplayQuestion] = useState(
    () => survivalPeek?.askThreadDisplayQuestion ?? ""
  );
  const [isAsking, setIsAsking] = useState(false);
  /** Stop was pressed: show a small notice beside the kept answer instead of replacing it. */
  const [askStopped, setAskStopped] = useState(false);
  /*
   * A pending poll belongs to a slot the user is no longer looking at. The ask bar still has to
   * know the backend is busy (`isAsking` stays true), but the transcript must not draw a live
   * turn for it — otherwise the slot the user IS looking at grows an empty live header and the
   * empty-slot preview can never render.
   */
  const [isForeignPendingAsk, setIsForeignPendingAsk] = useState(false);
  /** Set on Stop until the `cancelled` status lands, so a late terminal result cannot overwrite it. */
  const stopRequestedRef = useRef(false);

  // Read inside onCancelAsk without making the callback churn on every keystroke.
  const ollamaResponseRef = useRef(ollamaResponse);
  ollamaResponseRef.current = ollamaResponse;
  const askThreadDisplayQuestionRef = useRef(askThreadDisplayQuestion);
  askThreadDisplayQuestionRef.current = askThreadDisplayQuestion;

  // --- Running game context (Ollama app_id chip) ---
  // Lifted into useOllamaGameContextSync. It must stay at exactly this point in the list:
  // React matches hooks by the order they run, not by name.
  const syncOllamaContextFromRunningApp = useOllamaGameContextSync({
    trackedRunningAppId,
    isAsking,
    setOllamaContext,
  });

  // --- Preset carousel + session RAG chips ---
  // Lifted into useSuggestedPromptChips. It must stay at exactly this point in the list:
  // React matches hooks by the order they run, not by name.
  const {
    lastApplied,
    setLastApplied,
    suggestedPrompts,
    setSuggestedPrompts,
    reseedSuggestedPrompts,
  } = useSuggestedPromptChips({
    survivalPeek,
    trackedRunningAppId,
    useLocalKnowledgeBase: a.useLocalKnowledgeBase,
    settingsLoaded: a.settingsLoaded,
    devForceSessionRagChips: a.devForceSessionRagChips,
  });

  // --- Stream reveal + slow-warning timers ---
  const [showSlowWarning, setShowSlowWarning] = useState(() => survivalPeek?.showSlowWarning ?? false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(
    () => survivalPeek?.elapsedSeconds ?? null
  );
  const [lastTransparency, setLastTransparency] = useState<TransparencySnapshot | null>(
    () => survivalPeek?.lastTransparency ?? null
  );
  const [thinkingSummary, setThinkingSummary] = useState<string | null>(
    () => survivalPeek?.thinkingSummary ?? null
  );
  const [lastRequestId, setLastRequestId] = useState<number | null>(
    () => survivalPeek?.lastRequestId ?? null
  );
  /*
   * The thinking of the question running right now.
   *
   * Restored from the note the panel leaves behind when it closes, so a panel closed mid-think and
   * reopened still shows the lines rather than dropping back to the stock waiting phrase. It is
   * written on EVERY poll, not only when the answer finishes: a per-turn fact that only reaches the
   * screen at the end shows up on screen as a flicker at the end — plan 54 needed a whole extra
   * commit for exactly that on the live answer bubble.
   */
  const [liveReasoning, setLiveReasoning] = useState<LiveReasoningSnapshot | null>(
    () => survivalPeek?.liveReasoning ?? null
  );
  /**
   * Plan 58 phase 1: the "From the notes" block's own material for the live turn, read off
   * every "pending" poll the same reason `liveReasoning` above is -- a per-turn fact that only
   * reaches the screen once the reply finishes shows up as a flicker at the end (plan 54's own
   * lesson). Not carried in the session-survival snapshot: a panel closed mid-stream and
   * reopened falls back to the stock waiting phrase the same as `thinkingSummary` does, not to a
   * stale note list.
   */
  const [kbAttachedNotes, setKbAttachedNotes] = useState<KbAttachedNote[] | null>(null);
  const [isStreamingPreview, setIsStreamingPreview] = useState(false);
  const [isStreamSettling, setIsStreamSettling] = useState(false);

  const streamRevealActive = isStreamingPreview || isStreamSettling;
  const streamPreviewActiveRef = useRef(false);
  useEffect(() => {
    streamPreviewActiveRef.current = streamRevealActive;
  }, [streamRevealActive]);

  useEffect(() => {
    if (!isStreamSettling) return;
    const id = requestAnimationFrame(() => {
      setIsStreamSettling(false);
      setIsStreamingPreview(false);
      setThinkingSummary(null);
    });
    return () => cancelAnimationFrame(id);
  }, [isStreamSettling]);

  const streamDisplayText = useSmoothStreamReveal({
    targetText: ollamaResponse,
    enabled: streamRevealActive,
    done: !isAsking && !isStreamSettling,
  });

  const desktopAutoSavePrefsRef = useRef({
    autoSave: a.desktopDebugNoteAutoSave,
    fsWrite: a.filesystemWrite,
  });
  useEffect(() => {
    desktopAutoSavePrefsRef.current = {
      autoSave: a.desktopDebugNoteAutoSave,
      fsWrite: a.filesystemWrite,
    };
  }, [a.desktopDebugNoteAutoSave, a.filesystemWrite]);

  useEffect(() => {
    if (!lastExchange?.question?.trim()) return;
    const qn = lastExchange.question.trim();
    if (lastFlushedExchangeQuestionRef.current === qn) return;
    /*
     * Stamp the AppID here, at completion, not at flush time. The flush runs inside the *next*
     * Ask, by which point the running game may already be a different title — and "named bosses
     * are not spoilers" is a per-game rule the display-time unwrap reads back off this turn.
     */
    pendingArchiveTurnRef.current = {
      question: lastExchange.question,
      answer: lastExchange.answer,
      appId: ollamaContext?.app_id || undefined,
      appName: lastExchange.appName || undefined,
      askedEntity: lastExchange.askedEntity || undefined,
      spoilerConsentEffective: lastExchange.spoilerConsentEffective === true,
      slotId: a.activeSlotIdRef?.current ?? null,
    };
  }, [lastExchange, ollamaContext?.app_id, a.activeSlotIdRef]);

  // --- Input transparency (Show details chip) ---
  // Lifted into useInputTransparencyRefresh. It must stay at exactly this point in the list:
  // React matches hooks by the order they run, not by name.
  const refreshInputTransparency = useInputTransparencyRefresh({
    setLastTransparency,
    pendingArchiveTurnRef,
  });

  // --- Poll bridge: map get_background_game_ai_status → UI state ---
  const applyBackgroundStatusToUi = useCallback(
    (status: BackgroundRequestStatus, fallbackQuestion: string = "") => {
      const appId = status.app_id ?? "";
      const appContext = status.app_context === "active" ? "active" : "none";

      /*
       * After Stop, only `cancelled` may still touch this turn. The poll is left running on purpose
       * so the kept draft can arrive, but a `completed`/`failed` result that was already in flight
       * must not resurrect the answer the user just stopped — and a `pending` one must not put the
       * spinner back. The loop re-arms only while pending, so terminal statuses end it either way.
       */
      if (stopRequestedRef.current && status.status !== "cancelled") {
        return;
      }

      /*
       * Which slot these tokens belong to. Until the backend started sending `chat_slot_id`
       * the frontend could not tell, so cycling slots mid-stream painted slot A's answer into
       * slot B. When it is foreign we actively write the quiet values rather than merely
       * skipping the paint: nothing else clears A's paint after a switch — `selectSlot` /
       * `applySlotTranscript` reset the archived thread but not the live paint.
       */
      const payloadSlotId = typeof status.chat_slot_id === "string" ? status.chat_slot_id : null;
      const activeSlotIdNow = a.activeSlotIdRef?.current ?? null;
      const paintsForeignSlot = Boolean(
        payloadSlotId && activeSlotIdNow && payloadSlotId !== activeSlotIdNow,
      );

      if (status.status === "pending") {
        // keepIfUnchanged: this arrives as a new object on every 150 ms poll; the same one must
        // not re-render the whole plugin (keepIfUnchanged.ts has the Deck measurement).
        setOllamaContext((prev) => keepIfUnchanged(prev, {
          app_id: appId,
          app_context: appContext,
          // Plan 54 gap 1/2: the pending poll is the only source of these while the answer is
          // still streaming — lastExchange stays empty until completion.
          app_name: status.app_name ?? "",
          asked_entity: status.strategy_spoiler_asked_entity ?? "",
        }));
        setIsAsking(true);
        setIsForeignPendingAsk(paintsForeignSlot);
        a.onGeneratingSlotChange?.(payloadSlotId);
        if (paintsForeignSlot) {
          // Returning to the origin slot flips this back to false and the next poll repaints
          // question, partial and caret on its own — that is the restore-on-return behavior.
          setOllamaResponse("");
          setThinkingSummary(null);
          setLiveReasoning(null);
          setIsStreamingPreview(false);
          setIsStreamSettling(false);
          setLastApplied(null);
          setElapsedSeconds(null);
          setStrategyGuideBranches(null);
          setModelPolicyDisclosure(null);
          setPresetCarouselInject(null);
          return;
        }
        /*
         * Refill the live header only when it is blank. A remount mid-Ask (QAM close/reopen
         * while still thinking) starts askThreadDisplayQuestion over at "" — the in-memory ref
         * that would normally hold it does not survive the remount — so this poll is the only
         * source left. Guarding on "currently blank" means a normal in-session poll, which
         * already has the right value (set synchronously at submit), is never overwritten with
         * a plainer caption than the one the app substituted for some presets.
         */
        const polledQuestion = typeof status.question === "string" ? status.question.trim() : "";
        if (polledQuestion) {
          setAskThreadDisplayQuestion((prev) => prev || polledQuestion);
        }
        /*
         * Python is the only writer. When a poll carries no summary — a remount mid-Ask, or a
         * status read before the opener was published — keep whatever is on screen rather than
         * composing a replacement, and fall back to the placeholder only if nothing is there.
         * Recomposing here is what let the client disagree with the backend about both the
         * template and the intent pool (06-thinking-blurbs-review.md § 2.1, § 2.2).
         */
        const polledThinking = sanitizeThinkingSummary(
          typeof status.thinking_summary === "string" ? status.thinking_summary : "",
        );
        if (polledThinking) {
          setThinkingSummary(polledThinking);
        } else {
          setThinkingSummary((prev) => prev || THINKING_BLURB_PLACEHOLDER);
        }
        /*
         * The model's own newest thinking, read on every poll beside the partial answer.
         *
         * A poll that carries nothing leaves what is already on screen alone. Two reasons: the
         * computer side stops republishing the slice once the answer starts, and a poll can land
         * before the first piece of thinking has been written. Blanking here would make the lines
         * flash away and the fold row's seconds disappear the moment the answer began.
         */
        const polledReasoning =
          typeof status.reasoning_partial === "string" ? status.reasoning_partial : "";
        const polledReasoningSeconds =
          typeof status.reasoning_seconds === "number" && Number.isFinite(status.reasoning_seconds)
            ? status.reasoning_seconds
            : null;
        if (polledReasoning.trim() || polledReasoningSeconds !== null) {
          setLiveReasoning((prev) => keepIfUnchanged(prev, {
            partial: polledReasoning.trim() ? polledReasoning : prev?.partial ?? "",
            seconds: polledReasoningSeconds ?? prev?.seconds ?? null,
          }));
        }
        /*
         * Plan 58 phase 1: the "From the notes" block's own material, read on every poll the
         * same way the reasoning slice above is. Unlike that slice this is not "keep the old
         * value when a poll carries nothing new" -- retrieval decides this once per turn and the
         * published value is stable for the rest of it, so an empty array here is itself the
         * correct, current fact ("nothing attached this turn"), not a gap to paper over.
         */
        if (Array.isArray(status.kb_attached_notes)) {
          setKbAttachedNotes((prev) => keepIfUnchanged(prev, status.kb_attached_notes ?? []));
        }
        const partialRaw =
          typeof status.partial_response === "string" ? status.partial_response : "";
        const streamingActive = status.streaming === true;
        if (streamingActive || partialRaw.trim()) {
          setOllamaResponse(partialRaw);
          setIsStreamingPreview(streamingActive);
          setIsStreamSettling(false);
        } else {
          const raw = status.response?.trim() ? status.response : "";
          setOllamaResponse(isPendingPlaceholderResponse(raw) ? "" : raw);
          setIsStreamingPreview(false);
        }
        setLastApplied(null);
        setElapsedSeconds(null);
        setStrategyGuideBranches(null);
        setModelPolicyDisclosure(null);
        setPresetCarouselInject(null);
        return;
      }

      if (status.status === "cancelled") {
        stopRequestedRef.current = false;
        setThinkingSummary(null);
        /* Stopped on purpose: the kept draft stays, the thinking lines go with the waiting phrase. */
        setLiveReasoning(null);
        const partialKeep =
          typeof status.partial_response === "string" && status.partial_response.trim()
            ? stripSoftContinueCue(status.partial_response).trim()
            : "";
        // `response` carries the kept draft (Plugin._cancelled_response_text); it falls back to a
        // stop status only when nothing readable had arrived, and that belongs in the notice.
        const cancelledText =
          partialKeep && !isPendingPlaceholderResponse(partialKeep)
            ? partialKeep
            : (status.response ?? "").trim();
        const cancelledBody = isStopNoticeResponse(cancelledText) ? "" : cancelledText;
        setIsStreamSettling(false);
        setIsStreamingPreview(false);
        setAskStopped(true);
        setOllamaContext({
          app_id: appId,
          app_context: appContext,
          app_name: status.app_name ?? "",
          asked_entity: status.strategy_spoiler_asked_entity ?? "",
        });
        setIsAsking(false);
        setShortcutSetupVariant(null);
        setOllamaResponse(cancelledBody);
        setLastApplied(null);
        setElapsedSeconds(Number.isFinite(status.elapsed_seconds) ? status.elapsed_seconds : null);
        setLastExchange(null);
        setStrategyGuideBranches(null);
        setModelPolicyDisclosure(null);
        setPresetCarouselInject(null);
        pendingArchiveTurnRef.current = null;
        pendingThreadQuestionDisplayRef.current = null;
        void refreshInputTransparency();
        a.onGeneratingSlotChange?.(null);
        a.onSlotTurnsChanged?.();
        return;
      }

      if (status.status === "completed" || status.status === "failed") {
        const applied = status.applied ?? null;
        /*
         * The whole thinking, as the computer side kept it. From here on this is what the fold row
         * and the block it opens read, so the newest-600-characters slice the poll was publishing
         * is no longer needed — and an answer that came back with no thinking at all clears it,
         * which is what keeps the row off a turn that has nothing behind it.
         */
        const finishedReasoning = reasoningFromFinishedStatus(status);
        setLiveReasoning(null);
        const terminalText = buildResponseText(status.response ?? "No response text.", applied);
        setOllamaContext({
          app_id: appId,
          app_context: appContext,
          app_name: status.app_name ?? "",
          asked_entity: status.strategy_spoiler_asked_entity ?? "",
        });
        setIsAsking(false);
        setIsForeignPendingAsk(false);
        a.onGeneratingSlotChange?.(null);
        if (paintsForeignSlot && payloadSlotId && status.status === "completed" && status.success) {
          a.onSlotAnswerFinished?.(payloadSlotId);
        }
        if (!paintsForeignSlot) {
          setShortcutSetupVariant(
            status.status === "completed" && status.success ? status.shortcut_setup ?? null : null,
          );
          setOllamaResponse(terminalText);
        }
        setLastApplied(applied);
        setElapsedSeconds(Number.isFinite(status.elapsed_seconds) ? status.elapsed_seconds : null);

        if (paintsForeignSlot) {
          // The answer belongs to a slot the user left. Never settle a stream that is not on
          // screen — `setIsStreamSettling(true)` here would animate slot B's card.
          setIsStreamingPreview(false);
          setIsStreamSettling(false);
        } else if (streamPreviewActiveRef.current) {
          // T3: snap smooth reveal to full text in stream bubble, then swap to terminal layout (may change later).
          setIsStreamSettling(true);
        } else {
          setThinkingSummary(null);
          setIsStreamingPreview(false);
          setIsStreamSettling(false);
        }

        setLastRequestId(typeof status.request_id === "number" ? status.request_id : null);
        if (status.status === "completed" && status.success) {
          const q = (status.question || fallbackQuestion || "").trim();
          // Same blank-only guard as the pending branch above: closes the case where the Ask
          // finished the remount still holding a blank live header (nothing polled while
          // pending, or the poll loop was never reached — e.g. the mount-restore effect's
          // one-shot status.status === "completed" read on reopen). Never fires once a real
          // caption is already showing.
          if (q && !paintsForeignSlot) {
            setAskThreadDisplayQuestion((prev) => prev || q);
          }
          const answer = buildResponseText(status.response ?? "No response text.", applied);
          const disc = status.model_policy_disclosure;
          setModelPolicyDisclosure(
            disc && typeof disc === "object" && typeof (disc as ModelPolicyDisclosurePayload).model === "string"
              ? (disc as ModelPolicyDisclosurePayload)
              : null,
          );
          setPresetCarouselInject(normalizePresetCarouselInject(status.preset_carousel_inject));
          if (status.thinking_unsupported) {
            // Say it once per model. Silently doing nothing would leave the Thinking setting
            // looking broken on a model that simply cannot do it.
            const warnKey = (status.model || "").trim() || "__unknown_model__";
            if (!thinkingUnsupportedWarnedRef.current.has(warnKey)) {
              thinkingUnsupportedWarnedRef.current.add(warnKey);
              toaster.toast({
                title: "Thinking not supported",
                body: status.model
                  ? `${status.model} answered without it.`
                  : "This model answered without it.",
                duration: 4000,
              });
            }
          }
          if (q) {
            const category = detectPromptCategory(q);
            /*
             * Re-seed suggested prompts at most once per completed request: the same terminal
             * status can be applied more than once (restore + poll), and getContextualPresets
             * is randomized — repeated calls churned seedsKey and made the carousel twitch.
             */
            const reseedRid = typeof status.request_id === "number" ? status.request_id : null;
            if (reseedRid === null || promptsReseededForRequestRef.current !== reseedRid) {
              promptsReseededForRequestRef.current = reseedRid;
              void reseedSuggestedPrompts("contextual", category, true);
            }
            const displayQ = (pendingThreadQuestionDisplayRef.current?.trim() || q).trim();
            pendingThreadQuestionDisplayRef.current = null;
            // Skipped for a foreign slot: otherwise the slot on screen grows a feedback/retry
            // row that would act on another slot's answer. The origin slot's feedback row stays
            // empty until a later reload — accepted.
            if (!paintsForeignSlot) {
              setLastExchange({
                question: displayQ,
                answer,
                originalQuestion: q,
                model:
                  disc && typeof disc === "object" && typeof (disc as ModelPolicyDisclosurePayload).model === "string"
                    ? (disc as ModelPolicyDisclosurePayload).model
                    : null,
                attachments: lastAskContextRef.current.attachments,
                spoilerConsentEffective: status.strategy_spoiler_consent_effective ?? false,
                askMode: lastAskContextRef.current.askMode,
                appName: status.app_name ?? "",
                askedEntity: status.strategy_spoiler_asked_entity ?? "",
                reasoning: finishedReasoning,
              });
            }
            lastStrategyAskQuestionRef.current = q;
            /*
             * Tag the payload with the slot that asked it, whether or not that is the slot on
             * screen right now — CHAT-SLOTS-V3-05a: a Strategy branch block from slot A's poll
             * used to paint straight into the shared state and show up in slot B, because this
             * write (unlike `setLastExchange` just above) never checked `paintsForeignSlot`.
             * The exposed value below hides it again the moment the owner and the active slot
             * disagree, so it reappears correctly if the user switches back to slot A instead
             * of leaking into whichever slot happens to be on screen when the poll lands.
             */
            const branchesForThisSlot = normalizeStrategyGuideBranches(status.strategy_guide_branches);
            if (branchesForThisSlot) {
              strategyGuideBranchesOwnerSlotIdRef.current = payloadSlotId ?? activeSlotIdNow;
            }
            setStrategyGuideBranches(branchesForThisSlot);
            const checklistPayload = normalizeStrategyChecklist(status.strategy_checklist);
            /*
             * The mode the REQUEST ran under, not the mode the panel is showing now.
             *
             * This read used to be `a.askMode`, and `applyBackgroundStatusToUi` is a `useCallback`
             * whose deps are `[refreshInputTransparency, syncOllamaContextFromRunningApp]` — neither
             * changes when the ask mode does, so the prop was frozen at its first-render value.
             * Settings hydrate after mount, so that value is the default `"speed"` essentially
             * always: the guard was false on every completed Ask and the checklist could never be
             * stored, no matter what the user had selected. Measured on device 2026-08-27 through
             * `dbg_fe_log` — the panel read Strategy, the backend logged `checklist_parsed=True`,
             * and this line saw `askMode: "speed"`.
             *
             * `lastAskContextRef` is written at submit from `askModeForRequest`, so it is both fresh
             * (a ref) and the right question to ask — the checklist belongs to the reply, so what
             * matters is the mode that produced it, not what the panel switched to since. The
             * `lastExchange` write directly above already sources it exactly this way.
             */
            if (checklistPayload && lastAskContextRef.current.askMode === "strategy") {
              const appId = status.app_id ?? "";
              const merged = mergeStrategyChecklistState(strategyChecklistRef.current, checklistPayload, {
                appId,
                appName: Router.MainRunningApp?.display_name ?? "",
              });
              setStrategyChecklist(merged);
              scheduleStrategyChecklistSessionSave(merged);
            }

            const { autoSave, fsWrite } = desktopAutoSavePrefsRef.current;
            const rid = status.request_id;
            if (autoSave && fsWrite && rid != null && typeof rid === "number" && !hasResponseAutosaved(rid)) {
              void callDeckyWithTimeout<[AppendDesktopChatEventPayload], AppendDesktopNoteResult>(
                "append_desktop_chat_event",
                [{ event: "response", response_text: answer, question: q }],
                DECKY_RPC_TIMEOUT_MS,
              )
                .then((result) => {
                  if (result.success) markResponseAutosaved(rid);
                })
                .catch(() => {});
            }
          } else {
            setLastExchange(null);
            setStrategyGuideBranches(null);
            pendingArchiveTurnRef.current = null;
            pendingThreadQuestionDisplayRef.current = null;
          }
        } else {
          setLastExchange(null);
          setStrategyGuideBranches(null);
          setModelPolicyDisclosure(null);
          setPresetCarouselInject(null);
          pendingArchiveTurnRef.current = null;
          pendingThreadQuestionDisplayRef.current = null;
        }
      void refreshInputTransparency();
      a.onSlotTurnsChanged?.();
      return;
    }

    setIsStreamingPreview(false);
    syncOllamaContextFromRunningApp();
    setIsAsking(false);
    setPresetCarouselInject(null);
  },
    [refreshInputTransparency, syncOllamaContextFromRunningApp],
  );

  const onTurnActivate = useCallback((key: string | "live") => {
    setExpandedTurnKey((prev) => (prev === key ? null : key));
  }, []);

  const onBackgroundPollError = useCallback((e: unknown) => {
    const msg = formatDeckyRpcError(e);
    a.onExternalFailure?.("background_poll", msg);
    setIsAsking(false);
    setThinkingSummary(null);
    setLiveReasoning(null);
    setIsStreamingPreview(false);
    setIsStreamSettling(false);
    setOllamaResponse(`Error: ${msg}`);
    setLastApplied(null);
    syncOllamaContextFromRunningApp();
    setLastExchange(null);
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setPresetCarouselInject(null);
    setShortcutSetupVariant(null);
    pendingArchiveTurnRef.current = null;
    pendingThreadQuestionDisplayRef.current = null;
  }, [a, syncOllamaContextFromRunningApp]);

  // --- Background status polling (useBackgroundGameAi) ---
  const {
    startNextRequest,
    invalidateRequests,
    startBackgroundStatusPolling,
    isRequestActive,
  } = useBackgroundGameAi(applyBackgroundStatusToUi, onBackgroundPollError);

  // --- Mount restore: resume pending Ask after plugin remount ---
  // Lifted into useAskMountRestore. It must stay at exactly this point in the list: React
  // matches hooks by the order they run, not by name.
  useAskMountRestore({
    applyBackgroundStatusToUi,
    isRequestActive,
    startBackgroundStatusPolling,
    startNextRequest,
  });

  // --- Reply rating + follow-up chips ---
  /*
   * Lifted into useReplyFeedbackChips. Two things fix it to exactly this point in the list, and
   * React matches hooks by the order they run rather than by name: it needs `lastRequestId`,
   * declared above, and `clearUnifiedInput` just below wipes the chip error, so the setter has to
   * be in scope before that callback is written. Retry stays behind because it asks again.
   */
  const {
    onReplyFeedback,
    onReplyMicroAction,
    liveReplyFeedbackRating,
    liveReplyChipUsed,
    liveReplyChipError,
    setLiveReplyChipError,
    resetReplyFeedback,
  } = useReplyFeedbackChips({
    lastExchange,
    lastRequestId,
    setUnifiedInput: a.setUnifiedInput,
    askMode: a.askMode,
    pendingReplyFollowUpRef,
  });

  // --- Submit, cancel, clear Ask field ---
  const clearUnifiedInput = useCallback(() => {
    if (isAsking) {
      /* Ask-bar ✕ while a request is in flight: abort the backend too (it only reset UI state
         before, so Ollama kept generating — the "x doesn't stop it" regression). */
      void callDeckyWithTimeout<[], { ok?: boolean }>("abort_background_game_ai", []).catch(() => {
        /* best-effort RPC */
      });
      invalidateRequests();
      stopAskCompletionWatch();
      setIsAsking(false);
    }
    a.setUnifiedInput("");
    a.setSelectedIndex(-1);
    a.setNavigationMessage("");
    setOllamaResponse("");
    setAskStopped(false);
    syncOllamaContextFromRunningApp();
    setLastApplied(null);
    setLastExchange(null);
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setPresetCarouselInject(null);
    setShortcutSetupVariant(null);
    a.setSelectedAttachment(null);
    pendingReplyFollowUpRef.current = null;
    setLiveReplyChipError(null);
    setElapsedSeconds(null);
    setShowSlowWarning(false);
    setIsStreamingPreview(false);
    setThinkingSummary(null);
    setLiveReasoning(null);
  }, [a, invalidateRequests, isAsking, syncOllamaContextFromRunningApp]);

  const onCancelAsk = useCallback(() => {
    void callDeckyWithTimeout<[], { ok?: boolean }>("abort_background_game_ai", []).catch(() => {
      /* best-effort RPC */
    });
    /*
     * Deliberately does NOT invalidate the poll, and does NOT write a cancel literal over the body.
     *
     * Both of those together are what made STREAM-04 impossible: the backend keeps the drafted text
     * and publishes it on the `cancelled` status, but the poll was torn down before it could arrive
     * and the answer the user was reading had already been replaced. The poll stops on its own once
     * a terminal status lands (`startBackgroundStatusPolling` only re-arms while `pending`).
     *
     * The body needs no assignment here: `ollamaResponse` already holds the last streamed partial,
     * so leaving it alone *is* keeping it. The cancelled status then confirms or refines it.
     */
    stopAskCompletionWatch();
    stopRequestedRef.current = true;
    /*
     * Bounded fallback: if the cancelled status never arrives (abort RPC lost, backend wedged),
     * stop polling anyway rather than leaving a poll running against a turn the user ended.
     */
    window.setTimeout(() => {
      if (!stopRequestedRef.current) return;
      stopRequestedRef.current = false;
      invalidateRequests();
    }, STOP_STATUS_GRACE_MS);
    const drafted = ollamaResponseRef.current.trim();
    const keptDraft = Boolean(drafted) && !isPendingPlaceholderResponse(drafted);
    setIsAsking(false);
    setThinkingSummary(null);
    setLiveReasoning(null);
    setIsStreamingPreview(false);
    setIsStreamSettling(false);
    setAskStopped(true);
    if (!keptDraft) {
      // Nothing readable arrived yet. A bare "Stopped" notice is not worth a turn — clear it and
      // hand the question back so it can be edited and resent.
      setOllamaResponse("");
      const pendingQuestion = askThreadDisplayQuestionRef.current.trim();
      if (pendingQuestion) a.setUnifiedInput(pendingQuestion);
    }
    syncOllamaContextFromRunningApp();
    setLastApplied(null);
    setElapsedSeconds(null);
    setShowSlowWarning(false);
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setPresetCarouselInject(null);
    setShortcutSetupVariant(null);
  }, [a, invalidateRequests, syncOllamaContextFromRunningApp]);

  const onAskOllama = useCallback(
    async (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => {
      // The point here is to dismiss the on-screen keyboard before an Ask, and that is bound to
      // activeElement — the gamepad ring is the wrong question, not the right one.
      // focus-patterns-allow: blurring the DOM's focused element, not asking where the ring is.
      const active = uiActiveElement();
      if (active) {
        active.blur();
      }
      await new Promise((r) => setTimeout(r, 50));

      if (overrideQuestion !== undefined) {
        pendingReplyFollowUpRef.current = null;
      }

      const followUpPending = pendingReplyFollowUpRef.current;
      const q = (overrideQuestion ?? a.unifiedInput).trim();
      const ip = a.effectiveOllamaPcIp;
      if (!q) {
        toaster.toast({
          title: "Question required",
          body: "Type a question in the ask field first.",
          duration: 3500,
        });
        return;
      }
      if (!ip && !questionBypassesOllamaPcIpRequirement(q)) {
        toaster.toast({ title: "PC IP required", body: "Set your Ollama PC IP before asking.", duration: 4000 });
        return;
      }

      const arch = pendingArchiveTurnRef.current;
      /*
       * Guard added for the "ghost question" bug: this flush exists to replay the just-finished
       * turn into `askThreadCollapsed` synchronously, ahead of the disk reload's own race (see
       * the comment below). That is only correct when the flush lands in the SAME chat the turn
       * belongs to. `resetLiveAskPresentation` (a plain chat switch) deliberately leaves this ref
       * alone, so asking the first question in a brand-new chat used to replay the PREVIOUS
       * chat's last question above the new one, for as long as it took that previous chat's own
       * disk reload to overwrite it — roadmap: "the previous chat's question shows in a brand-new
       * chat for about 40 seconds". A turn whose slot no longer matches the chat we're asking
       * into now is simply stale and dropped below, not replayed.
       */
      const archBelongsToActiveSlot = (arch?.slotId ?? null) === (a.activeSlotIdRef?.current ?? null);
      if (arch && archBelongsToActiveSlot && arch.question.trim() && arch.answer.trim()) {
        /*
         * Replace the tail rather than always appending, or the previous turn shows up twice for
         * the whole length of this generation.
         *
         * Two writers reach this list and neither knows about the other. When the previous reply
         * landed, `onSlotTurnsChanged` fired `reloadActiveSlotTranscript`, which rebuilt the whole
         * list from the saved chat — turn N included. This flush then appended turn N a second time
         * from `pendingArchiveTurnRef`. Measured on device 2026-08-27 mid-Ask: the same question
         * appeared twice, once under its slot id and once under a freshly minted `turn-<ts>-<i>` id,
         * which is what named this line as the doubling writer. The next reload flattens it back,
         * so it self-corrects — but only after a generation that runs one to three minutes on this
         * hardware, which is exactly the window a QA pass is looking at.
         *
         * The flush is NOT redundant, which is why this replaces instead of skipping: the reloaded
         * copy comes from disk via `turnsToCollapsedTurns`, which still hardcodes
         * `spoilerConsentEffective: false` (consent is a live decision, never persisted). The
         * AppID it used to blank as well is now carried through from Python
         * ([chatSlotTurns.ts](../utils/chatSlotTurns.ts)), so a reloaded row no longer loses the
         * game its answer was about — but this flush still holds the fresher consent flag that the
         * display-time spoiler unwrap reads (STRAT-SPOIL-DRG-01).
         * Keeping the reloaded row's `id` matters too — it is the slot's own turn id, so it survives
         * the next reload, where a minted one would be replaced by it anyway.
         *
         * Matching on question+answer rather than id is deliberate: the two writers mint ids
         * independently, so ids cannot match by construction. The one case this gets wrong is a
         * question and answer that are both byte-identical to the immediately preceding turn with
         * no saved chat active to reload from — a repeat of the same question answered verbatim the
         * same way. That loses one history row; the alternative loses nothing and shows a duplicate
         * on every follow-up Ask.
         */
        setAskThreadCollapsed((prev) => {
          const last = prev[prev.length - 1];
          const alreadyReloaded =
            !!last &&
            last.question.trim() === arch.question.trim() &&
            last.answer.trim() === arch.answer.trim();
          const row = {
            id: alreadyReloaded ? last.id : `turn-${Date.now()}-${prev.length}`,
            question: arch.question,
            answer: arch.answer,
            transparency: arch.transparency ?? null,
            appId: arch.appId,
            appName: arch.appName,
            askedEntity: arch.askedEntity,
            spoilerConsentEffective: arch.spoilerConsentEffective === true,
          };
          return alreadyReloaded ? [...prev.slice(0, -1), row] : [...prev, row];
        });
        lastFlushedExchangeQuestionRef.current = arch.question.trim();
      }
      pendingArchiveTurnRef.current = null;
      setExpandedTurnKey("live");
      setAskStopped(false);
      stopRequestedRef.current = false;
      pendingThreadQuestionDisplayRef.current = opts?.threadQuestionDisplay?.trim() || null;
      setAskThreadDisplayQuestion(pendingThreadQuestionDisplayRef.current ?? q);

      const attachments: AskAttachmentSnapshot[] = followUpPending?.attachments?.length
        ? followUpPending.attachments
        : a.selectedAttachment
          ? [
              {
                path: a.selectedAttachment.path,
                name: a.selectedAttachment.name,
                source: a.selectedAttachment.source,
                app_id: a.selectedAttachment.app_id ?? "",
              },
            ]
          : [];

      const askModeForRequest = followUpPending?.askMode ?? a.askMode;
      const spoilerConsentForRequest = followUpPending?.spoilerConsentEffective ?? false;

      lastAskContextRef.current = {
        attachments: [...attachments],
        askMode: askModeForRequest,
        rawQuestion: q,
      };

      if (followUpPending) {
        pendingReplyFollowUpRef.current = null;
      }

      const seq = startNextRequest();

      const runningApp = Router.MainRunningApp;
      const appId = runningApp?.appid?.toString() ?? "";
      const appName = runningApp?.display_name ?? "";

      const isStrategyFirstTurn =
        askModeForRequest === "strategy" && !q.trim().startsWith(STRATEGY_FOLLOWUP_PREFIX);
      if (isStrategyFirstTurn) {
        setStrategyChecklist(null);
        strategyChecklistRef.current = null;
        void clearStrategyChecklistSession(appId).catch(() => {});
      }

      setIsAsking(true);
      /*
       * A constant placeholder, not a composed line. The real opener arrives in the
       * start_background_game_ai response a round-trip later, woven with the question and the
       * running title. Composing one here instead meant the first thing the line did was replace
       * itself with a different template from the same pool — the client counter is per-mount,
       * the backend's is per-plugin-lifetime, so the two never agreed on which one to pick.
       */
      setThinkingSummary(THINKING_BLURB_PLACEHOLDER);
      /* A new question starts with no thinking of its own; the last one's lines must not linger. */
      setLiveReasoning(null);
      setPresetCarouselInject(null);
      setStrategyGuideBranches(null);
      setModelPolicyDisclosure(null);
      setShortcutSetupVariant(null);
      setLastTransparency(null);
      /* The transcript falls back to this once a reply finishes and the details fetch has not
       * landed yet, so a new question must not start out showing the previous one's notes. */
      setKbAttachedNotes(null);
    setIsStreamingPreview(false);
    setIsStreamSettling(false);
    setOllamaResponse("");
      setLastApplied(null);
      setElapsedSeconds(null);
      setOllamaContext({
        app_id: appId,
        app_context: appId ? "active" : "none",
      });
      /*
       * The slot has to exist *before* the RPC, not after it: `start_background_game_ai`
       * files the user turn straight from this payload, so a missing `chat_slot_id` drops
       * the user turn silently and the assistant turn with an error a reply later. This is
       * free on the common path — `ensureActiveSlotForAsk` returns the active id without a
       * round trip when one is already selected. Best-effort by design: if slot creation
       * fails the Ask still runs, unpersisted, exactly as it behaved before.
       */
      let chatSlotIdForRequest = a.activeSlotIdRef?.current ?? null;
      try {
        chatSlotIdForRequest = (await a.ensureActiveSlotForAsk?.(q)) ?? chatSlotIdForRequest;
      } catch {
        /* An Ask that cannot be filed still has to run. */
      }
      try {
        const data = await callDeckyWithTimeout<
          [
            {
              question: string;
              PcIp: string;
              appId: string;
              appName: string;
              attachments: AskAttachment[];
              ask_mode: AskModeId;
              spoiler_consent: boolean;
              strategy_checklist_state?: ReturnType<typeof strategyChecklistToAskPayload>;
              reply_followup?: {
                chip_id: ReplyMicroActionId;
                parent_question: string;
                parent_answer: string;
                preferred_model: string | null;
              };
              chat_slot_id?: string;
              display_question?: string;
            },
          ],
          BackgroundStartResponse
        >("start_background_game_ai", [
          {
            question: q,
            PcIp: ip,
            appId,
            appName,
            attachments: attachments as AskAttachment[],
            ask_mode: askModeForRequest,
            spoiler_consent: spoilerConsentForRequest,
            ...(chatSlotIdForRequest ? { chat_slot_id: chatSlotIdForRequest } : {}),
            /*
             * The friendly caption the user saw, when it differs from the composed prompt (a
             * branch pick shows "I'm at: …" but sends "[Strategy follow-up] I'm at: …"). The
             * backend stores it on the saved turn so a reopened chat's header shows this and not
             * internal plumbing. The ref is set a few lines above and not cleared until the
             * request resolves, so it is still live here.
             */
            ...(pendingThreadQuestionDisplayRef.current?.trim()
              ? { display_question: pendingThreadQuestionDisplayRef.current.trim() }
              : {}),
            ...(followUpPending
              ? {
                  reply_followup: {
                    chip_id: followUpPending.chipId,
                    parent_question: followUpPending.parentQuestion,
                    parent_answer: followUpPending.parentAnswer,
                    preferred_model: followUpPending.preferredModel,
                  },
                }
              : {}),
            ...(askModeForRequest === "strategy" && !isStrategyFirstTurn && strategyChecklistRef.current
              ? { strategy_checklist_state: strategyChecklistToAskPayload(strategyChecklistRef.current) }
              : {}),
          },
        ]);

        if (!isRequestActive(seq)) return;

        if (data.status === "invalid") {
          setIsAsking(false);
          setOllamaResponse(data.response ?? "Request is invalid.");
          setLastApplied(null);
          setElapsedSeconds(null);
          pendingThreadQuestionDisplayRef.current = null;
          return;
        }

        if (data.status === "blocked") {
          setIsAsking(false);
          setOllamaResponse(data.response ?? "That input was not sent.");
          setLastApplied(null);
          setElapsedSeconds(null);
          setOllamaContext({
            app_id: appId,
            app_context: appId ? "active" : "none",
            // A blocked submit still starts a new question — clear the previous one's value
            // rather than let it linger under the new question's bubble.
            app_name: appName,
            asked_entity: "",
          });
          void refreshInputTransparency();
          pendingThreadQuestionDisplayRef.current = null;
          toaster.toast({
            title: "Input not sent",
            body: data.response ?? "Blocked by input checks.",
            duration: 5000,
          });
          return;
        }

        startAskCompletionWatch();

        // Swap the placeholder for the backend's woven opener. Absent on older backends and on
        // the immediate-completion paths below, where the placeholder is about to be cleared.
        const openingBlurb = sanitizeThinkingSummary(
          typeof data.thinking_summary === "string" ? data.thinking_summary : "",
        );
        if (openingBlurb) setThinkingSummary(openingBlurb);

        a.setUnifiedInput("");
        a.setSelectedAttachment(null);

        if (data.status === "completed" && data.success) {
          if (!isRequestActive(seq)) return;
          const now = Date.now() / 1000;
          const terminal: BackgroundRequestStatus = {
            status: "completed",
            request_id: data.request_id ?? null,
            question: q,
            app_id: data.app_id ?? appId,
            app_name: data.app_name ?? appName,
            app_context: (appId ? "active" : "none") as "active" | "none",
            success: true,
            response: data.response ?? "",
            applied: data.applied ?? null,
            elapsed_seconds: Number.isFinite(data.elapsed_seconds) ? Number(data.elapsed_seconds) : 0,
            error: null,
            started_at: now,
            completed_at: now,
            // Null is correct here, and this was filed as a bug on 2026-08-27 for looking like it
            // was not. `start_background_game_ai` only ever answers "completed" from
            // `_finalize_immediate_background_local_command` (main.py:2173), whose three call
            // sites are all guarded by `local_kinds.sanitizer` / `.shortcut` / `.vac`
            // (main.py:2588, :2607, :2627). Those are local commands -- the model is never asked,
            // so there is no branch picker, no checklist and no policy disclosure to carry. The
            // old note guessed this path was unreachable only because replies are slow; it is
            // unreachable for model answers by construction. Do not "fix" this by passing
            // `data.strategy_*` through: that would be dead code on the only path that gets here.
            strategy_guide_branches: null,
            model_policy_disclosure: null,
            strategy_spoiler_consent_effective: false,
            shortcut_setup: data.shortcut_setup ?? null,
            // Carried through so an Ask that completes on the start call still reports a
            // model that refused to think; this path never polls, so nothing else would.
            thinking_unsupported: data.thinking_unsupported ?? false,
            model: data.model ?? null,
          };
          applyBackgroundStatusToUi(terminal, "");
          if (ip.trim().length > 0) {
            a.saveIp(ip);
          }
          if (a.unifiedInputPersistenceMode === "persist_search_only") {
            a.persistSearchQuery("");
          }
          if (data.meta === "shortcut_setup") {
            toaster.toast({
              title: "Quick-launch help",
              body: "In-app guide only; tune the chord in Controller settings. See full recipe in docs.",
              duration: 5000,
            });
          }
          if (data.meta === "sanitizer_keyword") {
            void a.syncSettingsFromDisk().catch((err) => {
              console.error("syncSettingsFromDisk failed (sanitizer keyword)", err);
            });
            toaster.toast({
              title: "Sanitizer",
              body: "Mode saved. See README for commands.",
              duration: 4000,
            });
          }
          if (data.meta === "vac_check") {
            toaster.toast({
              title: "Steam ban lookup",
              body: "Account-level GetPlayerBans only — not proof someone was your opponent.",
              duration: 6000,
            });
          }
          return;
        }

        if (data.status === "busy") {
          setIsAsking(true);
          setOllamaResponse(data.response ?? "A request is already in progress.");
        }

        if (data.status === "pending" && a.desktopDebugNoteAutoSave && a.filesystemWrite) {
          const screenshotPaths = attachments.map((at) => at.path).filter((p) => p.trim().length > 0);
          void callDeckyWithTimeout<[AppendDesktopChatEventPayload], AppendDesktopNoteResult>(
            "append_desktop_chat_event",
            [{ event: "ask", question: q, screenshot_paths: screenshotPaths }],
            DECKY_RPC_TIMEOUT_MS,
          ).catch(() => {});
        }

        if (ip.trim().length > 0) {
          a.saveIp(ip);
        }
        if (a.unifiedInputPersistenceMode === "persist_search_only") {
          a.persistSearchQuery("");
        }
        startBackgroundStatusPolling(seq, q);
      } catch (e: unknown) {
        if (!isRequestActive(seq)) return;
        const msg = formatDeckyRpcError(e);
        a.onExternalFailure?.("ask_ollama", msg);
        setIsAsking(false);
        setOllamaResponse(`Error: ${msg}`);
        setLastApplied(null);
        syncOllamaContextFromRunningApp();
        setStrategyGuideBranches(null);
        pendingThreadQuestionDisplayRef.current = null;
      }
    },
    [
      a,
      applyBackgroundStatusToUi,
      isRequestActive,
      refreshInputTransparency,
      startBackgroundStatusPolling,
      startNextRequest,
      syncOllamaContextFromRunningApp,
    ],
  );

  // --- Strategy branches + checklist toggles ---
  // Lifted into useStrategyBranchActions. It must stay at exactly this point in the list,
  // after onAskOllama is declared above: React matches hooks by the order they run, not by
  // name, and this closes over onAskOllama rather than reading it through a ref.
  const { onStrategyBranchPick, onStrategyChecklistToggle } = useStrategyBranchActions({
    lastExchange,
    setStrategyGuideBranches,
    setStrategyChecklist,
    setUnifiedInput: a.setUnifiedInput,
    unifiedInputFieldLayerRef: a.unifiedInputFieldLayerRef,
    unifiedInputHostRef: a.unifiedInputHostRef,
    activeSlotIdRef: a.activeSlotIdRef,
    lastFlushedExchangeQuestionRef,
    pendingArchiveTurnRef,
    lastStrategyAskQuestionRef,
    onAskOllama,
  });

  // --- Retry the last reply (rating and the chips live in useReplyFeedbackChips) ---
  const onRetryLastResponse = useCallback(() => {
    pendingReplyFollowUpRef.current = null;
    setLiveReplyChipError(null);
    const q = (lastExchange?.question || a.unifiedInput || askThreadDisplayQuestion).trim();
    if (!q) {
      toaster.toast({
        title: "Nothing to retry",
        body: "Complete an Ask first, or type a question in the field.",
        duration: 3500,
      });
      return;
    }
    void onAskOllama(q, { threadQuestionDisplay: q });
  }, [lastExchange?.question, a.unifiedInput, askThreadDisplayQuestion, onAskOllama]);

  // --- Session survival snapshot restore / reset ---
  const restoreSessionSnapshot = useCallback((snap: BonsaiSessionSurvivalSnapshot) => {
    setOllamaResponse(snap.ollamaResponse);
    /*
     * Not a blind `setOllamaContext(snap.ollamaContext)`. The snapshot was captured while a
     * modal was open (or the panel was closed) and can name a game that has since been closed —
     * the exact way the Ask-bar footnote kept naming a game after it was exited. Re-derived from
     * the running game right now (the same source `syncOllamaContextFromRunningApp` reads),
     * rather than trusting whatever the snapshot says, so a game that closed while the panel was
     * away is not resurrected on the way back.
     */
    syncOllamaContextFromRunningApp();
    setLastExchange(snap.lastExchange);
    setAskThreadCollapsed(snap.askThreadCollapsed);
    setAskThreadDisplayQuestion(snap.askThreadDisplayQuestion);
    setExpandedTurnKey(snap.expandedTurnKey ?? "live");
    setSuggestedPrompts(snap.suggestedPrompts);
    setLastTransparency(snap.lastTransparency);
    setModelPolicyDisclosure(snap.modelPolicyDisclosure);
    // Same ownership tag the poll path writes: a restored branch block belongs to whichever
    // slot was active when the snapshot was taken, not to whatever slot restores it.
    strategyGuideBranchesOwnerSlotIdRef.current = snap.strategyGuideBranches
      ? snap.activeSlotId ?? null
      : null;
    setStrategyGuideBranches(snap.strategyGuideBranches);
    setStrategyChecklist(snap.strategyChecklist ?? null);
    setElapsedSeconds(snap.elapsedSeconds);
    setLastApplied(snap.lastApplied);
    setShortcutSetupVariant(snap.shortcutSetupVariant);
    setPresetCarouselInject(snap.presetCarouselInject);
    setShowSlowWarning(snap.showSlowWarning);
    setLastRequestId(snap.lastRequestId);
    setThinkingSummary(snap.thinkingSummary);
    /* Closing the panel mid-think and opening it again keeps the model's own lines on screen. */
    setLiveReasoning(snap.liveReasoning ?? null);
  }, [syncOllamaContextFromRunningApp]);

  const resetAskSessionSlice = useCallback(() => {
    if (isAsking) {
      invalidateRequests();
      stopAskCompletionWatch();
      setIsAsking(false);
    }
    setIsStreamingPreview(false);
    setIsStreamSettling(false);
    setThinkingSummary(null);
    setLiveReasoning(null);
    setOllamaResponse("");
    syncOllamaContextFromRunningApp();
    setLastApplied(null);
    setLastExchange(null);
    setStrategyGuideBranches(null);
    setStrategyChecklist(null);
    setElapsedSeconds(null);
    setShowSlowWarning(false);
    setAskThreadCollapsed([]);
    setExpandedTurnKey("live");
    setAskThreadDisplayQuestion("");
    setLastTransparency(null);
    setModelPolicyDisclosure(null);
    setPresetCarouselInject(null);
    setShortcutSetupVariant(null);
    pendingArchiveTurnRef.current = null;
    pendingThreadQuestionDisplayRef.current = null;
    pendingReplyFollowUpRef.current = null;
    lastFlushedExchangeQuestionRef.current = "";
    resetReplyFeedback();
  }, [invalidateRequests, isAsking, syncOllamaContextFromRunningApp, resetReplyFeedback]);

  /*
   * The narrower twin of resetAskSessionSlice, for switching to a different saved chat rather
   * than a full detach (Clear cache / QAM restore). It blanks only the LIVE ANSWER a person can
   * see under the question box — the just-finished reply's text, its Helpful/Not really/Read
   * aloud buttons, its thinking fold, the Strategy Guide branch block — so a different chat never
   * draws the one you just left. Roadmap: "A new chat shows the previous chat's last reply until
   * the panel is reopened" — the new chat's own saved file was already empty and correct; nothing
   * had ever cleared THIS state on a plain switch.
   *
   * Deliberately does NOT touch:
   *  - isAsking / invalidateRequests(): a reply still being written in the chat you just left has
   *    to keep going. Stopping it here would silence the busy dot on the slot row and throw away
   *    a real, in-progress answer.
   *  - askThreadCollapsed / askThreadDisplayQuestion / expandedTurnKey: useChatSlots.ts's own
   *    selectSlot() sets these from the slot actually being switched to, right around this call —
   *    overwriting them here would race that and could blank a chat that has real history.
   *  - pendingArchiveTurnRef / pendingThreadQuestionDisplayRef: the turn a foreign in-flight
   *    request is still assembling for the chat you left has to survive so it archives correctly
   *    once that answer completes.
   *  - the ask bar itself (unifiedInput, selectedIndex, selectedAttachment): switching chats is
   *    not the same gesture as clearing the question box.
   */
  const resetLiveAskPresentation = useCallback(() => {
    setOllamaResponse("");
    setIsStreamingPreview(false);
    setIsStreamSettling(false);
    setThinkingSummary(null);
    setLiveReasoning(null);
    setAskStopped(false);
    setLastApplied(null);
    setLastExchange(null);
    setElapsedSeconds(null);
    setStrategyGuideBranches(null);
    setStrategyChecklist(null);
    setModelPolicyDisclosure(null);
    setPresetCarouselInject(null);
    setShortcutSetupVariant(null);
    setLastTransparency(null);
    resetReplyFeedback();
  }, [resetReplyFeedback]);

  /*
   * The read-side half of CHAT-SLOTS-V3-05a's fix: hide the branch block the instant its owning
   * slot and the slot on screen disagree, rather than trust every past and future write site to
   * have remembered to check. Missing ids (no chat-slots caller, or a legacy payload with no
   * owner recorded) fall back to showing it — same permissive default `paintsForeignSlot` uses
   * above, so nothing regresses for a caller that never wires slots in.
   */
  const activeSlotIdForExposure = a.activeSlotIdRef?.current ?? null;
  const strategyGuideBranchesOwner = strategyGuideBranchesOwnerSlotIdRef.current;
  const exposedStrategyGuideBranches =
    strategyGuideBranches &&
    strategyGuideBranchesOwner &&
    activeSlotIdForExposure &&
    strategyGuideBranchesOwner !== activeSlotIdForExposure
      ? null
      : strategyGuideBranches;

  return {
    ollamaResponse,
    ollamaContext,
    lastExchange,
    setLastExchange,
    strategyGuideBranches: exposedStrategyGuideBranches,
    strategyChecklist,
    modelPolicyDisclosure,
    presetCarouselInject,
    shortcutSetupVariant,
    suggestedPrompts,
    showSlowWarning,
    setShowSlowWarning,
    elapsedSeconds,
    lastTransparency,
    setLastTransparency,
    thinkingSummary,
    liveReasoning,
    kbAttachedNotes,
    lastRequestId,
    askThreadCollapsed,
    setAskThreadCollapsed,
    setAskThreadDisplayQuestion,
    setStrategyChecklist,
    expandedTurnKey,
    setExpandedTurnKey,
    onTurnActivate,
    askThreadDisplayQuestion,
    isAsking,
    askStopped,
    isForeignPendingAsk,
    isStreamingPreview,
    isStreamSettling,
    streamDisplayText,
    lastApplied,
    refreshInputTransparency,
    startNextRequest,
    invalidateRequests,
    clearUnifiedInput,
    onCancelAsk,
    onAskOllama,
    onRetryLastResponse,
    onReplyFeedback,
    onReplyMicroAction,
    liveReplyFeedbackRating,
    liveReplyChipUsed,
    liveReplyChipError,
    onStrategyBranchPick,
    onStrategyChecklistToggle,
    hydrateStrategyChecklistFromDisk,
    restoreSessionSnapshot,
    resetAskSessionSlice,
    resetLiveAskPresentation,
    setStrategyGuideBranches,
    setSuggestedPrompts,
    reseedSuggestedPrompts,
  };
}
