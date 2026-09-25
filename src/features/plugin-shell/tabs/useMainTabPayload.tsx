/**
 * Title: What draws the Ask tab
 *
 * Purpose: Runs while a person has the Ask tab open — the plugin's
 * default, always-open tab, and its busiest one. It builds that whole
 * screen: the question box, the running conversation, screenshot attach,
 * and, when the AI-character feature is on, the small avatar shown in the
 * corner. It is one of six hooks, one per tab, that each build that one
 * tab's whole screen and avoid rebuilding it unless something it actually
 * shows has changed.
 *
 * Used for: The tab bar's default Ask tab.
 *
 * Solves: This one hook carries the plugin's single largest piece of
 * wiring — around a hundred separate values. Keeping it in its own file,
 * with its own rebuild list, keeps the main plugin screen's own code from
 * drowning in it.
 *
 * Does not: Own the Ask conversation, the question box's text, or the
 * screenshot list — every one of those values is worked out elsewhere and
 * simply passed through here.
 *
 * How it works:
 * 1. Works out the small AI-character avatar shown in the corner — which
 *    preset it uses, what letter badge to show, and, only when a hidden
 *    debug flag is on, a one-line summary for troubleshooting.
 * 2. Unpacks the rest of the roughly hundred incoming values under their
 *    own names, so the next step can spread them onto the tab component
 *    and list them individually for the rebuild check.
 * 3. Builds the tab element from all of it, wrapped so it only rebuilds
 *    when something it actually shows has changed. Two layout style
 *    objects and one settings-search helper are passed in as fixed values
 *    rather than props, since they never change.
 * 4. Lists every value from steps 1–2 that should cause a rebuild if it
 *    changes. This list is written by hand, and nothing checks it against
 *    what is actually drawn above — a new value left off it will not fail
 *    any check, it will just quietly stop updating on screen.
 */
import React, { useMemo } from "react";

import { MainTab } from "../../../components/MainTab";
import {
  formatAiCharacterSelectionLine,
  resolveMainTabAvatarBadgeLetter,
  resolveMainTabAvatarPresetId,
} from "../../../data/characterCatalog";
import { isQamSetting } from "../../../data/steamSettingsNavigation";
import type { AiCharacterAccentIntensityId } from "../../../data/aiCharacterAccentIntensity";

const FULL_BLEED_ROW_STYLE: React.CSSProperties = {
  width: "100%",
  marginLeft: 0,
  marginRight: 0,
  boxSizing: "border-box",
};

const PRESET_BUTTON_SURFACE: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  color: "#93a3b0",
};

type MainTabProps = React.ComponentProps<typeof MainTab>;

/**
 * Everything the Main tab renders, except the two layout constants and `isQamSetting`
 * (owned here) and the AI-character presentation, which is derived from the raw settings below.
 */
export type UseMainTabPayloadArgs = Omit<
  MainTabProps,
  | "fullBleedRowStyle"
  | "presetButtonSurface"
  | "isQamSetting"
  | "aiCharacterPadClass"
  | "aiCharacterAvatarPresetId"
  | "aiCharacterAvatarBadgeLetter"
  | "aiCharacterDebugLine"
  | "onOpenCharacterPicker"
> & {
  aiCharacterEnabled: boolean;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  /** Offered to the tab only while the character feature is on. */
  openCharacterPickerModal: () => void;
};

/**
 * In: around a hundred separate values bundled into one argument object —
 * every visible and functional piece of the Ask tab, plus the raw
 * AI-character settings and the function that opens its picker popup.
 * Out: one finished tab element, rebuilt only when something it actually
 * shows changes.
 * Can go wrong: the rebuild list near the end of this function is written
 * by hand; a value added above that is not also added there will build
 * correctly today, then silently stop updating on screen the next time
 * only it changes — nothing checks the list against the JSX above it.
 *
 * 1. Works out the AI-character avatar's preset, its badge letter, and,
 *    only with a hidden debug flag on, a one-line debug summary — the
 *    only real computation in this function; everything else below is
 *    passed straight through.
 * 2. Pulls the rest of the roughly hundred incoming values out into
 *    local names, so each one can be listed individually further down.
 * 3. Builds the Ask tab's element with all of them spread onto it, plus
 *    the two fixed layout constants and the AI-character values from
 *    step 1.
 * 4. Lists everything from steps 1–3 that should cause a rebuild when it
 *    changes — by hand, with a warning comment above it that nothing
 *    checks this list against the JSX itself.
 */
export function useMainTabPayload({
  aiCharacterEnabled,
  aiCharacterRandom,
  aiCharacterPresetId,
  aiCharacterCustomText,
  aiCharacterAccentIntensity,
  openCharacterPickerModal,
  ...props
}: UseMainTabPayloadArgs): React.ReactElement {
  const mainTabAvatarPresetId = aiCharacterEnabled
    ? resolveMainTabAvatarPresetId({
        enabled: aiCharacterEnabled,
        random: aiCharacterRandom,
        presetId: aiCharacterPresetId,
        customText: aiCharacterCustomText,
      })
    : null;

  const mainTabAvatarBadgeLetter = resolveMainTabAvatarBadgeLetter({
    enabled: aiCharacterEnabled,
    random: aiCharacterRandom,
    presetId: aiCharacterPresetId,
    customText: aiCharacterCustomText,
  });

  const aiCharacterDebugLineForMainTab =
    typeof window !== "undefined" &&
    (window as unknown as { __BONSAI_DEBUG_AI_CHARACTER__?: boolean }).__BONSAI_DEBUG_AI_CHARACTER__
      ? [
          `avatar=${mainTabAvatarPresetId ?? "null"}`,
          `presetId="${aiCharacterPresetId}"`,
          `random=${String(aiCharacterRandom)}`,
          `line=${formatAiCharacterSelectionLine({
            random: aiCharacterRandom,
            presetId: aiCharacterPresetId,
            customText: aiCharacterCustomText,
          })}`,
          `accent=${aiCharacterAccentIntensity}`,
        ].join(" | ")
      : null;

  const {
    suggestedPrompts,
    showPluginHelpChip,
    useLocalKnowledgeBase,
    onOpenPluginHelp,
    presetChipAnimation,
    presetSingleChip,
    onRetryLastResponse,
    liveReplyFeedbackRating,
    onReplyFeedback,
    onReplyMicroAction,
    liveReplyChipUsed,
    liveReplyChipError,
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
    onTakeScreenshot,
    onCancelAsk,
    onMicInput,
    voiceRecording,
    selectedAttachment,
    setSelectedAttachment,
    clearUnifiedInput,
    showSearchClearButton,
    isScreenshotBrowserOpen,
    onCloseScreenshotBrowser,
    loadRecentScreenshots,
    mediaError,
    isCapturingScreenshot,
    recentScreenshots,
    isLoadingRecentScreenshots,
    onSelectRecentScreenshot,
    navigationMessage,
    showSlowWarning,
    latencyWarningSeconds,
    ollamaResponse,
    elapsedSeconds,
    lastApplied,
    ollamaContext,
    canSaveDesktopNote,
    onOpenDesktopNoteSave,
    mediaLibraryEnabled,
    gameContextReadEnabled,
    onNavigateToPermissions,
    micPermissionDenied,
    onDismissMicPermissionDeny,
    desktopNoteSaveEnabled,
    transparencySnapshot,
    onRunOriginalAsk,
    askMode,
    onAskModeChange,
    strategyGuideBranches,
    strategyChecklist,
    onStrategyChecklistToggle,
    onStrategyBranchPick,
    onPresetPreferAskMode,
    askThreadCollapsed,
    askThreadDisplayQuestion,
    expandedTurnKey,
    onTurnActivate,
    modelPolicyDisclosure,
    onOpenModelPolicyReadme,
    shortcutSetupVariant,
    onOpenControllerSettings,
    strategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    presetCarouselInject,
    isStreamingPreview,
    streamDisplayText,
    liveThinking,
    desktopAskVerboseLogging,
    lastRequestId,
    lastExchange,
    chatSlotSummaries,
    activeChatSlotId,
    onChatSlotCreate,
    onChatSlotSelect,
    onChatSlotRename,
    onChatSlotDelete,
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
    askStopped,
    isForeignPendingAsk,
    generatingSlotId,
    unreadSlotIds,
  } = props;

  // Dependency list preserved from index.tsx, with the names it depended on translated to the
  // prop that derives from them (`pluginHelpDismissed` -> `showPluginHelpChip`,
  // `effectiveOllamaPcIp` -> `ollamaIp`, the two capability flags -> the two booleans built from
  // them). The two style constants it also listed are module constants here and cannot change,
  // so they are dropped rather than threaded through.
  return useMemo(
    () => (
      <MainTab
        key="bonsai-main-tab"
        fullBleedRowStyle={FULL_BLEED_ROW_STYLE}
        presetButtonSurface={PRESET_BUTTON_SURFACE}
        suggestedPrompts={suggestedPrompts}
        showPluginHelpChip={showPluginHelpChip}
        useLocalKnowledgeBase={useLocalKnowledgeBase}
        onOpenPluginHelp={onOpenPluginHelp}
        presetChipAnimation={presetChipAnimation}
        presetSingleChip={presetSingleChip}
        onRetryLastResponse={onRetryLastResponse}
        liveReplyFeedbackRating={liveReplyFeedbackRating}
        onReplyFeedback={onReplyFeedback}
        onReplyMicroAction={onReplyMicroAction}
        liveReplyChipUsed={liveReplyChipUsed}
        liveReplyChipError={liveReplyChipError}
        setUnifiedInput={setUnifiedInput}
        unifiedInputHostRef={unifiedInputHostRef}
        unifiedInputFieldLayerRef={unifiedInputFieldLayerRef}
        unifiedInputMeasureRef={unifiedInputMeasureRef}
        attachActionHostRef={attachActionHostRef}
        askBarHostRef={askBarHostRef}
        screenshotBrowserHostRef={screenshotBrowserHostRef}
        unifiedInputSurfacePx={unifiedInputSurfacePx}
        unifiedInput={unifiedInput}
        usesNativeMultilineField={usesNativeMultilineField}
        setIsUnifiedInputFocused={setIsUnifiedInputFocused}
        isUnifiedInputFocused={isUnifiedInputFocused}
        setSelectedIndex={setSelectedIndex}
        filteredSettings={filteredSettings}
        selectedIndex={selectedIndex}
        onSettingClick={onSettingClick}
        isAsking={isAsking}
        ollamaIp={ollamaIp}
        onAskOllama={onAskOllama}
        onOpenScreenshotBrowser={onOpenScreenshotBrowser}
        onTakeScreenshot={onTakeScreenshot}
        onCancelAsk={onCancelAsk}
        onMicInput={onMicInput}
        voiceRecording={voiceRecording}
        selectedAttachment={selectedAttachment}
        setSelectedAttachment={setSelectedAttachment}
        clearUnifiedInput={clearUnifiedInput}
        showSearchClearButton={showSearchClearButton}
        isScreenshotBrowserOpen={isScreenshotBrowserOpen}
        onCloseScreenshotBrowser={onCloseScreenshotBrowser}
        loadRecentScreenshots={loadRecentScreenshots}
        mediaError={mediaError}
        isCapturingScreenshot={isCapturingScreenshot}
        recentScreenshots={recentScreenshots}
        isLoadingRecentScreenshots={isLoadingRecentScreenshots}
        onSelectRecentScreenshot={onSelectRecentScreenshot}
        navigationMessage={navigationMessage}
        isQamSetting={isQamSetting}
        showSlowWarning={showSlowWarning}
        latencyWarningSeconds={latencyWarningSeconds}
        ollamaResponse={ollamaResponse}
        elapsedSeconds={elapsedSeconds}
        lastApplied={lastApplied}
        ollamaContext={ollamaContext}
        canSaveDesktopNote={canSaveDesktopNote}
        onOpenDesktopNoteSave={onOpenDesktopNoteSave}
        mediaLibraryEnabled={mediaLibraryEnabled}
        gameContextReadEnabled={gameContextReadEnabled}
        onNavigateToPermissions={onNavigateToPermissions}
        micPermissionDenied={micPermissionDenied}
        onDismissMicPermissionDeny={onDismissMicPermissionDeny}
        desktopNoteSaveEnabled={desktopNoteSaveEnabled}
        aiCharacterPadClass={aiCharacterEnabled}
        aiCharacterAvatarPresetId={mainTabAvatarPresetId}
        aiCharacterAvatarBadgeLetter={mainTabAvatarBadgeLetter}
        onOpenCharacterPicker={aiCharacterEnabled ? openCharacterPickerModal : undefined}
        aiCharacterDebugLine={aiCharacterDebugLineForMainTab}
        transparencySnapshot={transparencySnapshot}
        onRunOriginalAsk={onRunOriginalAsk}
        askMode={askMode}
        onAskModeChange={onAskModeChange}
        strategyGuideBranches={strategyGuideBranches}
        strategyChecklist={strategyChecklist}
        onStrategyChecklistToggle={onStrategyChecklistToggle}
        onStrategyBranchPick={onStrategyBranchPick}
        onPresetPreferAskMode={onPresetPreferAskMode}
        askThreadCollapsed={askThreadCollapsed}
        askThreadDisplayQuestion={askThreadDisplayQuestion}
        expandedTurnKey={expandedTurnKey}
        onTurnActivate={onTurnActivate}
        modelPolicyDisclosure={modelPolicyDisclosure}
        onOpenModelPolicyReadme={onOpenModelPolicyReadme}
        shortcutSetupVariant={shortcutSetupVariant}
        onOpenControllerSettings={onOpenControllerSettings}
        strategySpoilerMaskingEnabled={strategySpoilerMaskingEnabled}
        strategySpoilerAutoRevealAfterConsent={strategySpoilerAutoRevealAfterConsent}
        presetCarouselInject={presetCarouselInject}
        isStreamingPreview={isStreamingPreview}
        streamDisplayText={streamDisplayText}
        liveThinking={liveThinking}
        desktopAskVerboseLogging={desktopAskVerboseLogging}
        lastRequestId={lastRequestId}
        lastExchange={lastExchange}
        chatSlotSummaries={chatSlotSummaries}
        activeChatSlotId={activeChatSlotId}
        onChatSlotCreate={onChatSlotCreate}
        onChatSlotSelect={onChatSlotSelect}
        onChatSlotRename={onChatSlotRename}
        onChatSlotDelete={onChatSlotDelete}
        onBeforeNestedDeckyModal={onBeforeNestedDeckyModal}
        onCompleteNestedDeckyModalClose={onCompleteNestedDeckyModalClose}
        askStopped={askStopped}
        isForeignPendingAsk={isForeignPendingAsk}
        generatingSlotId={generatingSlotId}
        unreadSlotIds={unreadSlotIds}
      />
    ),
    // ANY NEW PROP MUST BE ADDED TO THIS LIST. It is hand-maintained and nothing
    // checks it against the JSX above: a prop left out does not fail `tsc` or any
    // test, the memoized element just goes stale and the feature silently does
    // nothing on device. Its twin is `presetChipsPropsEqual` in
    // `components/MainTabPresetAnimatedChips.tsx` — a change threaded to the preset
    // chips has to clear both gates.
    [
      suggestedPrompts,
      showPluginHelpChip,
      useLocalKnowledgeBase,
      presetChipAnimation,
      presetSingleChip,
      unifiedInput,
      unifiedInputSurfacePx,
      usesNativeMultilineField,
      isUnifiedInputFocused,
      filteredSettings,
      selectedIndex,
      isAsking,
      ollamaIp,
      selectedAttachment,
      showSearchClearButton,
      isScreenshotBrowserOpen,
      mediaError,
      isCapturingScreenshot,
      recentScreenshots,
      isLoadingRecentScreenshots,
      navigationMessage,
      showSlowWarning,
      latencyWarningSeconds,
      ollamaResponse,
      elapsedSeconds,
      lastApplied,
      ollamaContext,
      lastExchange,
      mediaLibraryEnabled,
      gameContextReadEnabled,
      onNavigateToPermissions,
      micPermissionDenied,
      onDismissMicPermissionDeny,
      aiCharacterEnabled,
      mainTabAvatarPresetId,
      mainTabAvatarBadgeLetter,
      aiCharacterDebugLineForMainTab,
      transparencySnapshot,
      // Note for a future reader: several existing props above this line (liveThinking, which now
      // also carries the plan 58 phase 1 kb-notes material, plus isStreamingPreview,
      // streamDisplayText, lastRequestId, desktopAskVerboseLogging, and
      // strategySpoilerAutoRevealAfterConsent among them) are already missing from this
      // hand-maintained list despite being destructured and rendered above — pre-existing and out
      // of scope here.
      askMode,
      strategyGuideBranches,
      strategyChecklist,
      askThreadCollapsed,
      askThreadDisplayQuestion,
      expandedTurnKey,
      modelPolicyDisclosure,
      shortcutSetupVariant,
      strategySpoilerMaskingEnabled,
      presetCarouselInject,
      onRetryLastResponse,
      onReplyFeedback,
      onReplyMicroAction,
      liveReplyFeedbackRating,
      liveReplyChipUsed,
      liveReplyChipError,
      voiceRecording,
      onMicInput,
      onOpenScreenshotBrowser,
      onTakeScreenshot,
      chatSlotSummaries,
      activeChatSlotId,
      onChatSlotCreate,
      onChatSlotSelect,
      onChatSlotRename,
      onChatSlotDelete,
      onBeforeNestedDeckyModal,
      onCompleteNestedDeckyModalClose,
      askStopped,
      isForeignPendingAsk,
      generatingSlotId,
      unreadSlotIds,
    ]
  );
}
