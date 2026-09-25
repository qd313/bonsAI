/**
 * Title: Main tab shell
 *
 * Purpose: This is the Main tab a person sees when they open bonsAI: the chat
 * history above, and a dock below it holding the suggestion chips and the
 * question box. This file only arranges those pieces — the row of chat tabs
 * across the top, the transcript, the suggestion row, the Ask bar, the
 * screenshot picker when it is open, and a couple of status lines. It does
 * not ask a question or produce an answer itself.
 *
 * Used for: index.tsx's Main tab panel, fed by the large bundle of state and
 * callbacks the Ask logic builds elsewhere.
 *
 * Solves: Keeps the Main tab's layout in one place, separate from the logic
 * of asking a question and tracking where the D-pad's ring should go, which
 * live in hooks and the child pieces instead.
 *
 * Does not: Submit a question, poll for the answer, or manage the D-pad's
 * path between controls — see MainTabUnifiedAskBar and MainTabChatTranscript
 * for those.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import { PanelSection, PanelSectionRow, Button } from "@decky/ui";
import type { PresetPrompt } from "../data/presets";
import type {
  AppliedResult,
  AskAttachment,
  AskThreadCollapsedTurn,
  OllamaContextUi,
  ScreenshotItem,
  StrategyGuideBranchesPayload,
  StrategyChecklistState,
} from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import type { AskModeId } from "../data/askMode";
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import type { AskThreadExpandedTurnKey } from "../types/bonsaiUi";
import type { LastExchangeSnapshot, LiveThinkingSnapshot } from "../types/backgroundAsk";
import type { ReplyMicroActionId } from "../data/replyMicroActions";
import { MainTabPresetRow } from "./MainTabPresetRow";
import { MainTabUnifiedAskBar } from "./MainTabUnifiedAskBar";
import { MainTabScreenshotBrowser } from "./MainTabScreenshotBrowser";
import { MainTabChatTranscript } from "./MainTabChatTranscript";
import { PermissionDenyAction } from "./PermissionDenyAction";
import { useMainTabColumnFill } from "../hooks/useMainTabColumnFill";
import { useDockClearanceOnFocus } from "../hooks/useDockClearanceOnFocus";
import { ChatSlotRow } from "../features/chat-slots/ChatSlotRow";
import type { ChatSlotSummary } from "../utils/chatSlotsApi";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import {
  STREAM_SCRAMBLE_OFF,
  StreamScrambleContext,
  type StreamScrambleContextValue,
  type StreamScrambleSettings,
} from "../features/stream-scramble/streamScrambleContext";

export type MainTabProps = {
  fullBleedRowStyle: React.CSSProperties;
  presetButtonSurface: React.CSSProperties;
  suggestedPrompts: PresetPrompt[];
  showPluginHelpChip: boolean;
  useLocalKnowledgeBase?: boolean;
  onOpenPluginHelp: () => void;
  presetChipAnimation?: "fade" | "carousel" | "static" | "decode";
  /** "One suggestion chip" setting: the row shows one chip with the whole column. Off by default. */
  presetSingleChip?: boolean;
  onRetryLastResponse?: () => void;
  liveReplyFeedbackRating?: "up" | "down" | null;
  onReplyFeedback?: (rating: "up" | "down") => void;
  onReplyMicroAction?: (chipId: ReplyMicroActionId) => void;
  liveReplyChipUsed?: boolean;
  liveReplyChipError?: string | null;
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
  onTakeScreenshot: () => void | Promise<void>;
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
  isCapturingScreenshot?: boolean;
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
  canSaveDesktopNote: boolean;
  onOpenDesktopNoteSave: () => void;
  mediaLibraryEnabled?: boolean;
  desktopNoteSaveEnabled?: boolean;
  aiCharacterPadClass?: boolean;
  aiCharacterAvatarPresetId?: string | null;
  aiCharacterAvatarBadgeLetter?: string | null;
  onOpenCharacterPicker?: () => void;
  aiCharacterDebugLine?: string | null;
  transparencySnapshot?: TransparencySnapshot | null;
  onRunOriginalAsk?: (rawQuestion: string) => void;
  askMode: AskModeId;
  onAskModeChange: (mode: AskModeId) => void;
  strategyGuideBranches?: StrategyGuideBranchesPayload | null;
  onStrategyBranchPick?: (opt: { id: string; label: string }) => void;
  strategyChecklist?: StrategyChecklistState | null;
  onStrategyChecklistToggle?: (itemId: string, checked: boolean) => void;
  onPresetPreferAskMode?: (mode: AskModeId) => void;
  askThreadCollapsed?: AskThreadCollapsedTurn[];
  askThreadDisplayQuestion?: string;
  expandedTurnKey?: AskThreadExpandedTurnKey;
  onTurnActivate?: (key: string | "live") => void;
  modelPolicyDisclosure?: ModelPolicyDisclosurePayload | null;
  onOpenModelPolicyReadme?: () => void;
  shortcutSetupVariant?: "deck" | "stadia" | null;
  onOpenControllerSettings?: () => void;
  strategySpoilerMaskingEnabled?: boolean;
  strategySpoilerAutoRevealAfterConsent?: boolean;
  presetCarouselInject?: { text: string } | null;
  isStreamingPreview?: boolean;
  streamDisplayText?: string;
  /** Stop was pressed on this turn: show the Stopped notice beside whatever text was kept. */
  askStopped?: boolean;
  /** A pending Ask belongs to another chat slot: the ask bar shows busy, the transcript does not. */
  isForeignPendingAsk?: boolean;
  /** What fills the space under your question while the answer is being made, including
   *  (plan 58 phase 1) the "From the notes" block's own material — see LiveThinkingSnapshot. */
  liveThinking?: LiveThinkingSnapshot | null;
  desktopAskVerboseLogging?: boolean;
  lastRequestId?: number | null;
  lastExchange?: LastExchangeSnapshot | null;
  gameContextReadEnabled?: boolean;
  onNavigateToPermissions?: (capability: BonsaiCapabilityKey) => void;
  micPermissionDenied?: boolean;
  onDismissMicPermissionDeny?: () => void;
  chatSlotSummaries?: ChatSlotSummary[];
  activeChatSlotId?: string | null;
  onChatSlotCreate?: () => Promise<unknown>;
  onChatSlotSelect?: (slotId: string | null) => Promise<void>;
  onChatSlotRename?: (slotId: string, label: string) => Promise<boolean>;
  onChatSlotDelete?: (slotId: string) => Promise<boolean>;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  /** Slot the backend is generating for, or null. Drives the hollow cyan ring in the slot row. */
  generatingSlotId?: string | null;
  /** Slots that finished an answer while the user was elsewhere. Drives the solid green dot. */
  unreadSlotIds?: ReadonlySet<string>;
  /** Streamed answers scramble their newest text before settling, like the decode chips. Undefined or omitted is the same as the switch being off. */
  streamScramble?: StreamScrambleSettings;
};

/*
 * In: MainTabProps — essentially every piece of state and callback the Main
 * tab's pieces need: the chat history, the focus refs, the current question
 * text, whether an Ask is running, the screenshot browser's state, and so on.
 * Out: the assembled screen — an optional row of chat tabs, the transcript,
 * then a dock holding the suggestion row and the Ask bar, and, depending on
 * what the props say, a mic-permission notice, the screenshot browser, a
 * plain navigation message, and a footnote naming the game in context.
 * What can go wrong: almost nothing is computed here — one wrapped callback
 * aside, this file only arranges props into JSX. A missing optional prop
 * (say, no onChatSlotCreate) just hides the piece that needed it rather than
 * breaking the rest of the screen.
 *
 * 1. Set up what this file itself needs to track: which function currently
 *    focuses the question box, whether the chat-tab row is sitting at its
 *    "+" (new chat) position, and the ref used to stretch the dock down to
 *    the bottom of the screen.
 * 2. Wrap the real onAskOllama in one that creates a new chat slot first when
 *    asking from the "+" position, so the answer plays out on the new tab
 *    instead of landing behind the tab the person started on — see the
 *    comment on this wrapper for the bug it fixes.
 * 3. Draw the row of chat tabs, when all four chat-slot callbacks are given.
 * 4. Draw the chat transcript, wrapped in `StreamScrambleContext.Provider` so the
 *    answer bubble inside it can read the scramble setting without it being threaded
 *    through as a prop — both the transcript and the Ask hook that feeds it are already
 *    at their size limit, with no room for one more.
 * 5. Draw the dock: the suggestion row, the Ask bar (which hands its own
 *    focus-jump functions back up through onFocusHandlersReady), a
 *    mic-permission notice if the microphone was refused, the screenshot
 *    browser if it is open, a plain navigation message, and a footnote
 *    naming the game bonsAI thinks it is talking about.
 */

/**
 * In: the one `streamScramble` prop `MainTab` received — undefined for a caller that never heard
 * of the setting (an older test fixture, one built before this shipped).
 * Out: the `StreamScrambleSettings` object the context provides: the given value as-is when
 * there is one, or the shared `STREAM_SCRAMBLE_OFF` constant (switch off, schema defaults)
 * otherwise.
 * Can go wrong: nothing — a missing prop is exactly the same as the switch being off.
 */
export function resolveStreamScrambleSettings(
  streamScramble: StreamScrambleSettings | undefined,
): StreamScrambleSettings {
  return streamScramble ?? STREAM_SCRAMBLE_OFF;
}

/** The Main tab itself — assembles the chat-slot row, transcript and dock. See the file header above for the full flow. */
export function MainTab(props: MainTabProps) {
  const presetCarouselHostRef = useRef<HTMLDivElement | null>(null);
  const [focusUnifiedTextField, setFocusUnifiedTextField] = useState(() => () => false);
  const [slotRowAtCreate, setSlotRowAtCreate] = useState(false);
  /* Bottom-pins the preset/Ask dock: the column stretches to the scroll viewport's bottom edge
     (measured — the offset crosses hashed Steam wrappers) and the dock carries margin-top: auto. */
  const columnRef = useRef<HTMLDivElement | null>(null);
  useMainTabColumnFill(columnRef);
  /* Focus landing behind the bottom dock gets lifted above it — see the hook's header. */
  useDockClearanceOnFocus(columnRef);

  /*
   * Asking at the [+] position creates the chat FIRST, so the panel lands on the new slot and the
   * whole answer plays out where the user is looking: thinking blurbs, then the stream, then the
   * chips. Without this, [+] was only a view — cycling there leaves the active slot alone by
   * design — so an Ask submitted from it went into whichever slot the user came from, behind an
   * empty-state screen that hides that slot's transcript. Measured on device 2026-08-31: the
   * answer "never showed up" until the user LB'd back and found it in the old chat.
   */
  const { onAskOllama: submitAsk, onChatSlotCreate } = props;
  const onAskOllama = useCallback(
    async (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => {
      if (slotRowAtCreate && onChatSlotCreate) {
        await onChatSlotCreate();
      }
      return submitAsk(overrideQuestion, opts);
    },
    [slotRowAtCreate, onChatSlotCreate, submitAsk],
  );

  /* Plus whether the answer on screen was stopped: its scrambled letters then turn real at once. */
  const streamScrambleContextValue: StreamScrambleContextValue = useMemo(
    () => ({ ...resolveStreamScrambleSettings(props.streamScramble), stopped: props.askStopped === true }),
    [props.streamScramble, props.askStopped],
  );

  return (
    <>
      <PanelSection>
        <div ref={columnRef} className="bonsai-main-tab-column">
        {props.onChatSlotCreate && props.onChatSlotSelect && props.onChatSlotRename && props.onChatSlotDelete ? (
          <PanelSectionRow>
            <ChatSlotRow
              summaries={props.chatSlotSummaries ?? []}
              activeSlotId={props.activeChatSlotId ?? null}
              onCreateSlot={props.onChatSlotCreate}
              onSelectSlot={props.onChatSlotSelect}
              onRenameSlot={props.onChatSlotRename}
              onDeleteSlot={props.onChatSlotDelete}
              onBeforeNestedDeckyModal={props.onBeforeNestedDeckyModal}
              onCompleteNestedDeckyModalClose={props.onCompleteNestedDeckyModalClose}
              onCreatePositionChange={setSlotRowAtCreate}
              generatingSlotId={props.generatingSlotId}
              unreadSlotIds={props.unreadSlotIds}
            />
          </PanelSectionRow>
        ) : null}
        <StreamScrambleContext.Provider value={streamScrambleContextValue}>
          <MainTabChatTranscript {...props} showEmptySlotPreview={slotRowAtCreate} />
        </StreamScrambleContext.Provider>
        <div className="bonsai-main-tab-dock">
        <PanelSectionRow>
          <MainTabPresetRow
            suggestedPrompts={props.suggestedPrompts}
            showPluginHelpChip={props.showPluginHelpChip}
            useLocalKnowledgeBase={props.useLocalKnowledgeBase}
            onOpenPluginHelp={props.onOpenPluginHelp}
            presetChipAnimation={props.presetChipAnimation}
            presetSingleChip={props.presetSingleChip}
            setUnifiedInput={props.setUnifiedInput}
            onPresetPreferAskMode={props.onPresetPreferAskMode}
            presetCarouselInject={props.presetCarouselInject}
            isAsking={props.isAsking}
            focusUnifiedTextField={focusUnifiedTextField}
            presetCarouselHostRef={presetCarouselHostRef}
          />
        </PanelSectionRow>

        <MainTabUnifiedAskBar
          {...props}
          onAskOllama={onAskOllama}
          presetCarouselHostRef={presetCarouselHostRef}
          onFocusHandlersReady={({ focusUnifiedTextField: fn }) => {
            setFocusUnifiedTextField(() => fn);
          }}
        />

        {props.micPermissionDenied && props.onNavigateToPermissions ? (
          <PanelSectionRow>
            <div className="bonsai-full-bleed-row" style={props.fullBleedRowStyle}>
              <PermissionDenyAction
                capability="microphone_access"
                onJump={props.onNavigateToPermissions}
                compact
              />
              {props.onDismissMicPermissionDeny ? (
                <Button
                  onClick={props.onDismissMicPermissionDeny}
                  style={{ marginTop: 6, fontSize: 11, padding: "4px 10px", minHeight: 34 }}
                >
                  Dismiss
                </Button>
              ) : null}
            </div>
          </PanelSectionRow>
        ) : null}

        {props.isScreenshotBrowserOpen && (
          <PanelSectionRow>
            <MainTabScreenshotBrowser
              fullBleedRowStyle={props.fullBleedRowStyle}
              presetButtonSurface={props.presetButtonSurface}
              screenshotBrowserHostRef={props.screenshotBrowserHostRef}
              onCloseScreenshotBrowser={props.onCloseScreenshotBrowser}
              loadRecentScreenshots={props.loadRecentScreenshots}
              mediaError={props.mediaError}
              mediaLibraryEnabled={props.mediaLibraryEnabled}
              recentScreenshots={props.recentScreenshots}
              isLoadingRecentScreenshots={props.isLoadingRecentScreenshots}
              onSelectRecentScreenshot={props.onSelectRecentScreenshot}
              setUnifiedInput={props.setUnifiedInput}
              onNavigateToPermissions={props.onNavigateToPermissions}
            />
          </PanelSectionRow>
        )}

        {props.navigationMessage && (
          <PanelSectionRow>
            <div style={{ color: "#81c784", fontSize: 13 }}>{props.navigationMessage}</div>
          </PanelSectionRow>
        )}
        {props.ollamaContext && (
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
              {props.ollamaContext.app_context === "active" && props.ollamaContext.app_id
                ? `Context: active game ${
                    props.ollamaContext.app_name?.trim() || `AppID ${props.ollamaContext.app_id}`
                  }`
                : "Context: no active game detected"}
            </div>
          </PanelSectionRow>
        )}
        </div>
        </div>
      </PanelSection>
    </>
  );
}
