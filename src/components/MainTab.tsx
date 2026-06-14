import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { toaster } from "@decky/api";
import { PanelSection, PanelSectionRow, TextField, Button, Focusable, Router } from "@decky/ui";
import type { PresetPrompt } from "../data/presets";
import { MainTabPresetAnimatedChips } from "./MainTabPresetAnimatedChips";
import {
  ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
  ASK_LABEL_COLOR_50,
  BONSAI_CHAT_AI_BUBBLE_MAX_FRAC,
  UNIFIED_INPUT_ICON_STRIP_PX,
  UNIFIED_TEXT_BODY_MAX_PX,
  UNIFIED_TEXT_FONT_PX,
  UNIFIED_TEXT_LINE_HEIGHT,
  UNIFIED_TEXT_OVERLAY_BOTTOM_GAP_PX,
} from "../features/unified-input/constants";
import {
  getFocusableWithin,
  isLeftNavigationEvent,
  isRightNavigationEvent,
} from "../utils/focusNavigation";
import { formatBytes, formatScreenshotTimestamp, toFileUri } from "../utils/mediaFormat";
import type {
  AppliedResult,
  AskAttachment,
  AskThreadCollapsedTurn,
  OllamaContextUi,
  ScreenshotItem,
  StrategyGuideBranchesPayload,
} from "../types/bonsaiUi";
import {
  AskMicIcon,
  AskStopIcon,
  AttachMediaIcon,
  BackChevronIcon,
  ClearIcon,
  ImageAttachmentIcon,
  RefreshArrowIcon,
  ThinkingSpinnerIcon,
} from "./icons";
import { CharacterRoleplayEmoticon } from "./CharacterRoleplayEmoticon";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { readClipboardText, sanitizeClipboardStashText } from "../utils/clipboardStash";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { formatAppliedTuningBannerText } from "../utils/settingsAndResponse";
import { ASK_MODE_LABELS, ASK_MODE_OUTLINE, type AskModeId } from "../data/askMode";
import {
  disclosureSummaryForSourceClass,
  type ModelPolicyDisclosurePayload,
} from "../data/modelPolicy";
import { MainTabAskModeMenuPopover } from "./MainTabAskModeMenuPopover";
import { joinPresetWithRunningGame } from "../utils/joinPresetWithRunningGame";
import { isPendingPlaceholderResponse } from "../utils/askThinkingPhases";
import { buildReplyActionsElement } from "../utils/buildReplyActionsElement";
import { BonsaiChatSecondaryButton } from "./BonsaiChatSecondaryButton";
import { buildAnswerBubbleElement } from "../utils/buildAnswerBubbleElement";
import { buildTurnHeaderElement } from "../utils/buildTurnHeaderElement";
import { buildCollapsedTurnTitle } from "../utils/chatTurnTitle";
import type { AskThreadExpandedTurnKey } from "../types/bonsaiUi";
import { debugSessionLog } from "../utils/debugSessionLog";
import { describeFocusTarget } from "../utils/focusTrace";
import { useStreamScrollPin } from "../hooks/useStreamScrollPin";
import {
  invokeAnswerBubbleMoveDown,
  invokeAnswerBubbleMoveUp,
} from "../utils/answerBubbleNavRegistry";
import { focusAnswerBubbleAfterHeader } from "../utils/answerBubbleNavigation";
import {
  isDownNavigationEvent,
  isUpNavigationEvent,
} from "../utils/focusNavigation";

const BONSAI_CHAT_AI_MAX_WIDTH_CSS = `min(${Math.round(BONSAI_CHAT_AI_BUBBLE_MAX_FRAC * 100)}%, 100%)`;

export type MainTabProps = {
  fullBleedRowStyle: React.CSSProperties;
  presetButtonSurface: React.CSSProperties;
  suggestedPrompts: PresetPrompt[];
  /** When true, show the green “How to use” chip above the three preset slots. */
  showPluginHelpChip: boolean;
  /** Opens instructions modal and dismisses the help chip for the session. */
  onOpenPluginHelp: () => void;
  /** When false, preset chips omit staggered fade transitions (Settings). */
  presetChipFadeAnimationEnabled?: boolean;
  /** Preset chip animation style (fade / carousel / static). */
  presetChipAnimation?: "fade" | "carousel" | "static";
  /** Re-run the last completed Ask with the same prompt text. */
  onRetryLastResponse?: () => void;
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  unifiedInputHostRef: React.Ref<HTMLDivElement>;
  unifiedInputFieldLayerRef: React.Ref<HTMLDivElement>;
  unifiedInputMeasureRef: React.Ref<HTMLDivElement>;
  attachActionHostRef: React.Ref<HTMLDivElement>;
  askBarHostRef: React.Ref<HTMLDivElement>;
  screenshotBrowserHostRef: React.Ref<HTMLDivElement>;
  unifiedInputSurfacePx: number;
  unifiedInput: string;
  usesNativeMultilineField: boolean;
  setIsUnifiedInputFocused: (v: boolean) => void;
  isUnifiedInputFocused: boolean;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredSettings: string[];
  selectedIndex: number;
  onSettingClick: (settingPath: string, index?: number) => void;
  isAsking: boolean;
  ollamaIp: string;
  onAskOllama: (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => void | Promise<void>;
  onOpenScreenshotBrowser: () => void | Promise<void>;
  onCancelAsk: () => void;
  onMicInput: () => void;
  voiceRecording?: boolean;
  selectedAttachment: AskAttachment | null;
  setSelectedAttachment: React.Dispatch<React.SetStateAction<AskAttachment | null>>;
  clearUnifiedInput: () => void;
  showSearchClearButton: boolean;
  isScreenshotBrowserOpen: boolean;
  onCloseScreenshotBrowser: () => void;
  loadRecentScreenshots: (limit?: number) => Promise<void>;
  mediaError: string;
  recentScreenshots: ScreenshotItem[];
  isLoadingRecentScreenshots: boolean;
  onSelectRecentScreenshot: (item: ScreenshotItem) => void;
  navigationMessage: string;
  isQamSetting: (settingPath: string) => boolean;
  showSlowWarning: boolean;
  latencyWarningSeconds: number;
  ollamaResponse: string;
  elapsedSeconds: number | null;
  lastApplied: AppliedResult | null;
  ollamaContext: OllamaContextUi;
  /** True when the last completed ask succeeded and a Q+A snapshot is available for Desktop save. */
  canSaveDesktopNote: boolean;
  onOpenDesktopNoteSave: () => void;
  /** When false, screenshot attach is blocked (Permissions); control is shown dimmed. */
  mediaLibraryEnabled?: boolean;
  /** When false, Desktop save is blocked (Permissions); control is shown dimmed. */
  desktopNoteSaveEnabled?: boolean;
  /** When true, unified input gets left padding and measure/overlay align for the AI character avatar. */
  aiCharacterPadClass?: boolean;
  /** Emoticon id for the upper-left avatar (`__random__`, `__custom__`, or a catalog preset id). */
  aiCharacterAvatarPresetId?: string | null;
  /** Single-character corner badge on the avatar; null when AI character feature is off. */
  aiCharacterAvatarBadgeLetter?: string | null;
  /** Opens the fullscreen character picker (Settings + main tab avatar). */
  onOpenCharacterPicker?: () => void;
  /** Temporary: set `window.__BONSAI_DEBUG_AI_CHARACTER__ = true` in CEF DevTools to show selection state. */
  aiCharacterDebugLine?: string | null;
  /** Last Ask transparency snapshot from backend (after terminal completion). */
  transparencySnapshot?: TransparencySnapshot | null;
  /** Restore unified Ask text to the raw user input from the snapshot. */
  onRunOriginalAsk?: (rawQuestion: string) => void;
  /** Main-tab inference mode (persisted; drives Ollama model fallback ordering). */
  askMode: AskModeId;
  onAskModeChange: (mode: AskModeId) => void;
  /** When set, show branch buttons below the last Strategy Guide response. */
  strategyGuideBranches?: StrategyGuideBranchesPayload | null;
  onStrategyBranchPick?: (opt: { id: string; label: string }) => void;
  /** When a preset chip requests an Ask mode (e.g. Strategy Guide), apply it here. */
  onPresetPreferAskMode?: (mode: AskModeId) => void;
  /** Session thread: prior completed Q/A pairs (client-only). */
  askThreadCollapsed?: AskThreadCollapsedTurn[];
  /** Latest Ask question text for the live turn title. */
  askThreadDisplayQuestion?: string;
  expandedTurnKey?: AskThreadExpandedTurnKey;
  onTurnActivate?: (key: string | "live") => void;
  /** Last successful Ask model disclosure from the backend (live turn only). */
  modelPolicyDisclosure?: ModelPolicyDisclosurePayload | null;
  /** Opens README model policy section (external nav permission). */
  onOpenModelPolicyReadme?: () => void;
  /** When the last reply was a shortcut-setup keyword, show extra navigation help. */
  shortcutSetupVariant?: "deck" | "stadia" | null;
  /** Opens Steam Controller settings (External/Steam nav permission). */
  onOpenControllerSettings?: () => void;
  strategySpoilerMaskingEnabled?: boolean;
  /** Pyro easter egg: backend-injected suggestion chip (not in normal preset pool). */
  presetCarouselInject?: { text: string } | null;
  /** While true, render one preview chunk instead of D-pad split chunks. */
  isStreamingPreview?: boolean;
  /** Smoothly revealed stream text while ``isStreamingPreview`` is active. */
  streamDisplayText?: string;
  /** Pending Ask phase line from ``<bonsai-status>`` or backend fallback. */
  thinkingSummary?: string | null;
  /** When true, show full Ask diagnostics block (model chain, timing). */
  desktopAskVerboseLogging?: boolean;
  lastRequestId?: number | null;
  lastExchange?: { question: string; answer: string } | null;
};

export function MainTab(props: MainTabProps) {
  const {
    fullBleedRowStyle,
    presetButtonSurface,
    suggestedPrompts,
    showPluginHelpChip,
    onOpenPluginHelp,
    presetChipFadeAnimationEnabled = true,
    presetChipAnimation = "fade",
    onRetryLastResponse,
    setUnifiedInput,
    unifiedInputHostRef,
    unifiedInputFieldLayerRef,
    unifiedInputMeasureRef,
    attachActionHostRef,
    askBarHostRef,
    screenshotBrowserHostRef,
    unifiedInputSurfacePx,
    unifiedInput,
    usesNativeMultilineField,
    setIsUnifiedInputFocused,
    isUnifiedInputFocused,
    setSelectedIndex,
    filteredSettings,
    selectedIndex,
    onSettingClick,
    isAsking,
    ollamaIp,
    onAskOllama,
    onOpenScreenshotBrowser,
    onCancelAsk,
    onMicInput,
    voiceRecording = false,
    selectedAttachment,
    setSelectedAttachment,
    clearUnifiedInput,
    showSearchClearButton,
    isScreenshotBrowserOpen,
    onCloseScreenshotBrowser,
    loadRecentScreenshots,
    mediaError,
    recentScreenshots,
    isLoadingRecentScreenshots,
    onSelectRecentScreenshot,
    navigationMessage,
    isQamSetting,
    showSlowWarning,
    latencyWarningSeconds,
    ollamaResponse,
    elapsedSeconds,
    lastApplied,
    ollamaContext,
    canSaveDesktopNote,
    onOpenDesktopNoteSave,
    mediaLibraryEnabled = true,
    desktopNoteSaveEnabled = true,
    aiCharacterPadClass = false,
    aiCharacterAvatarPresetId = null,
    aiCharacterAvatarBadgeLetter = null,
    onOpenCharacterPicker,
    aiCharacterDebugLine = null,
    transparencySnapshot = null,
    onRunOriginalAsk,
    askMode,
    onAskModeChange,
    strategyGuideBranches = null,
    onStrategyBranchPick,
    onPresetPreferAskMode,
    askThreadCollapsed = [],
    askThreadDisplayQuestion = "",
    expandedTurnKey = "live",
    onTurnActivate,
    modelPolicyDisclosure = null,
    onOpenModelPolicyReadme,
    shortcutSetupVariant = null,
    onOpenControllerSettings,
    strategySpoilerMaskingEnabled = true,
    presetCarouselInject = null,
    isStreamingPreview = false,
    streamDisplayText = "",
    thinkingSummary = null,
    desktopAskVerboseLogging = false,
    lastRequestId = null,
    lastExchange = null,
  } = props;

  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);
  /** Reserve inject row height while asking so clearing Pyro tip does not snap the preset grid. */
  const hadInjectChipRef = React.useRef(false);
  useEffect(() => {
    if (presetCarouselInject?.text?.trim()) {
      hadInjectChipRef.current = true;
    }
  }, [presetCarouselInject]);
  useEffect(() => {
    if (!isAsking && !presetCarouselInject?.text?.trim()) {
      hadInjectChipRef.current = false;
    }
  }, [isAsking, presetCarouselInject]);
  const showInjectPlaceholder =
    isAsking && hadInjectChipRef.current && !presetCarouselInject?.text?.trim();
  useEffect(() => {
    setTransparencyOpen(false);
    setDiagnosticsOpen(false);
    setFeedbackRating(null);
  }, [transparencySnapshot?.raw_question, transparencySnapshot?.final_response]);

  const noActiveGameContext =
    ollamaContext?.app_context !== "active" || !ollamaContext?.app_id?.trim();

  const onPasteClipboardStash = useCallback(async () => {
    try {
      const raw = await readClipboardText();
      const piece = sanitizeClipboardStashText(raw);
      if (!piece) {
        toaster.toast({ title: "Clipboard empty", body: "", duration: 2500 });
        return;
      }
      setUnifiedInput((prev) => {
        const base = (prev || "").trim();
        return base ? `${base}\n\n${piece}` : piece;
      });
      onCloseScreenshotBrowser();
      toaster.toast({ title: "Pasted from clipboard", body: "", duration: 2200 });
    } catch (e: unknown) {
      toaster.toast({ title: "Clipboard unavailable", body: formatDeckyRpcError(e), duration: 4000 });
    }
  }, [setUnifiedInput, onCloseScreenshotBrowser]);

  const onSendFeedback = useCallback(
    async (rating: "up" | "down") => {
      setFeedbackRating(rating);
      try {
        await callDeckyWithTimeout<[string, number, number, boolean], { ok?: boolean }>(
          "save_ask_feedback",
          [rating, lastRequestId ?? 0, lastExchange?.question?.length ?? 0, true],
          DECKY_RPC_TIMEOUT_MS
        );
        toaster.toast({ title: "Feedback saved locally", body: "", duration: 2500 });
      } catch (e: unknown) {
        toaster.toast({ title: "Feedback not saved", body: formatDeckyRpcError(e), duration: 4000 });
      }
    },
    [lastExchange?.question, lastRequestId]
  );
  /** Persisted or pasted newline-only values push the native textarea caret to line 2 while the placeholder reads on line 1. */
  useEffect(() => {
    if (unifiedInput.trim() === "" && /\n/.test(unifiedInput)) setUnifiedInput("");
  }, [unifiedInput, setUnifiedInput]);
  const askLooksReady = unifiedInput.trim().length > 0 && !isAsking;
  /** Do not gate on `aiCharacterAvatarPresetId` — when the feature is on, `resolveMainTabAvatarPresetId` always yields a display id (including `__random__` / `__custom__`). */
  const showAiCharacterChrome = Boolean(onOpenCharacterPicker && aiCharacterPadClass);
  const liveQuestion = askThreadDisplayQuestion.trim();
  const liveResponseBody = isStreamingPreview ? streamDisplayText : ollamaResponse;
  const showLiveResponse =
    Boolean(liveResponseBody.trim()) &&
    !(isAsking && !isStreamingPreview && isPendingPlaceholderResponse(liveResponseBody));
  const showLiveTurn = Boolean(liveQuestion) || isAsking || showLiveResponse;
  const appliedTuningBannerText = formatAppliedTuningBannerText(lastApplied);

  const chatMainColumnRef = useRef<HTMLDivElement | null>(null);

  useStreamScrollPin(chatMainColumnRef, streamDisplayText, isStreamingPreview);

  useEffect(() => {
    if (!expandedTurnKey) return;
    window.requestAnimationFrame(() => {
      const header = document.querySelector(
        `[data-bonsai-turn-id="${expandedTurnKey}"]`
      ) as HTMLElement | null;
      header?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
    });
  }, [expandedTurnKey]);

  useEffect(() => {
    const col = chatMainColumnRef.current;
    if (!col) return;
    const onFocusIn = (ev: FocusEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target?.closest(".bonsai-chat-main-column")) return;
      const scroll = col.closest('[class*="TabContentsScroll"]') as HTMLElement | null;
      const focus = describeFocusTarget(target);
      // #region agent log
      debugSessionLog("MainTab.tsx:focusin", "focus", "H4", {
        ...focus,
        scrollTop: scroll?.scrollTop ?? null,
        runId: "post-fix-14",
      });
      // #endregion
    };
    col.addEventListener("focusin", onFocusIn, true);

    const onKeyDown = (ev: KeyboardEvent) => {
      if (!col.contains(document.activeElement)) return;
      const active = document.activeElement as HTMLElement | null;
      const onAnswer = Boolean(active?.closest(".bonsai-chat-ai-bubble"));
      const inHeader = Boolean(active?.closest(".bonsai-chat-turn-row-header"));
      if (isDownNavigationEvent(ev)) {
        if (inHeader) {
          const turnId = active
            ?.closest(".bonsai-chat-turn-row-header")
            ?.getAttribute("data-bonsai-turn-id");
          const handled = focusAnswerBubbleAfterHeader(
            active?.closest(".bonsai-chat-turn-row-header") as HTMLElement | null,
            turnId ?? undefined
          );
          // #region agent log
          debugSessionLog("MainTab.tsx:keydown", "header keydown down fallback", "H20", {
            handled,
            turnId,
            runId: "post-fix-14",
          });
          // #endregion
          if (handled) {
            ev.preventDefault();
            ev.stopPropagation();
          }
          return;
        }
        if (!onAnswer) return;
        const handled = invokeAnswerBubbleMoveDown();
        // #region agent log
        debugSessionLog("MainTab.tsx:keydown", "answer keydown down fallback", "H9", {
          handled,
          key: ev.key,
          code: ev.code,
          runId: "post-fix-14",
        });
        // #endregion
        if (handled) {
          ev.preventDefault();
          ev.stopPropagation();
        }
      } else if (isUpNavigationEvent(ev)) {
        if (!onAnswer) return;
        const handled = invokeAnswerBubbleMoveUp();
        // #region agent log
        debugSessionLog("MainTab.tsx:keydown", "answer keydown up fallback", "H9", {
          handled,
          key: ev.key,
          code: ev.code,
          runId: "post-fix-14",
        });
        // #endregion
        if (handled) {
          ev.preventDefault();
          ev.stopPropagation();
        }
      }
    };
    col.addEventListener("keydown", onKeyDown, true);

    return () => {
      col.removeEventListener("focusin", onFocusIn, true);
      col.removeEventListener("keydown", onKeyDown, true);
    };
  }, [askThreadCollapsed.length, expandedTurnKey]);

  const renderAnswerBubble = (body: string, streaming: boolean, answerKey: string) => {
    return buildAnswerBubbleElement({
      body,
      streaming,
      spoilerMaskingEnabled: strategySpoilerMaskingEnabled,
      maxWidthCss: BONSAI_CHAT_AI_MAX_WIDTH_CSS,
      answerKey,
    });
  };
  const focusUnifiedTextField = React.useCallback((): boolean => {
    const layer =
      unifiedInputFieldLayerRef &&
      typeof unifiedInputFieldLayerRef === "object" &&
      "current" in unifiedInputFieldLayerRef
        ? (unifiedInputFieldLayerRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const field = layer?.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input");
    if (!field) return false;
    field.focus();
    return true;
  }, [unifiedInputFieldLayerRef]);
  const focusAttachPaperclip = React.useCallback((): boolean => {
    const host =
      attachActionHostRef &&
      typeof attachActionHostRef === "object" &&
      "current" in attachActionHostRef
        ? (attachActionHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const btn = host?.querySelector<HTMLElement>("button.bonsai-unified-input-corner-left");
    if (!btn) return false;
    btn.focus();
    return true;
  }, [attachActionHostRef]);
  const focusAiCharacterAvatar = React.useCallback((): boolean => {
    if (!showAiCharacterChrome) return false;
    const layer =
      unifiedInputFieldLayerRef &&
      typeof unifiedInputFieldLayerRef === "object" &&
      "current" in unifiedInputFieldLayerRef
        ? (unifiedInputFieldLayerRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const avatar = layer?.querySelector<HTMLElement>(".bonsai-ai-character-avatar");
    if (!avatar) return false;
    avatar.focus();
    return true;
  }, [showAiCharacterChrome, unifiedInputFieldLayerRef]);
  const presetCarouselHostRef = React.useRef<HTMLDivElement | null>(null);
  const askModeMenuAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const askModeMenuFirstItemRef = React.useRef<HTMLElement | null>(null);
  const [askModeMenuOpen, setAskModeMenuOpen] = useState(false);
  /** Deck delivers many OK/click events per physical tap; collapse to one toggle per gesture. */
  const askModeToggleOnceRef = React.useRef(false);
  const toggleAskModeMenu = React.useCallback(() => {
    if (askModeToggleOnceRef.current) return;
    askModeToggleOnceRef.current = true;
    setAskModeMenuOpen((o) => !o);
    queueMicrotask(() => {
      askModeToggleOnceRef.current = false;
    });
  }, []);
  const closeAskModeMenu = React.useCallback(() => {
    setAskModeMenuOpen(false);
  }, []);
  /*
   * Deck CEF (Chromium < 105) does not support :has(), so the stylesheet cannot key ancestor
   * unclip/z-order rules off the open menu. Toggle an explicit class on the scope root instead.
   */
  useLayoutEffect(() => {
    const hostEl =
      unifiedInputHostRef && typeof unifiedInputHostRef === "object" && "current" in unifiedInputHostRef
        ? (unifiedInputHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const scope = hostEl?.closest(".bonsai-scope");
    if (!scope) return;
    scope.classList.toggle("bonsai-ask-menu-open-scope", askModeMenuOpen);
    return () => scope.classList.remove("bonsai-ask-menu-open-scope");
  }, [askModeMenuOpen, unifiedInputHostRef]);
  const focusFirstPresetChip = React.useCallback((): boolean => {
    const host = presetCarouselHostRef.current;
    const help = host?.querySelector<HTMLElement>("button.bonsai-preset-help-chip");
    if (help) {
      help.focus();
      return true;
    }
    const btn =
      host?.querySelector<HTMLElement>(
        ".bonsai-preset-carousel-slot--focus button.bonsai-preset-glass",
      ) ??
      host?.querySelector<HTMLElement>(
        '.bonsai-preset-carousel-slot[data-bonsai-preset-visible="true"] button.bonsai-preset-glass',
      );
    if (!btn) return false;
    btn.focus();
    return true;
  }, []);
  const focusAskPrimary = React.useCallback((): boolean => {
    const host =
      askBarHostRef &&
      typeof askBarHostRef === "object" &&
      "current" in askBarHostRef
        ? (askBarHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const btn = host?.querySelector<HTMLElement>("button.bonsai-ask-primary");
    if (!btn) return false;
    btn.focus();
    return true;
  }, [askBarHostRef]);
  const focusMicOrStop = React.useCallback((): boolean => {
    const host =
      attachActionHostRef &&
      typeof attachActionHostRef === "object" &&
      "current" in attachActionHostRef
        ? (attachActionHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const btn = host?.querySelector<HTMLElement>("button.bonsai-unified-input-corner-right");
    if (!btn) return false;
    btn.focus();
    return true;
  }, [attachActionHostRef]);
  const focusAskModeButton = React.useCallback((): boolean => {
    const host =
      attachActionHostRef &&
      typeof attachActionHostRef === "object" &&
      "current" in attachActionHostRef
        ? (attachActionHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const btn = host?.querySelector<HTMLElement>("button.bonsai-ask-mode-trigger");
    if (!btn) return false;
    btn.focus();
    return true;
  }, [attachActionHostRef]);
  const unifiedInputDeckNavHandlers = React.useMemo(
    () =>
      ({
        onMoveUp: () => focusFirstPresetChip(),
        onMoveLeft: () => focusAttachPaperclip(),
        onMoveDown: () => focusAskPrimary(),
        onMoveRight: () => focusAskModeButton(),
      }) as Record<string, unknown>,
    [focusAskPrimary, focusAttachPaperclip, focusFirstPresetChip, focusAskModeButton],
  );
  const avatarDeckNavHandlers = React.useMemo(
    () =>
      ({
        /** Deck focus-graph: horizontal move from avatar into the unified text field. */
        onMoveRight: () => focusUnifiedTextField(),
        /** Deck focus-graph: vertical move skips the textarea and lands on the attach control under the avatar. */
        onMoveDown: () => focusAttachPaperclip(),
      }) as Record<string, unknown>,
    [focusAttachPaperclip, focusUnifiedTextField],
  );
  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <div
            ref={presetCarouselHostRef}
            className="bonsai-full-bleed-row bonsai-preset-row-host"
            style={{ display: "grid", gap: 8, minWidth: 0, width: "100%", boxSizing: "border-box" }}
          >
            {showPluginHelpChip && (
              <Button
                className="bonsai-preset-glass bonsai-preset-help-chip"
                {...({
                  onMoveDown: () => focusUnifiedTextField(),
                } as Record<string, unknown>)}
                onClick={() => onOpenPluginHelp()}
                style={{
                  width: "100%",
                  minHeight: 34,
                  fontSize: 12,
                }}
                aria-label="How to use bonsAI — open quick start"
              >
                How to use bonsAI
              </Button>
            )}
            <MainTabPresetAnimatedChips
              seeds={suggestedPrompts}
              setUnifiedInput={setUnifiedInput}
              fadeAnimationEnabled={presetChipAnimation === "fade" && presetChipFadeAnimationEnabled}
              animationMode={presetChipAnimation}
              onPreferAskMode={onPresetPreferAskMode}
              onCarouselExitDown={focusUnifiedTextField}
            />
            {presetCarouselInject?.text?.trim() ? (
              <Button
                className="bonsai-preset-glass bonsai-pyro-inject-chip"
                focusable
                onClick={() => {
                  const gameName = Router.MainRunningApp?.display_name ?? "";
                  const t = presetCarouselInject.text.trim();
                  setUnifiedInput(gameName ? joinPresetWithRunningGame(t, gameName) : t);
                }}
                style={{
                  width: "100%",
                  minHeight: 34,
                  fontSize: 12,
                  color: "#c4d3e2",
                }}
                aria-label="Agent suggestion"
              >
                {presetCarouselInject.text.trim()}
              </Button>
            ) : showInjectPlaceholder ? (
              <div
                aria-hidden
                className="bonsai-preset-inject-placeholder"
                style={{ minHeight: 34, visibility: "hidden" }}
              />
            ) : null}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div
            ref={unifiedInputHostRef}
            className={
              "bonsai-unified-input-host bonsai-glass-panel bonsai-full-bleed-row" +
              (aiCharacterPadClass ? " bonsai-unified-input--ai-character" : "") +
              (askModeMenuOpen ? " bonsai-ask-mode-menu-open" : "")
            }
            style={fullBleedRowStyle}
          >
            <div
              ref={unifiedInputFieldLayerRef}
              style={{
                position: "relative",
                width: "100%",
                minHeight: unifiedInputSurfacePx + UNIFIED_INPUT_ICON_STRIP_PX,
                overflow: askModeMenuOpen ? "visible" : undefined,
              }}
            >
              <div
                ref={unifiedInputMeasureRef}
                className="bonsai-unified-input-measure"
                aria-hidden
                style={{
                  position: "absolute",
                  visibility: "hidden",
                  pointerEvents: "none",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  lineHeight: UNIFIED_TEXT_LINE_HEIGHT,
                  fontSize: UNIFIED_TEXT_FONT_PX,
                }}
              >
                {unifiedInput || "\u00a0"}
              </div>
              {showAiCharacterChrome && (
                <div
                  style={{ position: "absolute", top: 2, left: 2, zIndex: 6, width: 18, height: 18 }}
                  onKeyDownCapture={(ev) => {
                    if (!isRightNavigationEvent(ev)) return;
                    if (!(ev.target as HTMLElement).closest?.(".bonsai-ai-character-avatar")) return;
                    ev.preventDefault();
                    ev.stopPropagation();
                    focusUnifiedTextField();
                  }}
                >
                  <Focusable
                    className="bonsai-ai-character-avatar"
                    aria-label={
                      aiCharacterAvatarBadgeLetter
                        ? `Choose AI character, ${aiCharacterAvatarBadgeLetter}`
                        : "Choose AI character"
                    }
                    {...avatarDeckNavHandlers}
                    onClick={() => onOpenCharacterPicker?.()}
                    onActivate={() => {
                      onOpenCharacterPicker?.();
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      minWidth: 18,
                      minHeight: 18,
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 4,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      boxShadow: "none",
                      backdropFilter: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    <CharacterRoleplayEmoticon
                      key={aiCharacterAvatarPresetId ?? "__custom__"}
                      presetId={aiCharacterAvatarPresetId ?? "__custom__"}
                      size={18}
                      badgeLetter={aiCharacterAvatarBadgeLetter}
                    />
                  </Focusable>
                </div>
              )}
              {showAiCharacterChrome && aiCharacterDebugLine ? (
                <div
                  className="bonsai-ai-character-debug"
                  style={{
                    position: "absolute",
                    left: -5,
                    top: 16,
                    zIndex: 6,
                    maxWidth: "min(100vw - 48px, 280px)",
                    fontSize: 9,
                    lineHeight: 1.15,
                    color: "rgba(160, 220, 180, 0.95)",
                    wordBreak: "break-word",
                    pointerEvents: "none",
                    fontFamily: "monospace",
                  }}
                >
                  {aiCharacterDebugLine}
                </div>
              ) : null}
              <TextField
                label=""
                value={unifiedInput}
                spellCheck={false}
                {...({ multiline: true, rows: 3 } as unknown as Record<string, unknown>)}
                {...(askMode === "strategy"
                  ? ({
                      placeholder: "Describe the level, boss, or puzzle you're stuck on.",
                    } as Record<string, unknown>)
                  : {})}
                {...unifiedInputDeckNavHandlers}
                style={{
                  width: "100%",
                  minHeight: unifiedInputSurfacePx,
                  height: unifiedInputSurfacePx,
                  maxHeight: UNIFIED_TEXT_BODY_MAX_PX,
                  overflow: "auto",
                  fontSize: UNIFIED_TEXT_FONT_PX,
                  lineHeight: UNIFIED_TEXT_LINE_HEIGHT,
                  color: usesNativeMultilineField ? "rgba(236, 244, 252, 0.98)" : "transparent",
                  caretColor: usesNativeMultilineField ? "white" : "transparent",
                }}
                onFocus={() => { setIsUnifiedInputFocused(true); }}
                onBlur={() => { setIsUnifiedInputFocused(false); }}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                  let next = e.target.value;
                  /* Collapse newline-only “empty” values so the caret stays on the first line (native textarea + placeholder). */
                  if (next.trim() === "" && /\n/.test(next)) next = "";
                  setUnifiedInput(next);
                  setSelectedIndex(-1);
                }}
                onKeyDown={(ev: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                  if (ev.key === "ArrowDown") {
                    if (filteredSettings.length > 0) {
                      setSelectedIndex((prev) => Math.min(prev + 1, filteredSettings.length - 1));
                      ev.preventDefault();
                    }
                    return;
                  }
                  if (ev.key === "ArrowUp") {
                    if (filteredSettings.length > 0) {
                      setSelectedIndex((prev) => Math.max(prev - 1, 0));
                      ev.preventDefault();
                    }
                    return;
                  }
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    const hasSelectedResult = selectedIndex >= 0 && selectedIndex < filteredSettings.length;
                    if (hasSelectedResult) {
                      onSettingClick(filteredSettings[selectedIndex], selectedIndex);
                      return;
                    }
                    if (!isAsking && unifiedInput.trim() && ollamaIp.trim()) {
                      (ev.currentTarget as HTMLElement).blur();
                      onAskOllama();
                    }
                  }
                }}
              />
              {!usesNativeMultilineField && (
                <div
                  className="bonsai-unified-input-text-overlay"
                  style={{
                    pointerEvents: "none",
                    position: "absolute",
                    bottom: UNIFIED_INPUT_ICON_STRIP_PX + UNIFIED_TEXT_OVERLAY_BOTTOM_GAP_PX,
                    color: isUnifiedInputFocused ? "rgba(248, 250, 252, 0.98)" : "rgba(220, 232, 244, 0.95)",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: UNIFIED_TEXT_LINE_HEIGHT,
                    fontSize: UNIFIED_TEXT_FONT_PX,
                  }}
                >
                  {!unifiedInput.trim() && askMode === "strategy" ? (
                    <>
                      {/*
                        Caret must precede the long strategy placeholder: if the caret follows the
                        placeholder as an inline sibling, a wrapped placeholder leaves the caret alone
                        on the next line (Deck / narrow QAM).
                      */}
                      {isUnifiedInputFocused && <span className="bonsai-unified-input-fake-caret" aria-hidden>|</span>}
                      <span className="bonsai-unified-input-strategy-placeholder">
                        Describe the level, boss, or puzzle you're stuck on.
                      </span>
                    </>
                  ) : (
                    <>
                      {unifiedInput}
                      {isUnifiedInputFocused && <span className="bonsai-unified-input-fake-caret" aria-hidden>|</span>}
                    </>
                  )}
                </div>
              )}
              <div
                ref={attachActionHostRef}
                className="bonsai-unified-input-bottom-actions"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: UNIFIED_INPUT_ICON_STRIP_PX,
                  zIndex: 25,
                  margin: 0,
                  padding: 0,
                  boxSizing: "border-box",
                }}
              >
                <Focusable
                  className="bonsai-unified-input-actions-row"
                  flow-children="horizontal"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "nowrap",
                    width: "100%",
                    height: "100%",
                    alignItems: "flex-end",
                    justifyContent: "flex-start",
                    margin: 0,
                    padding: 0,
                  }}
                >
                  <Button
                    className="bonsai-askbar-target bonsai-unified-input-corner-left"
                    {...({
                      onMoveRight: () => focusAskModeButton(),
                      ...(showAiCharacterChrome ? { onMoveUp: () => focusAiCharacterAvatar() } : {}),
                    } as Record<string, unknown>)}
                    onClick={onOpenScreenshotBrowser}
                    disabled={isAsking}
                    aria-label="Attach screenshot or paste from clipboard"
                    style={{
                      minWidth: 20,
                      width: 20,
                      minHeight: 20,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 0,
                      border: "none",
                      background: "transparent",
                      color: "#dbe6f3",
                      flexShrink: 0,
                      opacity: mediaLibraryEnabled ? 1 : 0.45,
                    }}
                  >
                    <span
                      style={{
                        position: "relative",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span className="bonsai-askbar-corner-icon">
                        <AttachMediaIcon size={15} />
                      </span>
                      {selectedAttachment && (
                        <span
                          style={{
                            position: "absolute",
                            right: -8,
                            top: -8,
                            minWidth: 14,
                            height: 14,
                            borderRadius: 999,
                            background: "#dfeaf6",
                            color: "#1d2a38",
                            fontSize: 9,
                            lineHeight: "14px",
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                        >
                          1
                        </span>
                      )}
                    </span>
                  </Button>
                  <Focusable
                    className="bonsai-unified-input-actions-right"
                    flow-children="horizontal"
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      flexWrap: "nowrap",
                      alignItems: "flex-end",
                      justifyContent: "flex-end",
                      gap: 5,
                      flexShrink: 0,
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    <div ref={askModeMenuAnchorRef} style={{ display: "inline-flex", flexShrink: 0, position: "relative" }}>
                    <Button
                      className="bonsai-askbar-target bonsai-ask-mode-trigger"
                      {...({
                        onMoveLeft: () => focusAttachPaperclip(),
                        onMoveRight: () => focusMicOrStop(),
                        ...(askModeMenuOpen
                          ? {
                              onMoveDown: () => {
                                askModeMenuFirstItemRef.current?.focus();
                                return true;
                              },
                            }
                          : {}),
                        onOKButton: (evt: { stopPropagation: () => void }) => {
                          evt.stopPropagation();
                          toggleAskModeMenu();
                        },
                      } as Record<string, unknown>)}
                      onClick={toggleAskModeMenu}
                      aria-expanded={askModeMenuOpen}
                      aria-haspopup="menu"
                      aria-label={`Inference mode: ${ASK_MODE_LABELS[askMode]}. Open to change.`}
                      style={{
                        minHeight: 20,
                        height: 20,
                        padding: "0 5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 3,
                        border: `1px solid ${ASK_MODE_OUTLINE[askMode]}`,
                        background: "transparent",
                        color: ASK_LABEL_COLOR_50,
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 600,
                        fontVariant: "small-caps",
                        letterSpacing: 0.15,
                        lineHeight: 1,
                        maxWidth: 76,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        boxSizing: "border-box",
                      }}
                    >
                      {ASK_MODE_LABELS[askMode]}
                    </Button>
                    </div>
                    {isAsking ? (
                      <Button
                        className="bonsai-askbar-target bonsai-unified-input-corner-right"
                        {...({
                          onMoveLeft: () => focusAskModeButton(),
                          onOKButton: (evt: { stopPropagation: () => void }) => {
                            evt.stopPropagation();
                            onCancelAsk();
                          },
                        } as Record<string, unknown>)}
                        onClick={onCancelAsk}
                        aria-label="Stop generation"
                        style={{
                          minWidth: 20,
                          width: 20,
                          minHeight: 20,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 0,
                          border: "none",
                          background: "transparent",
                          flexShrink: 0,
                          transform: "translateX(2px)",
                        }}
                      >
                        <span className="bonsai-unified-input-icon">
                          <AskStopIcon size={20} />
                        </span>
                      </Button>
                    ) : voiceRecording ? (
                      <Button
                        className="bonsai-askbar-target bonsai-unified-input-corner-right bonsai-voice-recording-active"
                        {...({
                          onMoveLeft: () => focusAskModeButton(),
                          onOKButton: (evt: { stopPropagation: () => void }) => {
                            evt.stopPropagation();
                            onMicInput();
                          },
                        } as Record<string, unknown>)}
                        onClick={onMicInput}
                        aria-label="Stop voice input"
                        style={{
                          minWidth: 20,
                          width: 20,
                          minHeight: 20,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 0,
                          border: "none",
                          background: "transparent",
                          color: "#f87171",
                          flexShrink: 0,
                          transform: "translateX(2px)",
                        }}
                      >
                        <span className="bonsai-unified-input-icon">
                          <AskStopIcon size={16} />
                        </span>
                      </Button>
                    ) : (
                      <Button
                        className="bonsai-askbar-target bonsai-unified-input-corner-right"
                        {...({
                          onMoveLeft: () => focusAskModeButton(),
                          onOKButton: (evt: { stopPropagation: () => void }) => {
                            evt.stopPropagation();
                            onMicInput();
                          },
                        } as Record<string, unknown>)}
                        onClick={onMicInput}
                        aria-label="Voice input"
                        style={{
                          minWidth: 20,
                          width: 20,
                          minHeight: 20,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 0,
                          border: "none",
                          background: "transparent",
                          color: "#dbe6f3",
                          flexShrink: 0,
                          transform: "translateX(2px)",
                        }}
                      >
                        <span className="bonsai-unified-input-icon">
                          <AskMicIcon size={16} />
                        </span>
                      </Button>
                    )}
                  </Focusable>
                </Focusable>
              </div>
              <MainTabAskModeMenuPopover
                open={askModeMenuOpen}
                anchorRef={askModeMenuAnchorRef}
                hostRef={unifiedInputHostRef as React.RefObject<HTMLElement | null>}
                firstMenuItemRef={askModeMenuFirstItemRef}
                selectedId={askMode}
                onSelect={onAskModeChange}
                onRequestClose={closeAskModeMenu}
                onFocusModeChip={focusAskModeButton}
              />
            </div>
          </div>
        </PanelSectionRow>
        {selectedAttachment && (
          <PanelSectionRow>
            <div
              className="bonsai-full-bleed-row"
              onKeyDownCapture={(ev: React.KeyboardEvent<HTMLDivElement>) => {
                const activeEl = document.activeElement as HTMLElement | null;
                const previewActive = Boolean(activeEl?.closest(".bonsai-attachment-preview-target"));
                const removeActive = Boolean(activeEl?.closest(".bonsai-attachment-remove-target"));
                if (isRightNavigationEvent(ev) && previewActive) {
                  const removeTarget = getFocusableWithin(".bonsai-attachment-remove-target");
                  if (removeTarget) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    removeTarget.focus();
                  }
                  return;
                }
                if (isLeftNavigationEvent(ev) && removeActive) {
                  const previewTarget = getFocusableWithin(".bonsai-attachment-preview-target");
                  if (previewTarget) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    previewTarget.focus();
                  }
                  return;
                }
              }}
              style={{ ...fullBleedRowStyle, display: "flex", flexDirection: "column", gap: 6 }}
            >
              <Focusable
                flow-children="horizontal"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 38,
                  borderRadius: 8,
                  border: "1px solid rgba(150, 187, 223, 0.62)",
                  background: "linear-gradient(180deg, rgba(64, 93, 124, 0.42) 0%, rgba(48, 71, 95, 0.42) 100%)",
                  color: "#e3edf7",
                  padding: "5px 8px",
                }}
              >
                <Button
                  className="bonsai-attachment-preview-target"
                  aria-label={`Attached screenshot ${selectedAttachment.name}`}
                  onClick={onOpenScreenshotBrowser}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 30,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 8,
                    border: "none",
                    background: "transparent",
                    color: "#e3edf7",
                    boxShadow: "none",
                  }}
                >
                  <ImageAttachmentIcon size={17} />
                  <img
                    src={selectedAttachment.preview_data_uri || toFileUri(selectedAttachment.path)}
                    alt={selectedAttachment.name}
                    style={{
                      width: 58,
                      height: 34,
                      borderRadius: 4,
                      objectFit: "cover",
                      background: "rgba(255,255,255,0.06)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "#dbe7f3",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedAttachment.name}
                    </span>
                    <span style={{ display: "block", fontSize: 8, color: "#cfdeed", fontWeight: 600, marginTop: 2 }}>
                      {formatBytes(selectedAttachment.size_bytes ?? 0)}
                    </span>
                  </div>
                </Button>
                <Button
                  className="bonsai-attachment-remove-target"
                  onClick={() => setSelectedAttachment(null)}
                  aria-label="Remove attachment"
                  style={{
                    minWidth: 36,
                    width: 36,
                    minHeight: 34,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    background: "transparent",
                    color: "#dce8f4",
                    boxShadow: "none",
                    outline: "none",
                  }}
                >
                  <ClearIcon size={18} />
                </Button>
              </Focusable>
            </div>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <div
            className="bonsai-full-bleed-row bonsai-ask-bleed-wrap"
            style={{ ...fullBleedRowStyle, marginTop: 1 }}
          >
            <div
              ref={askBarHostRef}
              className={`bonsai-askbar-merged bonsai-glass-panel bonsai-askbar-row-host${askLooksReady ? " bonsai-askbar-merged--ready" : ""}`}
              style={{
                position: "relative",
                width: "var(--bonsai-askbar-outer-width, var(--bonsai-search-host-width, 100%))",
                minWidth: "var(--bonsai-askbar-outer-width, var(--bonsai-search-host-width, 100%))",
                minHeight: ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
                borderRadius: 8,
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              <Focusable
                flow-children="horizontal"
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "row",
                  width: "100%",
                  minHeight: ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
                  alignItems: "stretch",
                }}
              >
                <Button
                  className={`bonsai-askbar-target bonsai-ask-primary${askLooksReady ? " bonsai-ask-primary--ready" : ""}`}
                  {...({
                    onOKButton: (evt: { stopPropagation: () => void }) => {
                      if (isAsking) return;
                      evt.stopPropagation();
                      void onAskOllama();
                    },
                  } as Record<string, unknown>)}
                  onClick={() => void onAskOllama()}
                  disabled={isAsking}
                  style={{
                    position: "relative",
                    width: "100%",
                    minHeight: ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
                    boxSizing: "border-box",
                    paddingRight: showSearchClearButton ? 42 : 0,
                    borderRadius: 0,
                    border: "none",
                  }}
                >
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <span className="bonsai-ask-primary-label" style={{ fontWeight: 600, fontVariant: "small-caps", letterSpacing: "0.55px", fontSize: 15, lineHeight: 1 }}>
                      ask
                    </span>
                  </span>
                </Button>
                {showSearchClearButton && (
                  <div
                    className="bonsai-askbar-clear-slot"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 42,
                      zIndex: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "auto",
                    }}
                  >
                    <Button
                      onClick={clearUnifiedInput}
                      aria-label="Clear"
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        background: askLooksReady ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.075)",
                        color: "#c8d4e0",
                        boxShadow: "inset 1px 0 0 rgba(255,255,255,0.1)",
                        transition: "background-color 120ms ease",
                      }}
                    >
                      <span className="bonsai-askbar-corner-icon">
                        <ClearIcon size={22} />
                      </span>
                    </Button>
                  </div>
                )}
              </Focusable>
            </div>
          </div>
        </PanelSectionRow>
        {isScreenshotBrowserOpen && (
          <PanelSectionRow>
            <Focusable
              className="bonsai-full-bleed-row"
              flow-children="vertical"
              ref={screenshotBrowserHostRef}
              onKeyDown={(ev: React.KeyboardEvent<HTMLDivElement>) => {
                if (ev.key === "Escape" || ev.key === "Backspace") {
                  onCloseScreenshotBrowser();
                  ev.preventDefault();
                }
              }}
              style={{
                ...fullBleedRowStyle,
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 8,
                background: "rgba(12, 18, 25, 0.96)",
                padding: 10,
                display: "grid",
                gap: 8,
                minHeight: 320,
                position: "relative",
              }}
            >
              <Focusable flow-children="horizontal" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  onClick={onCloseScreenshotBrowser}
                  aria-label="Back"
                  style={{ minWidth: 52, width: 52, minHeight: 34, padding: 0, ...presetButtonSurface }}
                >
                  <BackChevronIcon size={20} />
                </Button>
                <Button
                  onClick={() => {
                    void onPasteClipboardStash();
                  }}
                  aria-label="Paste from clipboard into Ask field"
                  style={{ minHeight: 34, padding: "0 12px", fontSize: 12, ...presetButtonSurface }}
                >
                  Paste clipboard
                </Button>
                <Button
                  onClick={() => {
                    void loadRecentScreenshots(24);
                  }}
                  disabled={isLoadingRecentScreenshots || !mediaLibraryEnabled}
                  aria-label="Refresh screenshots"
                  style={{ minWidth: 52, width: 52, minHeight: 34, padding: 0, ...presetButtonSurface }}
                >
                  <RefreshArrowIcon size={20} />
                </Button>
              </Focusable>

              {mediaError && (
                <div style={{ color: "#f09a8d", fontSize: 11, lineHeight: 1.35 }}>
                  {mediaError}
                </div>
              )}

              {recentScreenshots.length === 0 && !isLoadingRecentScreenshots ? (
                <div style={{ color: "#9cb0c6", fontSize: 12, lineHeight: 1.4 }}>
                  {mediaLibraryEnabled
                    ? "No recent screenshots found. Open Steam Media and take a screenshot, then refresh — or use Paste clipboard."
                    : "Paste clipboard into Ask, or enable Media library access in Permissions to attach screenshots."}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                    alignContent: "start",
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  {recentScreenshots.map((item) => (
                    <Button
                      key={item.path}
                      onClick={() => onSelectRecentScreenshot(item)}
                      style={{
                        minHeight: 144,
                        ...presetButtonSurface,
                        padding: 6,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        justifyContent: "flex-start",
                        gap: 4,
                        textAlign: "left",
                      }}
                    >
                      <img
                        src={item.preview_data_uri || toFileUri(item.path)}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: 94,
                          objectFit: "cover",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.04)",
                        }}
                      />
                      <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 9, color: "#8ea2b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatScreenshotTimestamp(item.mtime)}
                      </span>
                      <span style={{ fontSize: 10, color: "#d9e6f4", fontWeight: 700 }}>
                        Size: {formatBytes(item.size_bytes ?? 0)}
                      </span>
                    </Button>
                  ))}
                </div>
              )}

            </Focusable>
          </PanelSectionRow>
        )}

        {navigationMessage && (
          <PanelSectionRow>
            <div style={{ color: "#81c784", fontSize: 13 }}>{navigationMessage}</div>
          </PanelSectionRow>
        )}

        {filteredSettings.length > 0 && (
          <div className="bonsai-main-search-results-pane">
            <PanelSectionRow>
              <div style={{ color: "gray", padding: "6px 0", fontSize: 13 }}>Results</div>
            </PanelSectionRow>
            {filteredSettings.map((s, i) => {
              const isQam = isQamSetting(s);
              const isSelected = i === selectedIndex;
              const parts = s.split(">").map((part) => part.trim()).filter(Boolean);
              const title = parts[parts.length - 1] ?? s;
              const breadcrumb = parts.slice(0, -1).join(" > ");
              const compactLine = isQam ? `* QAM > ${title}` : `${title}`;
              const compactSubline = isQam ? `(${breadcrumb})` : breadcrumb;

              return (
                <PanelSectionRow key={i}>
                  <Button
                    onClick={() => onSettingClick(s, i)}
                    style={{
                      width: "100%",
                      minHeight: 28,
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: `1px solid ${isQam ? "rgba(243, 197, 91, 0.3)" : "rgba(255,255,255,0.1)"}`,
                      background: isSelected
                        ? isQam
                          ? "rgba(243, 197, 91, 0.22)"
                          : "rgba(255,255,255,0.14)"
                        : isQam
                          ? "rgba(243, 197, 91, 0.08)"
                          : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? "white" : isQam ? "#f2cf84" : "#d4dbe2", lineHeight: "1.15" }}>
                        {compactLine}
                      </div>
                      {compactSubline && (
                        <div style={{ fontSize: 9, color: isSelected ? "#dfe8ef" : "#9fafbc", lineHeight: "1.1", marginTop: 1 }}>
                          {compactSubline}
                        </div>
                      )}
                    </div>
                  </Button>
                </PanelSectionRow>
              );
            })}
          </div>
        )}

        {(askThreadCollapsed.length > 0 || showLiveTurn) && (
          <PanelSectionRow>
            <div
              ref={chatMainColumnRef}
              className="bonsai-chat-main-column"
              style={{
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              <div className="bonsai-chat-transcript">
                {askThreadCollapsed.map((turn) => (
                  <Focusable
                    key={turn.id}
                    flow-children="vertical"
                    className="bonsai-chat-turn-slot"
                  >
                    {buildTurnHeaderElement({
                      turnId: turn.id,
                      title: buildCollapsedTurnTitle(turn.question),
                      expanded: expandedTurnKey === turn.id,
                      onActivate: () => onTurnActivate?.(turn.id),
                    })}
                    {expandedTurnKey === turn.id
                      ? renderAnswerBubble(turn.answer, false, turn.id)
                      : null}
                  </Focusable>
                ))}
                {showLiveTurn ? (
                  <Focusable key="live" flow-children="vertical" className="bonsai-chat-turn-slot">
                    {buildTurnHeaderElement({
                      turnId: "live",
                      variant: "live",
                      title: buildCollapsedTurnTitle(liveQuestion) || "…",
                      expanded: expandedTurnKey === "live",
                      isStreaming: isStreamingPreview,
                      onActivate: () => onTurnActivate?.("live"),
                    })}
                    {expandedTurnKey === "live" && isAsking && thinkingSummary && !isStreamingPreview ? (
                      <div
                        className="bonsai-chat-status-line bonsai-chat-thinking-line"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "#9fb7d5",
                          fontSize: 12,
                          lineHeight: 1.35,
                          fontStyle: "italic",
                          marginBottom: 8,
                        }}
                      >
                        <ThinkingSpinnerIcon size={14} className="bonsai-thinking-spinner" />
                        {thinkingSummary}
                      </div>
                    ) : null}
                    {expandedTurnKey === "live" && showLiveResponse
                      ? renderAnswerBubble(liveResponseBody, isStreamingPreview, "live")
                      : null}
                    {expandedTurnKey === "live" &&
                    !isAsking &&
                    (lastExchange?.answer?.trim() || onRetryLastResponse)
                      ? buildReplyActionsElement({
                          replyKey: "live",
                          rating: feedbackRating,
                          onRate: (rating) => void onSendFeedback(rating),
                          showFeedback: Boolean(lastExchange?.answer?.trim()),
                          onRetry: onRetryLastResponse ?? undefined,
                          transparencyOpen,
                          onToggleTransparency: transparencySnapshot
                            ? () => setTransparencyOpen((o) => !o)
                            : undefined,
                        })
                      : null}
                    {expandedTurnKey === "live" && shortcutSetupVariant && onOpenControllerSettings ? (
                      <div
                        style={{
                          marginTop: 10,
                          maxWidth: BONSAI_CHAT_AI_MAX_WIDTH_CSS,
                        }}
                      >
                        <Button onClick={onOpenControllerSettings}>Open Controller settings</Button>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: "rgba(200, 215, 230, 0.85)",
                            lineHeight: 1.4,
                          }}
                        >
                          {shortcutSetupVariant === "deck"
                            ? "Then: Guide Button Chord Layout → your chord. Full macro steps: docs (§5 bonsai shortcut setup)."
                            : "Pick a spare button on your Stadia layout, then Guide Button Chord. Full steps: docs (§5)."}
                        </div>
                      </div>
                    ) : null}
                    {expandedTurnKey === "live" && modelPolicyDisclosure ? (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(100, 140, 180, 0.35)",
                          background: "rgba(20, 32, 44, 0.5)",
                          fontSize: 11,
                          color: "#b8cce0",
                          lineHeight: 1.45,
                          maxWidth: BONSAI_CHAT_AI_MAX_WIDTH_CSS,
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 4, color: "#dce8f4" }}>
                          Model source disclosure
                        </div>
                        <div>
                          <strong>Model:</strong> {modelPolicyDisclosure.model}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {disclosureSummaryForSourceClass(modelPolicyDisclosure.source_class)}
                        </div>
                        {onOpenModelPolicyReadme ? (
                          <div style={{ marginTop: 6 }}>
                            <button
                              type="button"
                              onClick={onOpenModelPolicyReadme}
                              style={{
                                color: "#7dd3fc",
                                textDecoration: "underline",
                                cursor: "pointer",
                                background: "none",
                                border: "none",
                                padding: 0,
                                font: "inherit",
                              }}
                            >
                              Read more
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </Focusable>
                ) : null}
              </div>
            </div>
          </PanelSectionRow>
        )}
        {!isAsking && !selectedAttachment && noActiveGameContext && unifiedInput.trim() ? (
          <PanelSectionRow>
            <div
              className="bonsai-full-bleed-row"
              style={{
                ...fullBleedRowStyle,
                fontSize: 10,
                color: "#8fa8c4",
                lineHeight: 1.35,
                fontStyle: "italic",
              }}
            >
              No game detected — attach a screenshot or name the game for sharper answers.
            </div>
          </PanelSectionRow>
        ) : null}
        {isAsking && showSlowWarning && !isStreamingPreview && (
          <PanelSectionRow>
            <div className="bonsai-chat-status-line" style={{ color: "#f2cf84", fontSize: 12, padding: "6px 0", lineHeight: 1.35 }}>
              Slow (&gt;{latencyWarningSeconds}s): ensure <strong>Ollama</strong> uses your <strong>GPU</strong>, not{" "}
              <strong>CPU</strong>.
            </div>
          </PanelSectionRow>
        )}
        {strategyGuideBranches &&
          strategyGuideBranches.options.length > 0 &&
          !isAsking &&
          expandedTurnKey === "live" &&
          onStrategyBranchPick && (
          <PanelSectionRow>
            <div
              className="bonsai-glass-panel bonsai-strategy-branch-picker"
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 72,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(150, 187, 223, 0.45)",
                background: "linear-gradient(180deg, rgba(64, 93, 124, 0.42) 0%, rgba(48, 71, 95, 0.42) 100%)",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: 12, color: "#dce8f4", fontWeight: 600 }}>
                {strategyGuideBranches.question}
              </div>
              {strategyGuideBranches.options.map((opt, idx) => (
                <Button
                  key={`sg-branch-${opt.id}-${idx}`}
                  onClick={() => onStrategyBranchPick(opt)}
                  style={{
                    width: "100%",
                    minHeight: 36,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#e8eef4",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    borderRadius: 4,
                    border: "1px solid rgba(150, 187, 223, 0.35)",
                    background: "rgba(36, 52, 70, 0.75)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  {`${String.fromCharCode(65 + idx)}. ${opt.label}`}
                </Button>
              ))}
            </div>
          </PanelSectionRow>
        )}
        {!isAsking && elapsedSeconds != null && elapsedSeconds > latencyWarningSeconds && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12, lineHeight: 1.35 }}>
              {elapsedSeconds}s (&gt;{latencyWarningSeconds}s): prefer <strong>GPU</strong> for <strong>Ollama</strong>, not{" "}
              <strong>CPU</strong>.
            </div>
          </PanelSectionRow>
        )}
        {appliedTuningBannerText && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12, lineHeight: 1.35 }}>{appliedTuningBannerText}</div>
          </PanelSectionRow>
        )}
        {canSaveDesktopNote && (
          <PanelSectionRow>
            <Button
              onClick={() => onOpenDesktopNoteSave()}
              style={{
                width: "100%",
                minHeight: 38,
                border: "1px solid rgba(150, 187, 223, 0.45)",
                background: "rgba(64, 93, 124, 0.35)",
                color: "#dce8f4",
                opacity: desktopNoteSaveEnabled ? 1 : 0.45,
              }}
            >
              Save chat to Desktop
            </Button>
          </PanelSectionRow>
        )}
        {desktopAskVerboseLogging && transparencySnapshot?.ask_diagnostics ? (
          <PanelSectionRow>
            <Focusable style={{ width: "100%" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#b8c9dc", marginBottom: 6 }}>
                Ask diagnostics
              </div>
              <BonsaiChatSecondaryButton
                onClick={() => setDiagnosticsOpen((o) => !o)}
                aria-expanded={diagnosticsOpen}
                aria-label={diagnosticsOpen ? "Hide diagnostics" : "Show diagnostics"}
              >
                {diagnosticsOpen ? "Hide diagnostics" : "Show diagnostics"}
              </BonsaiChatSecondaryButton>
              {diagnosticsOpen && (
                <pre
                  style={{
                    fontSize: 10,
                    lineHeight: 1.35,
                    color: "#dce8f4",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    padding: 8,
                    background: "rgba(0,0,0,0.22)",
                    borderRadius: 4,
                  }}
                >
                  {JSON.stringify(transparencySnapshot.ask_diagnostics, null, 2)}
                </pre>
              )}
            </Focusable>
          </PanelSectionRow>
        ) : null}
        {transparencySnapshot && (
          <PanelSectionRow>
            <Focusable style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#b8c9dc", marginBottom: 6 }}>
                Input handling (last Ask)
              </div>
              <div style={{ fontSize: 11, color: "#8fa6bd", marginBottom: 8, lineHeight: 1.35 }}>
                Route: {transparencySnapshot.route}
                {transparencySnapshot.ollama_model ? ` · Model: ${transparencySnapshot.ollama_model}` : ""}
                {transparencySnapshot.success ? " · ok" : " · failed"}
              </div>
              {(Boolean(transparencySnapshot.proton_log_excerpt_attached) ||
                Boolean(transparencySnapshot.proton_log_notes?.trim())) && (
                <div style={{ fontSize: 10, color: "#7a93ad", marginBottom: 8, lineHeight: 1.35 }}>
                  Proton/Steam logs:{" "}
                  {transparencySnapshot.proton_log_excerpt_attached ? "excerpt in system prompt" : "no excerpt attached"}
                  {transparencySnapshot.proton_log_notes?.trim()
                    ? ` — ${transparencySnapshot.proton_log_notes}`
                    : ""}
                </div>
              )}
              {transparencyOpen && (
                <>
                  <div
                    style={{
                      maxHeight: 280,
                      overflow: "auto",
                      fontSize: 11,
                      color: "#dce8f4",
                      lineHeight: 1.35,
                      marginBottom: 10,
                      padding: "8px 10px",
                      borderRadius: 4,
                      background: "rgba(0,0,0,0.22)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>User input (raw)</div>
                    <pre style={{ margin: "0 0 12px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                      {transparencySnapshot.raw_question || "—"}
                    </pre>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>After sanitizer</div>
                    <pre style={{ margin: "0 0 12px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                      {transparencySnapshot.text_after_sanitizer || "—"}
                    </pre>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>System prompt (exact)</div>
                    <pre style={{ margin: "0 0 12px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                      {transparencySnapshot.system_prompt ?? "—"}
                    </pre>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>User message to model (exact)</div>
                    <pre style={{ margin: "0 0 12px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                      {transparencySnapshot.user_text_for_model ?? "—"}
                    </pre>
                    <div style={{ marginBottom: 8, color: "#9fb7d5" }}>
                      Vision: {transparencySnapshot.user_image_count} image(s) (base64 omitted here)
                    </div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Model output (raw)</div>
                    <pre style={{ margin: "0 0 12px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                      {transparencySnapshot.assistant_raw ?? "—"}
                    </pre>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Shown in bonsAI (final)</div>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                      {transparencySnapshot.final_response || "—"}
                    </pre>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <BonsaiChatSecondaryButton
                      onClick={() => onRunOriginalAsk?.(transparencySnapshot.raw_question)}
                      disabled={!onRunOriginalAsk}
                      style={{ width: "100%" }}
                    >
                      Run original in Ask
                    </BonsaiChatSecondaryButton>
                    <BonsaiChatSecondaryButton
                      onClick={() => {
                        try {
                          void navigator.clipboard.writeText(JSON.stringify(transparencySnapshot, null, 2));
                          toaster.toast({ title: "Copied", body: "Transparency JSON copied.", duration: 2500 });
                        } catch {
                          toaster.toast({ title: "Copy failed", body: "Clipboard unavailable.", duration: 3000 });
                        }
                      }}
                      style={{ width: "100%" }}
                    >
                      Copy JSON
                    </BonsaiChatSecondaryButton>
                  </div>
                </>
              )}
            </Focusable>
          </PanelSectionRow>
        )}
        {ollamaContext && (
          <PanelSectionRow>
            <div
              className="bonsai-context-footnote"
              style={{
                fontSize: 10,
                color: "#8fa8c4",
                lineHeight: 1.35,
                fontStyle: "italic",
              }}
            >
              {ollamaContext.app_context === "active" && ollamaContext.app_id
                ? `Context: active game AppID ${ollamaContext.app_id}`
                : "Context: no active game detected"}
            </div>
          </PanelSectionRow>
        )}
      </PanelSection>
    </>
  );
}
