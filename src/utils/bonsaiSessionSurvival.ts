/**
 * Survives Decky unmounting plugin `Content` when `showModal` opens/closes.
 * Module-level snapshot restored on the next mount (see `index.tsx`).
 */
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { PresetPrompt } from "../data/presets";

export type BonsaiSessionSurvivalSnapshot = {
  unifiedInput: string;
  ollamaResponse: string;
  askThreadCollapsed: AskThreadCollapsedTurn[];
  askThreadDisplayQuestion: string;
  askThreadViewIndex: number | null;
  suggestedPrompts: PresetPrompt[];
  pluginHelpDismissed: boolean;
};

let pendingRestore: BonsaiSessionSurvivalSnapshot | null = null;

export function captureBonsaiSessionForModal(snapshot: BonsaiSessionSurvivalSnapshot): void {
  pendingRestore = snapshot;
}

export function consumeBonsaiSessionAfterRemount(): BonsaiSessionSurvivalSnapshot | null {
  const snap = pendingRestore;
  pendingRestore = null;
  return snap;
}
