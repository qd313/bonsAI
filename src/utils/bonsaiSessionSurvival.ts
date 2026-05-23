/**
 * Survives Decky unmounting plugin `Content` when `showModal` opens/closes.
 * Module-level snapshot restored on the next mount (see `index.tsx`).
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
} from "../types/bonsaiUi";
import type { BonsaiSettingsSnapshotInput } from "./settingsAndResponse";
import type { TransparencySnapshot } from "./inputTransparency";
import type { LastExchangeSnapshot } from "../types/backgroundAsk";

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
  strategySpoilerConsentForNextAsk: boolean;
  pluginHelpDismissed: boolean;
  ollamaIp: string;
  /** In-memory settings so remount + load_settings does not revert pending debounced edits. */
  settingsSnapshot: BonsaiSettingsSnapshotInput;
  ollamaResponse: string;
  ollamaContext: OllamaContextUi;
  lastExchange: LastExchangeSnapshot | null;
  askThreadCollapsed: AskThreadCollapsedTurn[];
  askThreadDisplayQuestion: string;
  askThreadViewIndex: number | null;
  suggestedPrompts: PresetPrompt[];
  lastTransparency: TransparencySnapshot | null;
  modelPolicyDisclosure: ModelPolicyDisclosurePayload | null;
  strategyGuideBranches: StrategyGuideBranchesPayload | null;
  elapsedSeconds: number | null;
  lastApplied: AppliedResult | null;
  shortcutSetupVariant: "deck" | "stadia" | null;
  presetCarouselInject: PresetCarouselInjectPayload | null;
  showSlowWarning: boolean;
  lastRequestId: number | null;
  thinkingSummary: string | null;
};

let pendingRestore: BonsaiSessionSurvivalSnapshot | null = null;
let restoredSettingsSnapshot: BonsaiSettingsSnapshotInput | null = null;

/** Peek without consuming — used for synchronous `useState` initializers on remount. */
export function peekBonsaiSessionPendingRestore(): BonsaiSessionSurvivalSnapshot | null {
  return pendingRestore;
}

export function captureBonsaiSessionForModal(snapshot: BonsaiSessionSurvivalSnapshot): void {
  pendingRestore = snapshot;
}

export function consumeBonsaiSessionAfterRemount(): BonsaiSessionSurvivalSnapshot | null {
  const snap = pendingRestore;
  if (!snap) return null;
  if (snap.settingsSnapshot) {
    restoredSettingsSnapshot = snap.settingsSnapshot;
  }
  return snap;
}

/** Call after remount restore commits so a second Strict Mode mount can still peek the snapshot. */
export function finalizeSessionRestoreAfterRemount(): void {
  pendingRestore = null;
}

/** After modal remount, prefer in-memory settings over stale disk when load_settings completes. */
export function takeRestoredSettingsSnapshot(): BonsaiSettingsSnapshotInput | null {
  const snap = restoredSettingsSnapshot;
  restoredSettingsSnapshot = null;
  return snap;
}

/** Wipe modal survival cache (e.g. after Clear all data). */
export function clearBonsaiSessionSurvival(): void {
  pendingRestore = null;
  restoredSettingsSnapshot = null;
}
