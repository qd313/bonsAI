/**
 * Title: Keeping the chat on screen when a popup opens and closes
 *
 * Purpose: The plugin's own screen briefly disappears and comes back whenever certain popups open on
 * top of it — Decky, the framework this plugin runs inside, actually removes the screen from the
 * page and puts a fresh copy back afterward. A fresh copy has no memory of what it just showed: the
 * question being typed, the answer being read, which tab was open. This file is what carries all of
 * that across the gap. Right before the screen disappears, whatever is showing gets written down
 * here; the moment the new copy of the screen comes back, it reads this note back and looks exactly
 * as it did a moment before.
 *
 * Used for: index.tsx, useBonsaiPluginShell, and the code that manages a running AI question
 * (useBonsaiAskOrchestration), all of which call in here right around a popup opening or closing.
 *
 * Solves: without this, the screen popping in and out for every popup would silently drop the
 * player's question mid-type, forget the answer they were just reading, and jump back to the wrong
 * tab.
 *
 * Does not: survive the plugin being closed and reopened, or the Deck restarting — none of this is
 * written to disk. The settings saved to disk use a completely separate storage path.
 *
 * Gotchas:
 *   - The note kept here includes a full copy of the settings the screen was showing, not just the
 *     chat. That is there for one specific reason: changing a setting on screen does not save it to
 *     disk immediately — the save is delayed slightly so quick changes are not all written out one at
 *     a time. If a popup opened and closed inside that short delay, and the screen simply reloaded
 *     settings from disk when it came back, it could show the value from *before* the change and make
 *     it look like the change had been lost. Carrying the in-memory copy through the popup avoids
 *     that.
 *   - `markPluginDataCleared` and `acknowledgePluginDataClearHandled` guard against a narrower version
 *     of the same race: if the player clears all plugin data while a popup restore is still in
 *     flight, that restore must not be allowed to bring the just-cleared settings back from memory.
 *     Clearing bumps a generation counter and sets a flag that blocks any restore from being used
 *     until the fresh, empty defaults have been loaded — `shouldIgnoreRestoredSettingsSnapshot`
 *     checks that flag.
 *   - `askThreadViewIndex` on the saved shape is marked deprecated. It is read only when the newer
 *     `expandedTurnKey` field is missing from what is being restored, which happens for a note that
 *     was written before `expandedTurnKey` existed.
 */
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import type { PresetPrompt } from "../data/presets";
import type { PresetCarouselInjectPayload } from "../types/backgroundAsk";
import type {
  AppliedResult,
  AskAttachment,
  AskThreadCollapsedTurn,
  OllamaContextUi,
  ScreenshotItem,
  StrategyGuideBranchesPayload,
  StrategyChecklistState,
} from "../types/bonsaiUi";
import type { BonsaiSettingsSnapshotInput } from "../data/bonsaiSettingsSchema";
import type { TransparencySnapshot } from "./inputTransparency";
import type { LastExchangeSnapshot, LiveReasoningSnapshot } from "../types/backgroundAsk";
import type { AskThreadExpandedTurnKey } from "../types/bonsaiUi";
import { createTabLocalSurvival } from "./createTabLocalSurvival";

export type BonsaiSessionSurvivalSnapshot = {
  currentTab: string;
  unifiedInput: string;
  selectedIndex: number;
  navigationMessage: string;
  selectedAttachment: AskAttachment | null;
  isScreenshotBrowserOpen: boolean;
  mediaError: string;
  recentScreenshots: ScreenshotItem[];
  isLoadingRecentScreenshots: boolean;
  pluginHelpDismissed: boolean;
  ollamaIp: string;
  /** In-memory settings so remount + load_settings does not revert pending debounced edits. */
  settingsSnapshot: BonsaiSettingsSnapshotInput;
  ollamaResponse: string;
  ollamaContext: OllamaContextUi;
  lastExchange: LastExchangeSnapshot | null;
  askThreadCollapsed: AskThreadCollapsedTurn[];
  askThreadDisplayQuestion: string;
  expandedTurnKey: AskThreadExpandedTurnKey;
  /** @deprecated Legacy modal survival field; used only when expandedTurnKey is absent on restore. */
  askThreadViewIndex?: number | null;
  suggestedPrompts: PresetPrompt[];
  lastTransparency: TransparencySnapshot | null;
  modelPolicyDisclosure: ModelPolicyDisclosurePayload | null;
  strategyGuideBranches: StrategyGuideBranchesPayload | null;
  strategyChecklist: StrategyChecklistState | null;
  elapsedSeconds: number | null;
  lastApplied: AppliedResult | null;
  shortcutSetupVariant: "deck" | "stadia" | null;
  presetCarouselInject: PresetCarouselInjectPayload | null;
  showSlowWarning: boolean;
  lastRequestId: number | null;
  thinkingSummary: string | null;
  /**
   * The model's own thinking for the question running right now: the newest slice it has written
   * and how long it has been at it. Carried across the gap so a panel closed while the model is
   * thinking and opened again still shows its lines, and one opened after the answer started still
   * shows the fold row with the right number of seconds. Null when nothing is thinking.
   */
  liveReasoning: LiveReasoningSnapshot | null;
  /** Active chat slot id only — turns reload from disk. */
  activeSlotId: string | null;
};

const survival = createTabLocalSurvival<BonsaiSessionSurvivalSnapshot>({ consumeClears: false });

let restoredSettingsSnapshot: BonsaiSettingsSnapshotInput | null = null;

/** Bumped on Clear all data so remount + load_settings ignore stale modal survival. */
let pluginDataClearedGeneration = 0;

/** Stays true from clear until disk defaults are hydrated; blocks modal survival restore. */
let blockSessionSettingsRestore = false;

/** Peek without consuming — used for synchronous `useState` initializers on remount. */
export function peekBonsaiSessionPendingRestore(): BonsaiSessionSurvivalSnapshot | null {
  return survival.peekPending();
}

export function captureBonsaiSessionForModal(snapshot: BonsaiSessionSurvivalSnapshot): void {
  survival.captureDirect(snapshot);
}

/** Keep modal survival settings in sync when RPC saves run while a modal is open. */
export function patchPendingSessionSettingsSnapshot(
  patch: Partial<BonsaiSettingsSnapshotInput>
): void {
  const pending = survival.peekPending();
  if (!pending?.settingsSnapshot) return;
  const nextSettings = { ...pending.settingsSnapshot, ...patch };
  survival.captureDirect({ ...pending, settingsSnapshot: nextSettings });
  if (restoredSettingsSnapshot) {
    restoredSettingsSnapshot = { ...restoredSettingsSnapshot, ...patch };
  }
}

/** Patch top-level session fields (e.g. post-modal return tab) before Decky remount restore. */
export function patchPendingSessionSurvival(
  patch: Partial<Pick<BonsaiSessionSurvivalSnapshot, "currentTab">>
): void {
  const pending = survival.peekPending();
  if (!pending) return;
  survival.captureDirect({ ...pending, ...patch });
}

export function consumeBonsaiSessionAfterRemount(): BonsaiSessionSurvivalSnapshot | null {
  const snap = survival.consumePending();
  if (!snap) return null;
  if (snap.settingsSnapshot) {
    restoredSettingsSnapshot = snap.settingsSnapshot;
  }
  return snap;
}

/** Call after remount restore commits so a second Strict Mode mount can still peek the snapshot. */
export function finalizeSessionRestoreAfterRemount(): void {
  survival.finalize();
}

/** After modal remount, prefer in-memory settings over stale disk when load_settings completes. */
export function takeRestoredSettingsSnapshot(): BonsaiSettingsSnapshotInput | null {
  const snap = restoredSettingsSnapshot;
  restoredSettingsSnapshot = null;
  return snap;
}

/** Wipe modal survival cache (e.g. after Clear all data). */
export function clearBonsaiSessionSurvival(): void {
  survival.clear();
  restoredSettingsSnapshot = null;
}

/** Mark a full plugin data clear; clears survival and returns the new generation. */
export function markPluginDataCleared(): number {
  pluginDataClearedGeneration += 1;
  blockSessionSettingsRestore = true;
  clearBonsaiSessionSurvival();
  return pluginDataClearedGeneration;
}

/** Call after disk defaults are hydrated so modal survival may resume. */
export function acknowledgePluginDataClearHandled(): void {
  blockSessionSettingsRestore = false;
}

export function getPluginDataClearedGeneration(): number {
  return pluginDataClearedGeneration;
}

/** True while a clear-data reset is in flight — blocks stale modal survival. */
export function shouldIgnoreRestoredSettingsSnapshot(_seenAtMount?: number): boolean {
  return blockSessionSettingsRestore;
}
