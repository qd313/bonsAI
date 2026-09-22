/**
 * Title: Everything the Ask flow hands back, in one list
 *
 * Purpose: One hook, `useBonsaiAskOrchestration`, runs the whole flow behind
 * asking a question and getting an answer — 52 separate pieces of state and
 * functions come out of it: the answer itself, what it came with, the
 * thread of earlier turns, what is happening right now, and the things a
 * person can do with a reply once it has arrived. This file writes down the
 * exact shape of those 52 pieces, once, so nothing reading them can drift
 * out of step with what the hook actually returns.
 *
 * Used for: `useBonsaiAskOrchestration` declares this as its own return
 * type, and `index.tsx` and the Main tab read the pieces they need out of
 * it.
 *
 * Solves: this is the widest single handoff point in the project — the
 * ongoing split of the Ask hook into smaller files happens entirely behind
 * this list. Without a shape written down separately from the hook's own
 * code, a split could quietly drop, rename, or change the type of one of
 * the 52 pieces, and nothing would fail until somebody actually used the
 * plugin and hit the missing piece.
 *
 * Does not: run any of the Ask flow itself, or cost anything while the
 * plugin runs. This file is only a type — a description of a shape —
 * checked while the plugin is built and erased before the code ever runs.
 *
 * Caution: frozen for the ongoing reshape of the Ask hook. Changing a name
 * or a type here changes what every caller can rely on — it is not a small
 * tidy-up. Work behind this list, not on it, until that reshape is done.
 */
import type { Dispatch, SetStateAction } from "react";

import type { PresetPrompt } from "../data/presets";
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import type { ReplyMicroActionId } from "../data/replyMicroActions";
import type {
  LastExchangeSnapshot,
  LiveReasoningSnapshot,
  PresetCarouselInjectPayload,
} from "./backgroundAsk";
import type {
  AppliedResult,
  AskThreadCollapsedTurn,
  AskThreadExpandedTurnKey,
  OllamaContextUi,
  StrategyChecklistState,
  StrategyGuideBranchesPayload,
} from "./bonsaiUi";
import type { BonsaiSessionSurvivalSnapshot } from "../utils/bonsaiSessionSurvival";
import type { KbAttachedNote, TransparencySnapshot } from "../utils/inputTransparency";

/**
 * What the Ask hook returns, in the order the hook returns it.
 *
 * Grouped by what each part is for, because 52 names in one list is not readable:
 * the reply itself, what the reply came with, the thread, what is happening right
 * now, and the things a person can do.
 */
export interface BonsaiAskOrchestration {
  // The reply, and the conversation state it belongs to.
  ollamaResponse: string;
  ollamaContext: OllamaContextUi;
  lastExchange: LastExchangeSnapshot | null;
  setLastExchange: Dispatch<SetStateAction<LastExchangeSnapshot | null>>;

  // Extras a reply can arrive with: branch choices, a checklist, a disclosure, chips.
  strategyGuideBranches: StrategyGuideBranchesPayload | null;
  strategyChecklist: StrategyChecklistState | null;
  modelPolicyDisclosure: ModelPolicyDisclosurePayload | null;
  presetCarouselInject: PresetCarouselInjectPayload | null;
  shortcutSetupVariant: "deck" | "stadia" | null;
  suggestedPrompts: PresetPrompt[];

  // The slow-answer warning and its clock.
  showSlowWarning: boolean;
  setShowSlowWarning: Dispatch<SetStateAction<boolean>>;
  elapsedSeconds: number | null;

  // What the answer was built from, and what the model was thinking about.
  lastTransparency: TransparencySnapshot | null;
  setLastTransparency: Dispatch<SetStateAction<TransparencySnapshot | null>>;
  thinkingSummary: string | null;
  /** The model's own thinking on the question running right now, or null when none is. */
  liveReasoning: LiveReasoningSnapshot | null;
  /** Plan 58 phase 1: the "From the notes" block's own material for the live turn, read off
   *  every poll — see LiveThinkingSnapshot's own doc comment. */
  kbAttachedNotes: KbAttachedNote[] | null;
  lastRequestId: number | null;

  // The thread above the live answer: older turns, which one is open.
  askThreadCollapsed: AskThreadCollapsedTurn[];
  setAskThreadCollapsed: Dispatch<SetStateAction<AskThreadCollapsedTurn[]>>;
  setAskThreadDisplayQuestion: Dispatch<SetStateAction<string>>;
  setStrategyChecklist: Dispatch<SetStateAction<StrategyChecklistState | null>>;
  expandedTurnKey: AskThreadExpandedTurnKey;
  setExpandedTurnKey: Dispatch<SetStateAction<AskThreadExpandedTurnKey>>;
  onTurnActivate: (key: string | "live") => void;
  askThreadDisplayQuestion: string;

  // What is happening right now.
  isAsking: boolean;
  askStopped: boolean;
  isForeignPendingAsk: boolean;
  isStreamingPreview: boolean;
  isStreamSettling: boolean;
  streamDisplayText: string;
  lastApplied: AppliedResult | null;

  // Asking, stopping, and the request bookkeeping around it.
  refreshInputTransparency: () => Promise<void>;
  startNextRequest: () => number;
  invalidateRequests: () => void;
  clearUnifiedInput: () => void;
  onCancelAsk: () => void;
  onAskOllama: (
    overrideQuestion?: string,
    opts?: { threadQuestionDisplay?: string },
  ) => Promise<void>;
  onRetryLastResponse: () => void;

  // What a person can do to a reply once it has arrived.
  onReplyFeedback: (rating: "up" | "down") => Promise<void>;
  onReplyMicroAction: (chipId: ReplyMicroActionId) => Promise<void>;
  liveReplyFeedbackRating: "up" | "down" | null;
  liveReplyChipUsed: boolean;
  liveReplyChipError: string | null;
  onStrategyBranchPick: (opt: { id: string; label: string }) => void;
  onStrategyChecklistToggle: (itemId: string, checked: boolean) => void;

  // Coming back to a session: from disk, or from a snapshot the plugin kept.
  hydrateStrategyChecklistFromDisk: (appId: string) => Promise<void>;
  restoreSessionSnapshot: (snap: BonsaiSessionSurvivalSnapshot) => void;
  resetAskSessionSlice: () => void;
  /** Blanks the live-answer view on a plain chat switch, without touching isAsking or the poll. */
  resetLiveAskPresentation: () => void;
  setStrategyGuideBranches: Dispatch<SetStateAction<StrategyGuideBranchesPayload | null>>;
  setSuggestedPrompts: Dispatch<SetStateAction<PresetPrompt[]>>;
  reseedSuggestedPrompts: (
    mode: "random" | "contextual",
    category?: string,
    forceRefresh?: boolean,
  ) => Promise<void>;
}
