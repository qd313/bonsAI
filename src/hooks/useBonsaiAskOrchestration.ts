/**
 * Main-tab Ask orchestration: RPC submit, background status bridge, presets/transparency/desktop autosave hooks.
 * Refs pair with `useBackgroundGameAi` polling — reordering hooks risks stale poll callbacks after unmount.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { call, toaster } from "@decky/api";
import { Router } from "@decky/ui";

import type { AskAttachment } from "../types/bonsaiUi";
import {
  buildResponseText,
  type AskModeId,
  type UnifiedInputPersistenceMode,
} from "../utils/settingsAndResponse";
import { detectPromptCategory, getContextualPresets, getRandomPresets, type PresetPrompt } from "../data/presets";
import {
  CUSTOM_RESOLUTION_INPUT_PREFIX,
  isStrategyCustomResolutionBranch,
  STRATEGY_FOLLOWUP_PREFIX,
} from "../data/strategyGuideFollowup";
import { INPUT_SANITIZER_COMMAND_DISABLE, INPUT_SANITIZER_COMMAND_ENABLE } from "../data/inputSanitizerCommands";
import { normalizeStrategyGuideBranches } from "../utils/strategyGuideBranches";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { useBackgroundGameAi } from "./useBackgroundGameAi";
import type {
  AppendDesktopChatEventPayload,
  AppendDesktopNoteResult,
  BackgroundRequestStatus,
  BackgroundStartResponse,
  LastExchangeSnapshot,
  PresetCarouselInjectPayload,
} from "../types/backgroundAsk";
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import type {
  OllamaContextUi,
  AppliedResult,
  StrategyGuideBranchesPayload,
  AskThreadCollapsedTurn,
} from "../types/bonsaiUi";
import { hasResponseAutosaved, markResponseAutosaved } from "../utils/desktopChatAutosave";
import { normalizePresetCarouselInject } from "../utils/presetCarouselInject";
import type { InputTransparencyRpcResult, TransparencySnapshot } from "../utils/inputTransparency";

/** Maps RPC poll payloads into Main-tab AI presentation state (pending vs terminal branches differ sharply). */
export type UseBonsaiAskOrchestrationArgs = {
  desktopDebugNoteAutoSave: boolean;
  filesystemWrite: boolean;
  strategySpoilerAutoRevealAfterConsent: boolean;
  askMode: AskModeId;
  strategySpoilerConsentForNextAsk: boolean;
  unifiedInput: string;
  setUnifiedInput: Dispatch<SetStateAction<string>>;
  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  effectiveOllamaPcIp: string;
  selectedAttachment: AskAttachment | null;
  setSelectedAttachment: Dispatch<SetStateAction<AskAttachment | null>>;
  setInputSanitizerUserDisabled: Dispatch<SetStateAction<boolean>>;
  unifiedInputFieldLayerRef: RefObject<HTMLDivElement | null>;
  unifiedInputHostRef: RefObject<HTMLDivElement | null>;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setNavigationMessage: Dispatch<SetStateAction<string>>;
  saveIp: (ip: string) => void;
  persistSearchQuery: (unifiedInputText: string) => void;
};

export function useBonsaiAskOrchestration(a: UseBonsaiAskOrchestrationArgs) {
  const [ollamaResponse, setOllamaResponse] = useState("");
  const [ollamaContext, setOllamaContext] = useState<OllamaContextUi>(null);
  const [lastExchange, setLastExchange] = useState<LastExchangeSnapshot | null>(null);
  const [strategyGuideBranches, setStrategyGuideBranches] = useState<StrategyGuideBranchesPayload | null>(null);
  const [modelPolicyDisclosure, setModelPolicyDisclosure] = useState<ModelPolicyDisclosurePayload | null>(null);
  const [lastStrategySpoilerConsentEffective, setLastStrategySpoilerConsentEffective] = useState(false);
  const [presetCarouselInject, setPresetCarouselInject] = useState<PresetCarouselInjectPayload | null>(null);
  const [shortcutSetupVariant, setShortcutSetupVariant] = useState<NonNullable<
    BackgroundRequestStatus["shortcut_setup"]
  > | null>(null);
  const lastStrategyAskQuestionRef = useRef<string>("");
  const pendingArchiveTurnRef = useRef<{ question: string; answer: string } | null>(null);
  const pendingThreadQuestionDisplayRef = useRef<string | null>(null);
  const lastFlushedExchangeQuestionRef = useRef<string>("");
  const [askThreadCollapsed, setAskThreadCollapsed] = useState<AskThreadCollapsedTurn[]>([]);
  const askThreadCollapsedRef = useRef(askThreadCollapsed);
  useEffect(() => {
    askThreadCollapsedRef.current = askThreadCollapsed;
  }, [askThreadCollapsed]);
  const [askThreadViewIndex, setAskThreadViewIndex] = useState<number | null>(null);
  const [askThreadDisplayQuestion, setAskThreadDisplayQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [lastApplied, setLastApplied] = useState<AppliedResult | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<PresetPrompt[]>(() => getRandomPresets(3));
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [lastTransparency, setLastTransparency] = useState<TransparencySnapshot | null>(null);

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
    pendingArchiveTurnRef.current = { question: lastExchange.question, answer: lastExchange.answer };
  }, [lastExchange]);

  const refreshInputTransparency = useCallback(async () => {
    try {
      const r = await callDeckyWithTimeout<[], InputTransparencyRpcResult>(
        "get_input_transparency",
        [],
        DECKY_RPC_TIMEOUT_MS,
      );
      if (r.available && "snapshot" in r) {
        setLastTransparency(r.snapshot);
      } else {
        setLastTransparency(null);
      }
    } catch {
      setLastTransparency(null);
    }
  }, []);

  const applyBackgroundStatusToUi = useCallback(
    (status: BackgroundRequestStatus, fallbackQuestion: string = "") => {
      const appId = status.app_id ?? "";
      const appContext = status.app_context === "active" ? "active" : "none";

      if (status.status === "pending") {
        setOllamaContext({ app_id: appId, app_context: appContext });
        setIsAsking(true);
        setOllamaResponse(status.response?.trim() ? status.response : "Thinking...");
        setLastApplied(null);
        setElapsedSeconds(null);
        setStrategyGuideBranches(null);
        setModelPolicyDisclosure(null);
        setPresetCarouselInject(null);
        return;
      }

      if (status.status === "cancelled") {
        setOllamaContext({ app_id: appId, app_context: appContext });
        setIsAsking(false);
        setShortcutSetupVariant(null);
        setOllamaResponse(status.response?.trim() ? status.response.trim() : "Stopped.");
        setLastApplied(null);
        setElapsedSeconds(Number.isFinite(status.elapsed_seconds) ? status.elapsed_seconds : null);
        setLastExchange(null);
        setStrategyGuideBranches(null);
        setModelPolicyDisclosure(null);
        setPresetCarouselInject(null);
        pendingArchiveTurnRef.current = null;
        pendingThreadQuestionDisplayRef.current = null;
        void refreshInputTransparency();
        return;
      }

      if (status.status === "completed" || status.status === "failed") {
        const applied = status.applied ?? null;
        setOllamaContext({ app_id: appId, app_context: appContext });
        setIsAsking(false);
        setShortcutSetupVariant(
          status.status === "completed" && status.success ? status.shortcut_setup ?? null : null,
        );
        setOllamaResponse(buildResponseText(status.response ?? "No response text.", applied));
        setLastApplied(applied);
        setElapsedSeconds(Number.isFinite(status.elapsed_seconds) ? status.elapsed_seconds : null);

        if (status.status === "completed" && status.success) {
          const q = (status.question || fallbackQuestion || "").trim();
          const answer = buildResponseText(status.response ?? "No response text.", applied);
          const disc = status.model_policy_disclosure;
          setModelPolicyDisclosure(
            disc && typeof disc === "object" && typeof (disc as ModelPolicyDisclosurePayload).model === "string"
              ? (disc as ModelPolicyDisclosurePayload)
              : null,
          );
          setPresetCarouselInject(normalizePresetCarouselInject(status.preset_carousel_inject));
          if (q) {
            const category = detectPromptCategory(q);
            setSuggestedPrompts(getContextualPresets(category, 3));
            const displayQ = (pendingThreadQuestionDisplayRef.current?.trim() || q).trim();
            pendingThreadQuestionDisplayRef.current = null;
            setLastExchange({ question: displayQ, answer });
            lastStrategyAskQuestionRef.current = q;
            setStrategyGuideBranches(normalizeStrategyGuideBranches(status.strategy_guide_branches));
            setLastStrategySpoilerConsentEffective(status.strategy_spoiler_consent_effective === true);

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
            setLastStrategySpoilerConsentEffective(false);
            pendingArchiveTurnRef.current = null;
            pendingThreadQuestionDisplayRef.current = null;
          }
        } else {
          setLastExchange(null);
          setStrategyGuideBranches(null);
          setModelPolicyDisclosure(null);
          setPresetCarouselInject(null);
          setLastStrategySpoilerConsentEffective(false);
          pendingArchiveTurnRef.current = null;
          pendingThreadQuestionDisplayRef.current = null;
        }
      void refreshInputTransparency();
      return;
    }

    setOllamaContext(null);
    setIsAsking(false);
    setPresetCarouselInject(null);
  },
    [refreshInputTransparency],
  );

  const strategySpoilerDefaultExpandedForReply = useMemo(
    () => a.strategySpoilerAutoRevealAfterConsent && lastStrategySpoilerConsentEffective,
    [a.strategySpoilerAutoRevealAfterConsent, lastStrategySpoilerConsentEffective],
  );

  const onBackgroundPollError = useCallback((e: unknown) => {
    setIsAsking(false);
    setOllamaResponse(`Error: ${formatDeckyRpcError(e)}`);
    setLastApplied(null);
    setOllamaContext(null);
    setLastExchange(null);
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setPresetCarouselInject(null);
    setShortcutSetupVariant(null);
    pendingArchiveTurnRef.current = null;
    pendingThreadQuestionDisplayRef.current = null;
    setLastStrategySpoilerConsentEffective(false);
  }, []);

  const {
    startNextRequest,
    invalidateRequests,
    startBackgroundStatusPolling,
    isRequestActive,
  } = useBackgroundGameAi(applyBackgroundStatusToUi, onBackgroundPollError);

  useEffect(() => {
    const seq = startNextRequest();

    call<[], BackgroundRequestStatus>("get_background_game_ai_status")
      .then((status) => {
        if (!isRequestActive(seq)) return;
        applyBackgroundStatusToUi(status);
        if (status.status === "pending") {
          startBackgroundStatusPolling(seq, status.question ?? "");
        }
      })
      .catch(() => {
        // Best-effort restore only; keep startup quiet if backend status isn't available.
      });
  }, [applyBackgroundStatusToUi, isRequestActive, startBackgroundStatusPolling, startNextRequest]);

  const clearUnifiedInput = useCallback(() => {
    if (isAsking) {
      invalidateRequests();
      setIsAsking(false);
    }
    a.setUnifiedInput("");
    a.setSelectedIndex(-1);
    a.setNavigationMessage("");
    setOllamaResponse("");
    setOllamaContext(null);
    setLastApplied(null);
    setLastExchange(null);
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setPresetCarouselInject(null);
    setShortcutSetupVariant(null);
    a.setSelectedAttachment(null);
    setElapsedSeconds(null);
    setShowSlowWarning(false);
  }, [a, invalidateRequests, isAsking]);

  const onCancelAsk = useCallback(() => {
    void call<[], { ok?: boolean }>("abort_background_game_ai").catch(() => {
      /* best-effort RPC */
    });
    invalidateRequests();
    setIsAsking(false);
    setOllamaResponse("Request cancelled.");
    setOllamaContext(null);
    setLastApplied(null);
    setElapsedSeconds(null);
    setShowSlowWarning(false);
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setPresetCarouselInject(null);
    setShortcutSetupVariant(null);
  }, [invalidateRequests]);

  const onAskOllama = useCallback(
    async (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      await new Promise((r) => setTimeout(r, 50));

      const q = (overrideQuestion ?? a.unifiedInput).trim();
      const ip = a.effectiveOllamaPcIp;
      if (!q || !ip) {
        if (!ip) {
          toaster.toast({ title: "PC IP required", body: "Set your Ollama PC IP before asking.", duration: 4000 });
        } else if (!q) {
          toaster.toast({
            title: "Question required",
            body: "Type a question in the ask field first.",
            duration: 3500,
          });
        }
        return;
      }

      const arch = pendingArchiveTurnRef.current;
      if (arch && arch.question.trim() && arch.answer.trim()) {
        setAskThreadCollapsed((prev) => [
          ...prev,
          { id: `turn-${Date.now()}-${prev.length}`, question: arch.question, answer: arch.answer },
        ]);
        lastFlushedExchangeQuestionRef.current = arch.question.trim();
      }
      pendingArchiveTurnRef.current = null;
      setAskThreadViewIndex(null);
      pendingThreadQuestionDisplayRef.current = opts?.threadQuestionDisplay?.trim() || null;
      setAskThreadDisplayQuestion(pendingThreadQuestionDisplayRef.current ?? q);

      const attachments = a.selectedAttachment
        ? [
            {
              path: a.selectedAttachment.path,
              name: a.selectedAttachment.name,
              source: a.selectedAttachment.source,
              app_id: a.selectedAttachment.app_id,
            },
          ]
        : [];

      const seq = startNextRequest();

      const runningApp = Router.MainRunningApp;
      const appId = runningApp?.appid?.toString() ?? "";
      const appName = runningApp?.display_name ?? "";

      setIsAsking(true);
      setPresetCarouselInject(null);
      setStrategyGuideBranches(null);
      setModelPolicyDisclosure(null);
      setShortcutSetupVariant(null);
      setLastTransparency(null);
      setOllamaResponse("Thinking...");
      setLastApplied(null);
      setElapsedSeconds(null);
      setOllamaContext({
        app_id: appId,
        app_context: appId ? "active" : "none",
      });
      const spoiler_consent = a.askMode === "strategy" && a.strategySpoilerConsentForNextAsk;
      try {
        const data = await call<
          [
            {
              question: string;
              PcIp: string;
              appId: string;
              appName: string;
              attachments: AskAttachment[];
              ask_mode: AskModeId;
              spoiler_consent: boolean;
            },
          ],
          BackgroundStartResponse
        >("start_background_game_ai", {
          question: q,
          PcIp: ip,
          appId,
          appName,
          attachments,
          ask_mode: a.askMode,
          spoiler_consent,
        });

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
          setOllamaContext({ app_id: appId, app_context: appId ? "active" : "none" });
          void refreshInputTransparency();
          pendingThreadQuestionDisplayRef.current = null;
          toaster.toast({
            title: "Input not sent",
            body: data.response ?? "Blocked by input checks.",
            duration: 5000,
          });
          return;
        }

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
            app_context: (appId ? "active" : "none") as "active" | "none",
            success: true,
            response: data.response ?? "",
            applied: data.applied ?? null,
            elapsed_seconds: Number.isFinite(data.elapsed_seconds) ? Number(data.elapsed_seconds) : 0,
            error: null,
            started_at: now,
            completed_at: now,
            strategy_guide_branches: null,
            model_policy_disclosure: null,
            strategy_spoiler_consent_effective: false,
            shortcut_setup: data.shortcut_setup ?? null,
          };
          applyBackgroundStatusToUi(terminal, "");
          a.saveIp(ip);
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
            const key = q.trim().toLowerCase();
            if (key === INPUT_SANITIZER_COMMAND_DISABLE.toLowerCase()) {
              a.setInputSanitizerUserDisabled(true);
            } else if (key === INPUT_SANITIZER_COMMAND_ENABLE.toLowerCase()) {
              a.setInputSanitizerUserDisabled(false);
            }
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

        a.saveIp(ip);
        if (a.unifiedInputPersistenceMode === "persist_search_only") {
          a.persistSearchQuery("");
        }
        startBackgroundStatusPolling(seq, q);
      } catch (e: unknown) {
        if (!isRequestActive(seq)) return;
        setIsAsking(false);
        setOllamaResponse(`Error: ${formatDeckyRpcError(e)}`);
        setLastApplied(null);
        setOllamaContext(null);
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
    ],
  );

  const onStrategyBranchPick = useCallback(
    (opt: { id: string; label: string }) => {
      if (isStrategyCustomResolutionBranch(opt)) {
        setStrategyGuideBranches(null);
        a.setUnifiedInput(CUSTOM_RESOLUTION_INPUT_PREFIX);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const root = a.unifiedInputFieldLayerRef.current ?? a.unifiedInputHostRef.current;
            if (!root) return;
            const field = root.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input");
            if (!field) return;
            field.focus();
            const len = field.value.length;
            try {
              field.setSelectionRange(len, len);
            } catch {
              // decky field quirks
            }
          });
        });
        return;
      }
      if (lastExchange?.question?.trim() && lastExchange?.answer?.trim()) {
        const qn = lastExchange.question.trim();
        if (lastFlushedExchangeQuestionRef.current !== qn) {
          pendingArchiveTurnRef.current = {
            question: lastExchange.question,
            answer: lastExchange.answer,
          };
        }
      }
      const prior = lastStrategyAskQuestionRef.current.trim();
      const composed = [
        `${STRATEGY_FOLLOWUP_PREFIX} I'm at: ${opt.label}.`,
        prior ? `Earlier I asked: ${prior}` : "",
        "",
        "Give controller-friendly coaching for this exact point, then end with **If you want to cheat…** as instructed.",
      ]
        .filter((line) => line.length > 0)
        .join("\n");
      a.setUnifiedInput(composed);
      void onAskOllama(composed, { threadQuestionDisplay: `I'm at: ${opt.label}` });
    },
    [a, lastExchange, onAskOllama],
  );

  const resetAskSessionSlice = useCallback(() => {
    if (isAsking) {
      invalidateRequests();
      setIsAsking(false);
    }
    setOllamaResponse("");
    setOllamaContext(null);
    setLastApplied(null);
    setLastExchange(null);
    setStrategyGuideBranches(null);
    setElapsedSeconds(null);
    setShowSlowWarning(false);
    setAskThreadCollapsed([]);
    setAskThreadViewIndex(null);
    setAskThreadDisplayQuestion("");
    setLastTransparency(null);
    setModelPolicyDisclosure(null);
    setPresetCarouselInject(null);
    setShortcutSetupVariant(null);
    pendingArchiveTurnRef.current = null;
    pendingThreadQuestionDisplayRef.current = null;
    lastFlushedExchangeQuestionRef.current = "";
    setLastStrategySpoilerConsentEffective(false);
  }, [invalidateRequests, isAsking]);

  return {
    ollamaResponse,
    ollamaContext,
    lastExchange,
    strategyGuideBranches,
    modelPolicyDisclosure,
    lastStrategySpoilerConsentEffective,
    presetCarouselInject,
    shortcutSetupVariant,
    suggestedPrompts,
    showSlowWarning,
    setShowSlowWarning,
    elapsedSeconds,
    lastTransparency,
    setLastTransparency,
    askThreadCollapsed,
    setAskThreadCollapsed,
    askThreadViewIndex,
    setAskThreadViewIndex,
    askThreadDisplayQuestion,
    setAskThreadDisplayQuestion,
    isAsking,
    lastApplied,
    refreshInputTransparency,
    strategySpoilerDefaultExpandedForReply,
    startNextRequest,
    invalidateRequests,
    clearUnifiedInput,
    onCancelAsk,
    onAskOllama,
    onStrategyBranchPick,
    resetAskSessionSlice,
    setStrategyGuideBranches,
    setSuggestedPrompts,
  };
}
