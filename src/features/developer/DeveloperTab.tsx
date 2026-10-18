/**
 * Title: Developer tab
 *
 * Purpose: The Developer tab, only visible once Developer Mode is turned
 * on. It is for troubleshooting and testing bonsAI itself, not for changing
 * how the AI answers: captured crash logs, which tab reopens the plugin,
 * whether app activity gets written to Desktop as a log file, and a handful of QA-only controls for
 * testing the preset chip carousel and the knowledge base.
 *
 * Folded (plan 91 § 2b, plan 92 lane T2): each section is one line (FoldedSection) showing a summary of its
 * values; A opens or closes it, several can be open at once, and a first visit starts with every section
 * closed. Inside, one line per setting; a row's longer words show in the help strip at the bottom of the
 * panel while the ring is on it; the floating Open all button opens or closes every section.
 *
 * Used for: The Developer tab in index.tsx, shown only when Developer Mode
 * is on.
 *
 * Solves: Keeps every troubleshooting and QA control in one out-of-the-way
 * tab that an ordinary user never sees, instead of scattered through the
 * tabs everyone uses.
 *
 * Does not: Change anything about how Ask works for a normal user — most of
 * these rows exist to test or debug the plugin itself, and several are
 * gated behind their own developer settings and capabilities on top of
 * Developer Mode. Does not scroll the pane or move the ring when it appears: nothing in this tab or its
 * rows runs an effect that focuses or scrolls (a test pins that).
 *
 * How it works:
 *
 *     Knowledge base  <- only when a seed-install callback was passed in
 *     Diagnostics              <- HUD toggle, warm-at-boot, Steam Input jump, captured errors, loaded models
 *     Navigation               <- which tab reopens the plugin
 *     Logging & exports        <- Desktop log level, auto-save chat, verbose Ask log, QA session-RAG
 *                                 chips + frozen test chips
 *     Animations               <- preset chip animation, scramble switch + its settle style, settle
 *                                 time and colour rows (shown only while it is on)
 *
 * 1. The section names, summaries and every row's longer words live in developerTabFolds.ts. Each section's
 *    rows are a list (developerRowsDiagnostics.tsx, developerRowsLogging.tsx, developerRowsAnimations.tsx)
 *    drawn by SectionRows, which hands the first stop's Up to the section's line and the last stop's Down to
 *    the next line; Steam's own step along the tab's one column (FoldedColumn) does the rest.
 * 2. The "Tab to open on" and "App activity logging" rows are each a horizontal row of buttons built from a
 *    fixed option list; press one to select it, styled to show which is active. All the button rows are built
 *    through the shared `DeveloperOptionRow`.
 * 3. runInstallSeedKb() drives the one asynchronous action on this tab: it
 *    disables its own button while running, calls the passed-in
 *    onInstallSeedKnowledgeBase, and shows a toast only if that fails.
 * 4. Everything else here reads and writes one setting directly, with no local state of its own; every change
 *    goes straight back out through the setter it was handed. The four scramble settings arrive as a single
 *    `streamScramble` object and change through a single `onStreamScrambleChange(patch)` function — see
 *    streamScrambleContext.ts for why.
 * 5. The Animations section's "How letters settle" and "Scrambled letter colour" rows only render while the
 *    Scramble animation switch is on, and "How long each letter scrambles" only while it is on **and** the
 *    settle style is picked — a row that is not drawn is not focusable, so turning the switch off while the
 *    ring sits on it leaves the ring on the switch rather than stranding it on a row that just vanished.
 */
import React from "react";
import { toaster } from "@decky/api";
import type { DesktopAppLogLevel, PresetChipAnimation, TabResumeMode } from "../settings/bonsaiSettingsSchema";
import { formatDeckyRpcError } from "../../shared/deckyCall";
import type { BonsaiCapabilityKey } from "../permissions/permissionDeepLink";
import type { StreamScrambleSettings } from "../answer/stream/streamScrambleContext";
import { chainIds, FoldedColumn, FoldedSection, foldLineBelow, takeFoldLine } from "../folded-tabs/FoldedSection";
import { FoldAllButton } from "../folded-tabs/FoldAllButton";
import { TabHelpStrip } from "../folded-tabs/TabHelpStrip";
import {
  DEVELOPER_FOLD_TAB,
  developerSectionSummaries,
  developerSectionTitle,
  developerSectionsShown,
  type DeveloperSectionId,
} from "./developerTabFolds";
import { SectionRows, type DevRow } from "./developerRows";
import { diagnosticsRows, kbRows } from "./developerRowsDiagnostics";
import { loggingRows, navigationRows } from "./developerRowsLogging";
import { animationsRows } from "./developerRowsAnimations";
import { useDeveloperTabFocus } from "./useDeveloperTabFocus";
import type { DeveloperConnectionStatus } from "../ai-connection/developerConnectionStatus";

export type { DeveloperConnectionStatus };

export type DeveloperTabProps = {
  capturedErrors: string[];
  onClearErrors: () => void;
  onSteamInputPhase1Jump?: () => void;
  lastConnectionStatus?: DeveloperConnectionStatus | null;

  desktopDebugNoteAutoSave: boolean;
  setDesktopDebugNoteAutoSave: (v: boolean) => void;
  desktopAskVerboseLogging: boolean;
  setDesktopAskVerboseLogging: (v: boolean) => void;
  desktopAppLogLevel: DesktopAppLogLevel;
  setDesktopAppLogLevel: (v: DesktopAppLogLevel) => void;
  filesystemWrite: boolean;
  onJumpToPermission?: (capability: BonsaiCapabilityKey) => void;

  presetChipAnimation: PresetChipAnimation;
  setPresetChipAnimation: (v: PresetChipAnimation) => void;

  showOnscreenDebugHud: boolean;
  setShowOnscreenDebugHud: (v: boolean) => void;
  devForceSessionRagChips: boolean;
  setDevForceSessionRagChips: (v: boolean) => void;
  /** Warm the default Ask model into memory at boot so the first question skips the cold load. */
  devPreloadAskModel: boolean;
  setDevPreloadAskModel: (v: boolean) => void;
  /** QA: exact questions pinned into the preset carousel, in order. Empty means normal sampling. */
  devFrozenTestChips: string[];
  setDevFrozenTestChips: (v: string[]) => void;
  ragHybridRetrievalEnabled: boolean;
  setRagHybridRetrievalEnabled: (v: boolean) => void;
  tabResumeMode: TabResumeMode;
  setTabResumeMode: (v: TabResumeMode) => void;
  /** Dev/QA: install seed KB from Deck path (build.ps1 deploy). */
  onInstallSeedKnowledgeBase?: () => Promise<void>;

  /** Streamed answers scramble their newest text before settling, like the decode chips. Off by default. */
  streamScramble: StreamScrambleSettings;
  /** Changes whichever fields the patch names; fields left out are untouched. */
  onStreamScrambleChange: (patch: Partial<StreamScrambleSettings>) => void;
};

/**
 * The whole tab. See "How it works" above for the layout and flow.
 *
 * In: every developer-facing setting this tab shows, plus a setter for
 * each one, the list of captured runtime errors and a callback to clear
 * them, and the last connection test's result (used only to list which
 * models are currently loaded).
 * Out: the folded sections in the order drawn above, the help strip and the Open all button.
 *
 * What can go wrong: nothing here talks to the backend except
 * runInstallSeedKb() — every other row is a direct settings read/write.
 */
export const DeveloperTab: React.FC<DeveloperTabProps> = (props) => {
  const { capturedErrors, onClearErrors, onSteamInputPhase1Jump, lastConnectionStatus, onInstallSeedKnowledgeBase, streamScramble } = props;
  const [seedKbBusy, setSeedKbBusy] = React.useState(false);

  const runInstallSeedKb = () => {
    if (!onInstallSeedKnowledgeBase || seedKbBusy) return;
    setSeedKbBusy(true);
    void onInstallSeedKnowledgeBase()
      .catch((e: unknown) => {
        toaster.toast({
          title: "Seed KB install failed",
          body: formatDeckyRpcError(e),
          duration: 8000,
        });
      })
      .finally(() => setSeedKbBusy(false));
  };

  const shown = developerSectionsShown(Boolean(onInstallSeedKnowledgeBase));
  const { chain, hostsFor } = useDeveloperTabFocus(shown.map((s) => s.id));
  const summaries = developerSectionSummaries({
    hasSeedKb: Boolean(onInstallSeedKnowledgeBase),
    ragHybridRetrievalEnabled: props.ragHybridRetrievalEnabled,
    showOnscreenDebugHud: props.showOnscreenDebugHud,
    devPreloadAskModel: props.devPreloadAskModel,
    tabResumeMode: props.tabResumeMode,
    desktopAppLogLevel: props.desktopAppLogLevel,
    desktopDebugNoteAutoSave: props.desktopDebugNoteAutoSave,
    desktopAskVerboseLogging: props.desktopAskVerboseLogging,
    devForceSessionRagChips: props.devForceSessionRagChips,
    presetChipAnimation: props.presetChipAnimation,
    scrambleEnabled: streamScramble.enabled,
  });

  const rowsFor = (id: DeveloperSectionId): DevRow[] => {
    switch (id) {
      case "kb":
        return kbRows({
          seedKbBusy,
          onInstall: runInstallSeedKb,
          hybrid: props.ragHybridRetrievalEnabled,
          setHybrid: props.setRagHybridRetrievalEnabled,
        });
      case "diagnostics":
        return diagnosticsRows({
          hud: props.showOnscreenDebugHud,
          setHud: props.setShowOnscreenDebugHud,
          warm: props.devPreloadAskModel,
          setWarm: props.setDevPreloadAskModel,
          onSteamInputPhase1Jump,
          capturedErrors,
          onClearErrors,
          lastConnectionStatus,
        });
      case "navigation":
        return navigationRows({ tabResumeMode: props.tabResumeMode, setTabResumeMode: props.setTabResumeMode });
      case "logging":
        return loggingRows({
          desktopAppLogLevel: props.desktopAppLogLevel,
          setDesktopAppLogLevel: props.setDesktopAppLogLevel,
          filesystemWrite: props.filesystemWrite,
          onJumpToPermission: props.onJumpToPermission,
          autoSave: props.desktopDebugNoteAutoSave,
          setAutoSave: props.setDesktopDebugNoteAutoSave,
          verbose: props.desktopAskVerboseLogging,
          setVerbose: props.setDesktopAskVerboseLogging,
          forceChips: props.devForceSessionRagChips,
          setForceChips: props.setDevForceSessionRagChips,
          frozenChips: props.devFrozenTestChips,
          setFrozenChips: props.setDevFrozenTestChips,
        });
      case "animations":
        return animationsRows({
          presetChipAnimation: props.presetChipAnimation,
          setPresetChipAnimation: props.setPresetChipAnimation,
          streamScramble,
          onStreamScrambleChange: props.onStreamScrambleChange,
        });
    }
  };

  return (
    <div
      className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack bonsai-folded-tab"
      data-bonsai-tab-panel="developer"
    >
      <FoldedColumn>
        {shown.map((section) => (
          <FoldedSection
            key={section.id}
            tab={DEVELOPER_FOLD_TAB}
            chain={chain}
            id={section.id}
            title={developerSectionTitle(section.id)}
            summary={summaries[section.id]}
          >
            <SectionRows
              rows={rowsFor(section.id)}
              wiring={{
                up: () => takeFoldLine(DEVELOPER_FOLD_TAB, section.id),
                down: () => foldLineBelow(DEVELOPER_FOLD_TAB, chain, section.id),
                hosts: hostsFor(section.id),
              }}
            />
          </FoldedSection>
        ))}
      </FoldedColumn>

      {/* Room under the last line, so the last rows can scroll up clear of the strip and the button. */}
      <div className="bonsai-fold-tail" aria-hidden="true" />
      <TabHelpStrip tab={DEVELOPER_FOLD_TAB}>
        <FoldAllButton tab={DEVELOPER_FOLD_TAB} sections={chainIds(chain)} />
      </TabHelpStrip>
    </div>
  );
};
