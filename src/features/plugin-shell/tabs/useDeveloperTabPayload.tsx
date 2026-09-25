/**
 * Title: What draws the Debug tab
 *
 * Purpose: Runs while a person has the Debug tab open — a tab meant for
 * troubleshooting and experiments, only shown once a setting turns it on.
 * It builds that screen: captured crash messages, connection status,
 * logging levels, and a long list of experimental switches.
 *
 * Used for: The tab bar's Debug tab, present only while that setting is on.
 *
 * Solves: Keeps this one very large list of values — about two dozen —
 * and its rebuild list out of the main plugin screen's own code.
 *
 * Does not: Own any of the values it displays — every one is supplied by
 * the caller and simply passed through to the Debug tab itself.
 */
import React, { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

import { DeveloperTab } from "../../../components/DeveloperTab";

type DeveloperTabProps = React.ComponentProps<typeof DeveloperTab>;

export type UseDeveloperTabPayloadArgs = Omit<
  DeveloperTabProps,
  "onClearErrors" | "onInstallSeedKnowledgeBase"
> & {
  setCapturedErrors: Dispatch<SetStateAction<string[]>>;
  /** Gated on showDeveloperTab, matching the tab that hosts it. */
  installSeedKnowledgeBase: () => Promise<void>;
  showDeveloperTab: boolean;
};

/**
 * In: about two dozen separate values and their setters — everything the
 * Debug tab shows or can toggle — bundled into one argument object.
 * Out: the finished Debug tab element, rebuilt only when one of the listed
 * values changes.
 * Can go wrong: the rebuild list at the bottom of this function is written
 * by hand; a value added above that is not also added there will not fail
 * any check, it will just quietly stop updating on screen.
 */
export function useDeveloperTabPayload({
  capturedErrors,
  setCapturedErrors,
  onSteamInputPhase1Jump,
  lastConnectionStatus,
  desktopDebugNoteAutoSave,
  setDesktopDebugNoteAutoSave,
  desktopAskVerboseLogging,
  setDesktopAskVerboseLogging,
  desktopAppLogLevel,
  setDesktopAppLogLevel,
  filesystemWrite,
  presetChipAnimation,
  setPresetChipAnimation,
  steamWebApiKey,
  setSteamWebApiKey,
  showOnscreenDebugHud,
  setShowOnscreenDebugHud,
  devForceSessionRagChips,
  setDevForceSessionRagChips,
  devPreloadAskModel,
  setDevPreloadAskModel,
  devFrozenTestChips,
  setDevFrozenTestChips,
  ragHybridRetrievalEnabled,
  setRagHybridRetrievalEnabled,
  tabResumeMode,
  setTabResumeMode,
  installSeedKnowledgeBase,
  showDeveloperTab,
  onJumpToPermission,
}: UseDeveloperTabPayloadArgs): React.ReactElement {
  // Dependency list preserved verbatim from index.tsx: the settings setters are stable
  // identities from usePluginSettings and were deliberately left out.
  return useMemo(
    () => (
      <DeveloperTab
        capturedErrors={capturedErrors}
        onClearErrors={() => setCapturedErrors([])}
        onSteamInputPhase1Jump={onSteamInputPhase1Jump}
        lastConnectionStatus={lastConnectionStatus}
        desktopDebugNoteAutoSave={desktopDebugNoteAutoSave}
        setDesktopDebugNoteAutoSave={setDesktopDebugNoteAutoSave}
        desktopAskVerboseLogging={desktopAskVerboseLogging}
        setDesktopAskVerboseLogging={setDesktopAskVerboseLogging}
        desktopAppLogLevel={desktopAppLogLevel}
        setDesktopAppLogLevel={setDesktopAppLogLevel}
        filesystemWrite={filesystemWrite}
        onJumpToPermission={onJumpToPermission}
        presetChipAnimation={presetChipAnimation}
        setPresetChipAnimation={setPresetChipAnimation}
        steamWebApiKey={steamWebApiKey}
        setSteamWebApiKey={setSteamWebApiKey}
        showOnscreenDebugHud={showOnscreenDebugHud}
        setShowOnscreenDebugHud={setShowOnscreenDebugHud}
        devForceSessionRagChips={devForceSessionRagChips}
        setDevForceSessionRagChips={setDevForceSessionRagChips}
        devPreloadAskModel={devPreloadAskModel}
        setDevPreloadAskModel={setDevPreloadAskModel}
        devFrozenTestChips={devFrozenTestChips}
        setDevFrozenTestChips={setDevFrozenTestChips}
        ragHybridRetrievalEnabled={ragHybridRetrievalEnabled}
        setRagHybridRetrievalEnabled={setRagHybridRetrievalEnabled}
        tabResumeMode={tabResumeMode}
        setTabResumeMode={setTabResumeMode}
        onInstallSeedKnowledgeBase={showDeveloperTab ? installSeedKnowledgeBase : undefined}
      />
    ),
    [
      capturedErrors,
      onSteamInputPhase1Jump,
      lastConnectionStatus,
      desktopDebugNoteAutoSave,
      desktopAskVerboseLogging,
      desktopAppLogLevel,
      filesystemWrite,
      presetChipAnimation,
      steamWebApiKey,
      showOnscreenDebugHud,
      devForceSessionRagChips,
      devPreloadAskModel,
      devFrozenTestChips,
      ragHybridRetrievalEnabled,
      tabResumeMode,
      installSeedKnowledgeBase,
      showDeveloperTab,
      onJumpToPermission,
    ]
  );
}
